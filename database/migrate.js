const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');
const { DB_NAME } = require('../src/config/env');

async function migrate() {
  const [columns] = await db.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [DB_NAME, 'User']
  );
  if (!columns.some(column => column.COLUMN_NAME === 'must_change_password')) {
    // Existing accounts must replace credentials that may have been publicly documented.
    await db.query('ALTER TABLE User ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT TRUE');
  }
  if (!columns.some(column => column.COLUMN_NAME === 'employee_id')) {
    await db.query('ALTER TABLE User ADD COLUMN employee_id INT NULL UNIQUE, ADD CONSTRAINT fk_user_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL');
  }
  await db.query(fs.readFileSync(path.join(__dirname, 'migrations/001-auth.sql'), 'utf8'));
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
}).finally(() => db.end());
