/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readMigrations } = require('../../database/supabase/tools/migrate.cjs');
const { createLoader } = require('../foundation/load-ts.cjs');

// Builds an isolated schema INSIDE the outer rollback-only db:check transaction.
// Real service SQL executes through the application's PostgreSQL compatibility layer.
async function verifyFreshDatabase(client) {
  const schema = 'pylearn_check_' + randomUUID().replaceAll('-', '');
  await client.query('SAVEPOINT fresh_database');
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, pg_catalog`);
    // Repository-owned SQL only. Map explicit public references to this scratch schema.
    const scoped = sql => sql.replaceAll('public.', schema + '.').replaceAll("'public'", "'" + schema + "'");
    const baseline = await fs.readFile(path.join(__dirname, '../../database/supabase/schema.sql'), 'utf8');
    await client.query(scoped(baseline));
    for (const migration of await readMigrations()) await client.query(scoped(migration.sql));
    assert.equal((await client.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 0);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM settings')).rows[0].n, 6);
    const rls = await client.query('SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind=\'r\'', [schema]);
    assert(rls.rows.length > 20 && rls.rows.every(row => row.relrowsecurity));

    await client.query("INSERT INTO users(id,username,password,role) VALUES (1,'check_teacher','not-a-login-hash','teacher'),(2,'check_student','not-a-login-hash','student')");
    await client.query("INSERT INTO courses(id,slug,title) VALUES (1,'check','check')");
    await client.query("INSERT INTO topics(id,course_id,slug,title) VALUES (1,1,'check','check')");
    await client.query("INSERT INTO lessons(id,topic_id,slug,title) VALUES (1,1,'check','check')");
    await client.query("INSERT INTO games(id,lesson_id,slug,title,path) VALUES (1,1,'check','check','check')");
    await client.query("INSERT INTO classes(id,code,name,teacher_id) VALUES (1,'check','check',1)");
    await client.query("INSERT INTO class_members(class_id,user_id) VALUES (1,2)");
    await client.query("INSERT INTO sessions(id,class_id,game_id,title,created_by,auto_close,duration_minutes) VALUES (1,1,1,'check',1,false,1),(2,1,1,'expired',1,true,1)");
    await client.query("UPDATE sessions SET started_at=now()-interval '1 day'");
    await client.query("INSERT INTO lesson_sessions(id,lesson_id,game_id,session_code,created_by,expires_at) VALUES (1,1,1,'check',1,now()+interval '1 hour')");

    // Retain the service's begin/commit/rollback boundary as savepoints beneath
    // the outer rollback transaction. No client can accidentally commit fixtures.
    const transactionClient = {
      async query(sql, args) {
        if (sql === 'BEGIN') return client.query('SAVEPOINT app_transaction');
        if (sql === 'COMMIT') return client.query('RELEASE SAVEPOINT app_transaction');
        if (sql === 'ROLLBACK') return client.query('ROLLBACK TO SAVEPOINT app_transaction');
        return client.query(sql, args);
      },
      release() {},
    };
    const dbLoader = createLoader({ pg: {
      types: { setTypeParser() {} },
      Pool: class { query(sql, args) { return client.query(sql, args); } async connect() { return transactionClient; } },
    } }, { process: { env: { DATABASE_URL: 'postgresql://unused-for-injected-client' } } });
    const pool = dbLoader('src/lib/db.ts').default;
    const load = createLoader({ '@/lib/db': pool });
    const { LessonSessionService, CourseService } = load('src/lib/services/courses.ts');
    const { submitSessionCode } = load('src/lib/services/sessionSubmissions.ts');
    assert.equal((await CourseService.getAllCourses()).length, 1);
    await submitSessionCode(1, 2, { code: 'classroom', score: 40, passed_tests: 1, total_tests: 2 });
    await assert.rejects(submitSessionCode(1, 2, { code: 'duplicate', score: 40, passed_tests: 1, total_tests: 2 }), error => error.status === 409);
    await assert.rejects(submitSessionCode(2, 2, { code: 'late', score: 40, passed_tests: 1, total_tests: 2 }), error => error.status === 403);
    for (const score of [50, 90, 60]) {
      await LessonSessionService.submitToSession(1, 2, { code: 'quick-' + score, score, isCorrect: false });
    }
    const rankings = await LessonSessionService.getSessionRankings(1);
    assert.equal(rankings.length, 1);
    assert.equal(Number(rankings[0].score), 90);
    assert.equal(rankings[0].code, 'quick-90');
    assert.equal(Number((await client.query('SELECT score FROM session_submissions')).rows[0].score), 40);
    assert.equal((await client.query('SELECT total_submissions FROM sessions WHERE id=1')).rows[0].total_submissions, 1);
    assert.equal(Number((await LessonSessionService.getTeacherSessions(1))[0].submission_count), 1);
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT fresh_database');
    await client.query('RELEASE SAVEPOINT fresh_database');
  }
}

module.exports = { verifyFreshDatabase };
