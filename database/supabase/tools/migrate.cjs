/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { withClient, reportError, fail } = require('./connection.cjs');

const migrationDirectory = path.join(__dirname, '..', 'migrations');
const lockId = 2026091801;

async function readMigrations(directory = migrationDirectory) {
  const names = (await fs.readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  const versions = new Set();
  const migrations = [];
  for (const name of names) {
    const match = /^(\d{3})_[a-z0-9_]+\.sql$/.exec(name);
    if (!match || versions.has(match[1])) fail('Invalid or duplicate migration version: ' + name);
    versions.add(match[1]);
    // Checksums must survive Git's CRLF conversion on Windows.
    const sql = (await fs.readFile(path.join(directory, name), 'utf8')).replace(/\r\n/g, '\n');
    migrations.push({ name, sql, checksum: createHash('sha256').update(sql).digest('hex') });
  }
  return migrations;
}

function pendingMigrations(migrations, applied) {
  const byName = new Map(migrations.map(migration => [migration.name, migration]));
  for (const row of applied) {
    const local = byName.get(row.name);
    if (!local) fail('Applied migration is missing locally: ' + row.name);
    if (local.checksum !== row.checksum) fail('Applied migration was edited: ' + row.name);
  }
  const done = new Set(applied.map(row => row.name));
  const latest = applied.map(row => row.name).sort().at(-1);
  const pending = migrations.filter(migration => !done.has(migration.name));
  if (latest && pending.some(migration => migration.name < latest)) fail('Out-of-order migration; use a new version');
  return pending;
}

async function history(client) {
  const exists = (await client.query("SELECT to_regclass('pylearn_migrations.history') AS relation")).rows[0].relation;
  return exists ? (await client.query('SELECT name,checksum,applied_at FROM pylearn_migrations.history ORDER BY name')).rows : [];
}

async function ensureHistory(client) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS pylearn_migrations;
    REVOKE ALL ON SCHEMA pylearn_migrations FROM PUBLIC;
    CREATE TABLE IF NOT EXISTS pylearn_migrations.history (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
    REVOKE ALL ON pylearn_migrations.history FROM PUBLIC;
  `);
}

async function migrate(client, migrations, { rollback = false, initialize = false, verify } = {}) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    // Transaction-scoped lock also works with Supabase transaction pooling.
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
    if (initialize) {
      const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
      if (tables.rows.length) fail('db:init requires an empty public schema; use db:migrate for an existing database');
      await client.query(await fs.readFile(path.join(__dirname, '..', 'schema.sql'), 'utf8'));
    }
    await ensureHistory(client);
    const pending = pendingMigrations(migrations, await history(client));
    for (const migration of pending) {
      await client.query(migration.sql);
      await client.query('INSERT INTO pylearn_migrations.history(name,checksum) VALUES ($1,$2)', [migration.name, migration.checksum]);
    }
    if (verify) await verify(client);
    await client.query(rollback ? 'ROLLBACK' : 'COMMIT');
    return { applied: pending.map(migration => migration.name), committed: !rollback };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(args = process.argv.slice(2)) {
  const mode = args[0] || 'status';
  if (!['status', 'apply', 'check', 'init', 'check-init'].includes(mode) || args.slice(1).some(arg => !/^--target=[a-f0-9]{16}$/.test(arg))) {
    fail('Usage: migrate.cjs status|check|check-init|apply|init [--target=<fingerprint from db:status>]');
  }
  const migrations = await readMigrations();
  return withClient(async (client, target) => {
    if (mode === 'status') {
      await client.query('BEGIN READ ONLY');
      try {
        const applied = await history(client);
        const pending = pendingMigrations(migrations, applied);
        await client.query('COMMIT');
        console.log(JSON.stringify({ target, applied, pending: pending.map(item => item.name) }, null, 2));
        return;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    if (['apply', 'init'].includes(mode) && !args.includes('--target=' + target)) {
      fail('Target mismatch or missing --target. Run db:status and supply its fingerprint. No changes made.');
    }
    const result = await migrate(client, migrations, {
      rollback: mode.startsWith('check'),
      initialize: mode === 'init' || mode === 'check-init',
      verify: mode.startsWith('check') ? require('./verify.cjs').verify : undefined,
    });
    console.log(JSON.stringify({ target, ...result, verification: mode.startsWith('check') ? 'passed; all changes rolled back' : 'run db:check next' }, null, 2));
  });
}

if (require.main === module) main().catch(reportError);
module.exports = { readMigrations, pendingMigrations, migrate, main };
