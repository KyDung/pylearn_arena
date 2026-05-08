import pool from "../src/lib/db";

async function createAllMissingTables() {
  console.log("🔧 Creating all missing tables...\n");

  try {
    // Create course_access table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        course_id INT NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_class_course (class_id, course_id),
        INDEX idx_class (class_id),
        INDEX idx_course (course_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table 'course_access' created");

    // Verify all tables exist
    const [tables] = (await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'pylearn_arena'
      ORDER BY TABLE_NAME
    `)) as any;

    console.log("\n📋 Current tables in database:");
    tables.forEach((t: any) => {
      console.log(`   - ${t.TABLE_NAME}`);
    });

    console.log("\n🎉 All required tables created!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createAllMissingTables();
