/**
 * A row coming back from SQL has no static shape: the columns depend on the
 * query text, which the type system cannot see. Callers narrow it at the point
 * of use, for example `rows as Course[]`.
 *
 * `unknown` was measured here and costs 105 type errors across the app, because
 * every `row.title` would need its own row interface first. That is worth doing
 * per query one day; until then the index signature stays deliberately loose,
 * and this is the only place in the codebase allowed to say so.
 */
export interface RowDataPacket {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [column: string]: any;
}

export interface ResultSetHeader {
  insertId: number;
  affectedRows: number;
  changedRows: number;
  rowCount?: number;
}
