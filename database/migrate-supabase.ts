// Backward-compatible entry point. Never replays the old schema/data dump.
import { spawnSync } from "node:child_process";
import path from "node:path";

const result = spawnSync(process.execPath, [
  path.join(process.cwd(), "database/supabase/tools/migrate.cjs"),
  "apply",
  ...process.argv.slice(2),
], { stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;
