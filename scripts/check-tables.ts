import pool from "../src/lib/db";

async function check() {
  try {
    const [cols1] = await pool.query("DESCRIBE assignments");
    console.log("=== ASSIGNMENTS ===");
    console.log(cols1);

    const [cols2] = await pool.query("DESCRIBE class_members");
    console.log("\n=== CLASS_MEMBERS ===");
    console.log(cols2);

    // Check if games table exists
    try {
      const [cols3] = await pool.query("DESCRIBE games");
      console.log("\n=== GAMES ===");
      console.log(cols3);
    } catch (err) {
      console.log("\n=== GAMES TABLE DOES NOT EXIST ===");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

check();
