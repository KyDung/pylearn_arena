/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { readMigrations, pendingMigrations, migrate } = require('../../database/supabase/tools/migrate.cjs');
const { bootstrap } = require('../../database/supabase/tools/bootstrap-admin.cjs');
const { createLoader } = require('./load-ts.cjs');

test('migration history rejects edited, missing and out-of-order files', () => {
  const migrations = [{ name: '001_one.sql', checksum: 'a' }, { name: '002_two.sql', checksum: 'b' }];
  assert.deepEqual(pendingMigrations(migrations, [migrations[0]]), [migrations[1]]);
  assert.throws(() => pendingMigrations(migrations, [{ ...migrations[0], checksum: 'changed' }]), /edited/);
  assert.throws(() => pendingMigrations([], [migrations[0]]), /missing/);
  assert.throws(() => pendingMigrations(migrations, [migrations[1]]), /Out-of-order/);
});

test('migration checksums survive Windows line endings and reject duplicate versions', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pylearn-migrations-'));
  try {
    const filename = path.join(directory, '001_one.sql');
    await fs.writeFile(filename, 'SELECT 1;\nSELECT 2;\n');
    const lf = await readMigrations(directory);
    await fs.writeFile(filename, 'SELECT 1;\r\nSELECT 2;\r\n');
    assert.equal((await readMigrations(directory))[0].checksum, lf[0].checksum);
    await fs.writeFile(path.join(directory, '001_duplicate.sql'), 'SELECT 3;');
    await assert.rejects(readMigrations(directory), /duplicate/);
  } finally { await fs.rm(directory, { recursive: true }); }
});

function migrationClient(failing = false) {
  const calls = [];
  return { calls, async query(sql) {
    calls.push(sql);
    if (sql.startsWith('SELECT to_regclass')) return { rows: [{ relation: null }] };
    if (sql === 'BROKEN') throw new Error('SQL failed');
    if (failing && sql === 'VERIFY') throw new Error('verification failed');
    return { rows: [], rowCount: 0 };
  } };
}

test('failed migration rolls back all earlier statements and its history', async () => {
  const client = migrationClient();
  await assert.rejects(migrate(client, [{ name: '001_ok.sql', sql: 'OK', checksum: 'a' }, { name: '002_bad.sql', sql: 'BROKEN', checksum: 'b' }]), /SQL failed/);
  assert.equal(client.calls.at(-1), 'ROLLBACK');
  assert(!client.calls.includes('COMMIT'));
});

test('check mode and verification failures never commit', async () => {
  const client = migrationClient();
  const result = await migrate(client, [{ name: '001_ok.sql', sql: 'OK', checksum: 'a' }], { rollback: true });
  assert.equal(result.committed, false);
  assert.equal(client.calls.at(-1), 'ROLLBACK');
  const broken = migrationClient(true);
  await assert.rejects(migrate(broken, [], { verify: c => c.query('VERIFY') }), /verification failed/);
  assert.equal(broken.calls.at(-1), 'ROLLBACK');
});

test('bootstrap refuses existing admin without overwriting credentials', async () => {
  const calls = [];
  const client = { async query(sql) { calls.push(sql); return { rowCount: sql.startsWith('SELECT 1') ? 1 : 0 }; } };
  await assert.rejects(bootstrap(client, { username: 'new_admin', password: 'test-only-passphrase-123' }), /already exists/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert(!calls.some(sql => sql.startsWith('INSERT') || sql.startsWith('UPDATE')));
});

test('bootstrap rejects bcrypt-truncated passwords before connecting or writing', async () => {
  await assert.rejects(bootstrap({}, { username: 'admin', password: 'é'.repeat(40) }), /72 UTF-8 bytes/);
});

test('course list does not hide connection errors behind a fallback query', async () => {
  let calls = 0;
  const load = createLoader({ '@/lib/db': { async query() { calls++; throw new Error('unavailable'); } } });
  await assert.rejects(load('src/lib/services/courses.ts').CourseService.getAllCourses(), /unavailable/);
  assert.equal(calls, 1);
});

test('a racing duplicate submission surfaces as 409 instead of a raw database error', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('BEGIN'); },
    async commit() { calls.push('COMMIT'); },
    async rollback() { calls.push('ROLLBACK'); },
    release() { calls.push('RELEASE'); },
    async query(sql) {
      calls.push(sql.trim().split(/\s+/, 1)[0].toUpperCase());
      // The unique index is the only guard once two requests pass the read check.
      if (/INSERT INTO session_submissions/.test(sql)) {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          code: '23505', constraint: 'session_submissions_session_user_key',
        });
      }
      if (/FROM sessions WHERE id = \? FOR UPDATE/.test(sql)) return [[{ class_id: 7 }]];
      if (/FROM class_members/.test(sql)) return [[{ id: 11 }]];
      if (/FROM sessions s WHERE/.test(sql)) return [[{ id: 1 }]];
      return [[]];
    },
  };
  const load = createLoader({ '@/lib/db': { async getConnection() { return connection; } } });
  const { submitSessionCode } = load('src/lib/services/sessionSubmissions.ts');
  await assert.rejects(
    submitSessionCode(1, 2, { code: 'print(1)', score: 40, passed_tests: 1, total_tests: 2 }),
    error => error.status === 409 && /đã nộp bài/.test(error.message),
  );
  assert(calls.includes('ROLLBACK') && !calls.includes('COMMIT'));
  assert.equal(calls.at(-1), 'RELEASE');
});

test('db:init refuses a database that already holds tables', async () => {
  const client = { calls: [], async query(sql) {
    this.calls.push(sql);
    if (sql.startsWith('SELECT tablename')) return { rows: [{ tablename: 'users' }] };
    if (sql.startsWith('SELECT to_regclass')) return { rows: [{ relation: null }] };
    return { rows: [], rowCount: 0 };
  } };
  await assert.rejects(migrate(client, [], { initialize: true }), /empty public schema/);
  assert.equal(client.calls.at(-1), 'ROLLBACK');
  assert(!client.calls.some(sql => /CREATE (?:TABLE|SCHEMA)/i.test(sql)));
});
