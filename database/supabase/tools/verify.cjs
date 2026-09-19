/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

async function expectSqlError(client, code, sql, values) {
  await client.query('SAVEPOINT expected_error');
  let caught;
  try { await client.query(sql, values); } catch (error) { caught = error; }
  await client.query('ROLLBACK TO SAVEPOINT expected_error');
  await client.query('RELEASE SAVEPOINT expected_error');
  assert.equal(caught?.code, code, 'Expected PostgreSQL to reject invalid data');
}

// Only called inside db:check's transaction, which is ALWAYS rolled back.
// Explicit negative IDs avoid advancing live identity sequences.
async function verify(client) {
  const id = -2000000001;
  const other = id - 1;
  const token = randomUUID().replaceAll('-', '').slice(0, 16);
  await client.query("INSERT INTO public.users(id,username,password,role) VALUES ($1,$2,'not-a-login-hash','teacher'),($3,$4,'not-a-login-hash','student')", [id, 'dbcheck_t_' + token, other, 'dbcheck_s_' + token]);
  await client.query("INSERT INTO public.courses(id,slug,title,order_num) VALUES ($1,$2,'DB check',7)", [id, token]);
  await client.query("INSERT INTO public.topics(id,course_id,slug,title) VALUES ($1,$1,$2,'DB check')", [id, token]);
  await client.query("INSERT INTO public.lessons(id,topic_id,slug,title) VALUES ($1,$1,$2,'DB check')", [id, token]);
  await client.query("INSERT INTO public.games(id,lesson_id,slug,title,path) VALUES ($1,$1,$2,'DB check',$2)", [id, token]);
  await client.query("INSERT INTO public.classes(id,code,name,teacher_id) VALUES ($1,$2,'DB check',$1)", [id, token]);
  await client.query("INSERT INTO public.sessions(id,class_id,game_id,title,created_by) VALUES ($1,$1,$1,'DB check',$1)", [id]);
  await client.query("INSERT INTO public.session_submissions(id,session_id,user_id,code,score) VALUES ($1,$1,$2,'classroom',40)", [id, other]);
  await expectSqlError(client, '23505', "INSERT INTO public.session_submissions(id,session_id,user_id,code) VALUES ($1,$2,$3,'duplicate')", [other, id, other]);
  // A submission must name a session that exists.
  await expectSqlError(client, '23503', "INSERT INTO public.session_submissions(id,session_id,user_id,code) VALUES ($1,$1,$1,'no such session')", [other]);
  assert.equal(Number((await client.query('SELECT score FROM public.session_submissions WHERE id=$1', [id])).rows[0].score), 40);
  assert.equal((await client.query('SELECT order_num FROM public.courses WHERE id=$1', [id])).rows[0].order_num, 7);
  assert.equal((await client.query('SELECT class_id FROM public.v_class_stats WHERE class_id=$1', [id])).rowCount, 1);
  // Migration 005 took every privilege away from the Data API roles, so these
  // reads must be refused outright rather than merely return no rows. A view
  // and a base table are both checked: a future permissive policy must not be
  // able to re-open anything on its own.
  for (const role of ['anon', 'authenticated']) {
    const exists = (await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role])).rowCount;
    if (!exists) continue; // Plain PostgreSQL installations need not have Supabase roles.
    for (const relation of ['public.v_class_stats', 'public.users']) {
      await client.query('SAVEPOINT api_role');
      await client.query(`SET LOCAL ROLE ${role}`);
      let refused;
      try {
        await client.query(`SELECT 1 FROM ${relation} LIMIT 1`);
      } catch (error) {
        refused = error.code;
      }
      await client.query('ROLLBACK TO SAVEPOINT api_role');
      await client.query('RELEASE SAVEPOINT api_role');
      assert.equal(refused, '42501', `${role} must not be able to read ${relation}`);
    }
  }
  const views = await client.query("SELECT relname,reloptions FROM pg_class WHERE oid = 'public.v_class_stats'::regclass");
  assert(views.rows.every(row => row.reloptions.includes('security_invoker=true')));
  // Migration 006 removed the unused subsystems; nothing may recreate them.
  const removed = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1)`,
    [['assignments', 'assignment_submissions', 'submissions', 'rankings',
      'lesson_sessions', 'lesson_session_submissions',
      'activity_log', 'class_students', 'notifications']]);
  assert.equal(removed.rowCount, 0, 'Dropped tables must stay dropped');
  await require('../../../tests/integration/fresh-database.cjs').verifyFreshDatabase(client);
}

module.exports = { verify, expectSqlError };
