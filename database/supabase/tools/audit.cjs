/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs/promises');
const path = require('node:path');
const { withClient, reportError, identifier } = require('./connection.cjs');

async function audit(client, target) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const report = { capturedAt: new Date().toISOString(), target, readOnly: true };
    const queries = {
      server: "SELECT current_setting('server_version') AS version, current_setting('TimeZone') AS timezone",
      tables: "SELECT c.relname AS name, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname",
      columns: "SELECT table_name, column_name, data_type, is_nullable, column_default, is_identity, is_generated FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position",
      constraints: "SELECT c.conrelid::regclass::text AS table_name, c.conname AS name, c.contype AS type, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY 1,2",
      indexes: "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname",
      policies: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname",
      apiGrants: "SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','PUBLIC') ORDER BY table_name,grantee,privilege_type",
      triggers: "SELECT event_object_table AS table_name, trigger_name, action_statement FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY 1,2",
      views: "SELECT c.relname AS name, c.reloptions AS options FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' ORDER BY c.relname",
    };
    for (const [key, sql] of Object.entries(queries)) report[key] = (await client.query(sql)).rows;
    report.counts = {};
    for (const table of report.tables) {
      report.counts[table.name] = Number((await client.query(`SELECT count(*) AS count FROM public.${identifier(table.name)}`)).rows[0].count);
    }
    if (report.counts.users !== undefined) {
      report.userSummary = (await client.query('SELECT role,status,count(*)::int AS count,count(*) FILTER (WHERE created_by IS NULL)::int AS missing_creator FROM public.users GROUP BY role,status ORDER BY role,status')).rows;
    }
    if (report.counts.session_submissions !== undefined) {
      report.duplicateSessionSubmissions = (await client.query('SELECT count(*)::int AS groups FROM (SELECT session_id,user_id FROM public.session_submissions GROUP BY session_id,user_id HAVING count(*)>1) duplicates')).rows[0].groups;
    }
    const history = await client.query("SELECT to_regclass('pylearn_migrations.history') AS relation");
    report.migrations = history.rows[0].relation
      ? (await client.query('SELECT name,checksum,applied_at FROM pylearn_migrations.history ORDER BY name')).rows
      : [];
    await client.query('COMMIT');
    return report;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

if (require.main === module) {
  withClient(async (client, target) => {
    const report = await audit(client, target);
    const output = path.join(process.cwd(), 'docs', 'db-audit.latest.json');
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ target, report: 'docs/db-audit.latest.json', tables: report.tables, counts: report.counts, userSummary: report.userSummary, duplicateSessionSubmissions: report.duplicateSessionSubmissions }, null, 2));
  }).catch(reportError);
}

module.exports = { audit };
