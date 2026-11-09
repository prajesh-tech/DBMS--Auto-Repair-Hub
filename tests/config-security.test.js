const { spawnSync } = require('child_process');
const { BCRYPT_ROUNDS } = require('../src/config/env');
function config(env, expression = 'require("./src/config/env")') {
  return spawnSync(process.execPath, ['-e', expression], { env: { ...process.env, ...env }, encoding: 'utf8' });
}
it('uses bcrypt cost 12', () => { expect(BCRYPT_ROUNDS).toBe(12); });
it.each(['development', 'production', 'test'])('requires configured JWT secrets in %s', mode => {
  const result = config({ NODE_ENV: mode, JWT_SECRET: '', JWT_REFRESH_SECRET: '' });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/JWT_SECRET/);
});
it('rejects missing database credentials outside tests', () => {
  const result = config({ NODE_ENV: 'development', DB_USER: '', DB_PASSWORD: '' });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/DB_USER/);
});
it('defaults cookies to Secure', () => {
  const result = config({ COOKIE_SECURE: '' }, 'console.log(require("./src/config/env").COOKIE_SECURE)');
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('true');
});
it.each(['COOKIE_SECURE', 'TRUST_PROXY'])('rejects malformed %s', flag => {
  expect(config({ [flag]: 'invalid' }).status).not.toBe(0);
});
