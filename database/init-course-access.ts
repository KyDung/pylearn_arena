import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

async function initCourseAccess() {
  const connection = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
    multipleStatements: true,
  });

  try {
    console.log("📦 Creating course access tables...");

    const schema = fs.readFileSync(
      path.join(__dirname, "schema-course-access.sql"),
      "utf-8",
    );

    await connection.query(schema);

    console.log("✅ Course access tables created successfully!");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

initCourseAccess();
