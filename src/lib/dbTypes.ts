export interface RowDataPacket {
  [column: string]: any;
}

export interface ResultSetHeader {
  insertId: number;
  affectedRows: number;
  changedRows: number;
  rowCount?: number;
}
