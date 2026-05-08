// Backward-compatible import path for old maintenance scripts.
// The application database now runs on Supabase/PostgreSQL via `db.ts`.
import pool from "./db";

export async function testConnection(): Promise<boolean> {
  await pool.query("SELECT 1");
  return true;
}

export { pool };
export default pool;
