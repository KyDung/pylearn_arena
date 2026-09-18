/* eslint-disable @typescript-eslint/no-require-imports */
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { Client } = require('pg');

function configuration() {
  // Reuse Next's env parser/precedence without adding a second parser dependency.
  const nextRequire = createRequire(require.resolve('next/package.json'));
  nextRequire('@next/env').loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', {
    info() {}, error() {},
  });
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Missing database connection configuration');
  const url = new URL(connectionString);
  // Identify the target without persisting credentials or project hostname.
  const target = createHash('sha256').update(`${url.hostname}:${url.port}${url.pathname}:${url.username}`).digest('hex').slice(0, 16);
  return {
    target,
    options: {
      connectionString,
      ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      application_name: 'pylearn-db-maintenance',
    },
  };
}

async function withClient(action) {
  const { target, options } = configuration();
  const client = new Client(options);
  try {
    await client.connect();
    return await action(client, target);
  } finally {
    await client.end();
  }
}

function reportError(error) {
  // PostgreSQL error detail can contain passwords, account rows or connection URLs.
  console.error(`Database operation failed (${error.code || error.name || 'unknown'}).`);
  if (error.safeMessage) console.error(error.safeMessage);
  process.exitCode = 1;
}

function fail(message) {
  const error = new Error(message);
  error.safeMessage = message;
  throw error;
}

function identifier(value) {
  return '"' + value.replace(/"/g, '""') + '"';
}

module.exports = { configuration, withClient, reportError, fail, identifier };
