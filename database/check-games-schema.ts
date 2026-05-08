import pool from "../src/lib/db";

async function checkSchema() {
  try {
    const [rows] = await pool.query("DESCRIBE games");
    console.log("Games table columns:");
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkSchema();
