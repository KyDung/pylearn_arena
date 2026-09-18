/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require('bcryptjs');
const { withClient, reportError, fail } = require('./connection.cjs');

async function bootstrap(client, { username, password, fullName = 'Administrator' }) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,100}$/.test(username)) fail('Set BOOTSTRAP_ADMIN_USERNAME (3-100 letters, digits, _, . or -)');
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) fail('Set BOOTSTRAP_ADMIN_PASSWORD (at least 12 characters; at most 72 UTF-8 bytes)');
  if (typeof fullName !== 'string' || fullName.length > 255) fail('BOOTSTRAP_ADMIN_FULL_NAME must be at most 255 characters');
  const hash = await bcrypt.hash(password, 12);
  await client.query('BEGIN');
  try {
    // Also blocks ordinary app inserts during the check, not just another CLI run.
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query('LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE');
    const admins = await client.query("SELECT 1 FROM public.users WHERE role='admin' LIMIT 1");
    if (admins.rowCount) fail('An admin already exists; bootstrap will not replace accounts or passwords');
    await client.query("INSERT INTO public.users(username,password,full_name,role,status) VALUES ($1,$2,$3,'admin','active')", [username, hash, fullName]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}

if (require.main === module) {
  withClient(async (client, target) => {
    if (process.argv.length !== 3 || process.argv[2] !== '--target=' + target) fail('Pass --target=<fingerprint from db:status>');
    await bootstrap(client, { username: process.env.BOOTSTRAP_ADMIN_USERNAME, password: process.env.BOOTSTRAP_ADMIN_PASSWORD, fullName: process.env.BOOTSTRAP_ADMIN_FULL_NAME });
    console.log('Admin created. Remove the BOOTSTRAP_ADMIN_PASSWORD variable from local configuration.');
  }).catch(reportError);
}

module.exports = { bootstrap };
