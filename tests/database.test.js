const db = require('../src/config/database');

describe('Database Connection Test', () => {
    it('should connect to MariaDB and execute simple query', async () => {
        const [rows] = await db.query('SELECT 1 + 1 as result');
        expect(rows[0].result).toBe(2);
    });

    afterAll(async () => {
        await db.end();
    });
});
