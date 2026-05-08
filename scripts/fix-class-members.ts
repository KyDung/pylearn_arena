import pool from "../src/lib/db";

async function fixClassMembersTable() {
  try {
    console.log("Fixing class_members table...");

    // Add role column if not exists
    await pool
      .query(
        `
      ALTER TABLE class_members 
      ADD COLUMN IF NOT EXISTS role ENUM('student', 'assistant') DEFAULT 'student'
    `,
      )
      .catch(() => {
        console.log("role column may already exist");
      });

    // Rename student_id to user_id
    await pool
      .query(
        `
      ALTER TABLE class_members CHANGE COLUMN student_id user_id INT NOT NULL
    `,
      )
      .catch((err) => {
        if (err.code === "ER_BAD_FIELD_ERROR") {
          console.log("user_id column may already exist");
        } else {
          throw err;
        }
      });

    console.log("Checking updated schema...");
    const [cols] = await pool.query("DESCRIBE class_members");
    console.log(cols);

    console.log("\n✅ class_members table fixed!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

fixClassMembersTable();
