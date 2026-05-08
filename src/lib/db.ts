import { Pool, PoolClient, types } from "pg";

types.setTypeParser(20, (value) => parseInt(value, 10));
types.setTypeParser(1700, (value) => parseFloat(value));

export interface DbResultHeader {
  insertId: number;
  affectedRows: number;
  changedRows: number;
  rowCount: number;
}

type QueryParams = unknown[] | undefined;
type MysqlStyleResult<T> = [T, DbResultHeader];

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

function normalizeSql(sql: string): string {
  let normalized = sql.replace(/`/g, '"');

  normalized = normalized.replace(
    /SHOW\s+COLUMNS\s+FROM\s+("?)([a-zA-Z0-9_]+)\1/gi,
    (_, _quote, tableName) =>
      `SELECT column_name AS "Field" FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}' ORDER BY ordinal_position`,
  );

  normalized = normalized.replace(
    /DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\d+)\s+DAY\)/gi,
    "NOW() - INTERVAL '$1 days'",
  );

  return normalized;
}

function convertPlaceholders(sql: string): string {
  let index = 0;
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const previous = sql[i - 1];

    if (char === "'" && !inDoubleQuote && previous !== "\\") {
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }

    if (char === '"' && !inSingleQuote && previous !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      result += char;
      continue;
    }

    if (char === "?" && !inSingleQuote && !inDoubleQuote) {
      index++;
      result += `$${index}`;
      continue;
    }

    result += char;
  }

  return result.replace(/\bIN\s*\(\s*\$(\d+)\s*\)/gi, "= ANY($$$1)");
}

function commandOf(sql: string): string {
  return sql.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
}

function shouldReturnRows(sql: string): boolean {
  const command = commandOf(sql);
  return command === "select" || command === "with";
}

function shouldAppendReturningId(sql: string): boolean {
  const command = commandOf(sql);
  return command === "insert" && !/\breturning\b/i.test(sql);
}

function prepareSql(sql: string): string {
  let prepared = convertPlaceholders(normalizeSql(sql));

  if (shouldAppendReturningId(prepared)) {
    prepared = `${prepared.trim()} RETURNING id`;
  }

  return prepared;
}

function toHeader(rowCount: number | null, rows: any[]): DbResultHeader {
  const insertId = rows[0]?.id ? Number(rows[0].id) : 0;
  const affectedRows = rowCount ?? 0;

  return {
    insertId,
    affectedRows,
    changedRows: affectedRows,
    rowCount: affectedRows,
  };
}

class PgCompatConnection {
  constructor(private readonly client: PoolClient) {}

  async query<T = any>(
    sql: string,
    params?: QueryParams,
  ): Promise<MysqlStyleResult<T>> {
    const prepared = prepareSql(sql);
    const result = await this.client.query(prepared, params ?? []);
    const header = toHeader(result.rowCount, result.rows);

    if (shouldReturnRows(prepared)) {
      return [result.rows as T, header];
    }

    return [header as T, header];
  }

  execute<T = any>(sql: string, params?: QueryParams) {
    return this.query<T>(sql, params);
  }

  beginTransaction() {
    return this.client.query("BEGIN");
  }

  commit() {
    return this.client.query("COMMIT");
  }

  rollback() {
    return this.client.query("ROLLBACK");
  }

  release() {
    this.client.release();
  }
}

class PgCompatPool {
  private pool: Pool | null = null;

  private getPool(): Pool {
    if (!connectionString) {
      throw new Error(
        "Missing database connection string. Set SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL.",
      );
    }

    if (!this.pool) {
      this.pool = new Pool({
        connectionString,
        ssl:
          process.env.SUPABASE_DB_SSL === "false"
            ? false
            : { rejectUnauthorized: false },
        max: parseInt(process.env.DB_POOL_MAX || "10", 10),
      });
    }

    return this.pool;
  }

  async query<T = any>(
    sql: string,
    params?: QueryParams,
  ): Promise<MysqlStyleResult<T>> {
    const prepared = prepareSql(sql);
    const result = await this.getPool().query(prepared, params ?? []);
    const header = toHeader(result.rowCount, result.rows);

    if (shouldReturnRows(prepared)) {
      return [result.rows as T, header];
    }

    return [header as T, header];
  }

  execute<T = any>(sql: string, params?: QueryParams) {
    return this.query<T>(sql, params);
  }

  async getConnection(): Promise<PgCompatConnection> {
    const client = await this.getPool().connect();
    return new PgCompatConnection(client);
  }

  connect(): Promise<any> {
    return this.getConnection();
  }

  end() {
    return this.pool?.end() ?? Promise.resolve();
  }
}

const pool = new PgCompatPool();

export { pool };
export default pool;
