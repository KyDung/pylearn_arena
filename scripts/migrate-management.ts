/**
 * Script để chạy migration cho hệ thống quản lý mới
 *
 * Chạy: npx tsx scripts/migrate-management.ts
 */

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...values] = line.split("=");
    if (key && values.length) {
      process.env[key.trim()] = values.join("=").trim();
    }
  });
}

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "pylearn_arena",
    multipleStatements: true,
  });

  console.log("🔗 Đã kết nối database");

  try {
    // 1. Cập nhật bảng users - thêm role teacher và các cột mới
    console.log("\n📦 Cập nhật bảng users...");

    await connection
      .query(
        `
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'student'
    `,
      )
      .catch(() => console.log("  - Column role đã được cập nhật trước đó"));

    const columnsToAdd = [
      { name: "avatar", sql: "VARCHAR(500) DEFAULT NULL" },
      { name: "phone", sql: "VARCHAR(20) DEFAULT NULL" },
      {
        name: "status",
        sql: "ENUM('active', 'inactive', 'suspended') DEFAULT 'active'",
      },
      { name: "created_by", sql: "INT DEFAULT NULL" },
      { name: "last_login", sql: "TIMESTAMP NULL" },
    ];

    for (const col of columnsToAdd) {
      await connection
        .query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.sql}`)
        .catch(() => console.log(`  - Column ${col.name} đã tồn tại`));
    }
    console.log("  ✅ Bảng users đã được cập nhật");

    // 2. Tạo bảng classes
    console.log("\n📦 Tạo bảng classes...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        code VARCHAR(20) UNIQUE NOT NULL,
        teacher_id INT NOT NULL,
        school_year VARCHAR(20),
        grade VARCHAR(20),
        max_students INT DEFAULT 50,
        status ENUM('active', 'archived', 'closed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_classes_teacher (teacher_id),
        INDEX idx_classes_status (status),
        INDEX idx_classes_code (code)
      )
    `);
    console.log("  ✅ Bảng classes đã được tạo");

    // 3. Tạo bảng class_members
    console.log("\n📦 Tạo bảng class_members...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS class_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('student', 'assistant') DEFAULT 'student',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('active', 'removed', 'left') DEFAULT 'active',
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_class_member (class_id, user_id),
        INDEX idx_class_members_user (user_id),
        INDEX idx_class_members_status (status)
      )
    `);
    console.log("  ✅ Bảng class_members đã được tạo");

    // 4. Tạo bảng course_access
    console.log("\n📦 Tạo bảng course_access...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS course_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        course_id INT NOT NULL,
        granted_by INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT,
        UNIQUE KEY unique_course_access (class_id, course_id),
        INDEX idx_course_access_active (is_active)
      )
    `);
    console.log("  ✅ Bảng course_access đã được tạo");

    // 5. Tạo bảng assignments
    console.log("\n📦 Tạo bảng assignments...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        game_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        late_submission BOOLEAN DEFAULT FALSE,
        late_penalty DECIMAL(5,2) DEFAULT 0,
        max_attempts INT DEFAULT NULL,
        show_ranking BOOLEAN DEFAULT TRUE,
        show_answers_after BOOLEAN DEFAULT FALSE,
        status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_assignments_class (class_id),
        INDEX idx_assignments_game (game_id),
        INDEX idx_assignments_status (status),
        INDEX idx_assignments_time (start_time, end_time)
      )
    `);
    console.log("  ✅ Bảng assignments đã được tạo");

    // 6. Cập nhật bảng submissions nếu cần
    console.log("\n📦 Cập nhật bảng submissions...");
    await connection
      .query(
        `
      ALTER TABLE submissions 
      ADD COLUMN IF NOT EXISTS assignment_id INT,
      ADD COLUMN IF NOT EXISTS passed_tests INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_tests INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS execution_time INT,
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
      ADD COLUMN IF NOT EXISTS user_agent TEXT,
      ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP NULL
    `,
      )
      .catch(() => console.log("  - Một số columns đã tồn tại"));
    console.log("  ✅ Bảng submissions đã được cập nhật");

    // 7. Tạo bảng rankings
    console.log("\n📦 Tạo bảng rankings...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rankings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        user_id INT NOT NULL,
        best_score DECIMAL(5,2) DEFAULT 0,
        best_submission_id INT,
        total_attempts INT DEFAULT 0,
        first_passed_at TIMESTAMP NULL,
        rank_position INT DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_ranking (assignment_id, user_id),
        INDEX idx_rankings_rank (assignment_id, rank_position)
      )
    `);
    console.log("  ✅ Bảng rankings đã được tạo");

    // 8. Tạo bảng notifications
    console.log("\n📦 Tạo bảng notifications...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('assignment', 'grade', 'class', 'system') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_notifications_user (user_id, is_read),
        INDEX idx_notifications_created (created_at DESC)
      )
    `);
    console.log("  ✅ Bảng notifications đã được tạo");

    // 9. Tạo bảng activity_log
    console.log("\n📦 Tạo bảng activity_log...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        details JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_activity_user (user_id),
        INDEX idx_activity_action (action),
        INDEX idx_activity_created (created_at DESC)
      )
    `);
    console.log("  ✅ Bảng activity_log đã được tạo");

    // 10. Tạo bảng settings
    console.log("\n📦 Tạo bảng settings...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description VARCHAR(255),
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Insert default settings
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, description) VALUES
        ('allow_self_registration', 'false', 'Cho phép học sinh tự đăng ký'),
        ('default_max_students', '50', 'Số học sinh tối đa mỗi lớp'),
        ('submission_timeout', '30000', 'Timeout chạy code (ms)'),
        ('max_code_length', '50000', 'Độ dài code tối đa'),
        ('site_name', 'PyLearn Arena', 'Tên website'),
        ('maintenance_mode', 'false', 'Chế độ bảo trì')
      ON DUPLICATE KEY UPDATE setting_key = setting_key
    `);
    console.log("  ✅ Bảng settings đã được tạo");

    // 11. Tạo bảng lesson_sessions (cho quick submit trong giờ học)
    console.log("\n📦 Tạo bảng lesson_sessions...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        game_id INT NOT NULL,
        session_code VARCHAR(10) UNIQUE NOT NULL,
        created_by INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_code (session_code),
        INDEX idx_session_active (is_active, expires_at)
      )
    `);
    console.log("  ✅ Bảng lesson_sessions đã được tạo");

    // 12. Tạo bảng session_submissions
    console.log("\n📦 Tạo bảng session_submissions...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS session_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        user_id INT NOT NULL,
        code TEXT,
        score DECIMAL(5,2) DEFAULT 0,
        is_correct BOOLEAN DEFAULT FALSE,
        execution_time INT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES lesson_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_session_user (session_id, user_id),
        INDEX idx_session_score (session_id, score DESC)
      )
    `);
    console.log("  ✅ Bảng session_submissions đã được tạo");

    // 13. Thêm cột notes vào lessons nếu chưa có
    console.log("\n📦 Cập nhật bảng lessons...");
    await connection
      .query(`ALTER TABLE lessons ADD COLUMN notes TEXT`)
      .catch(() => console.log("  - Column notes đã tồn tại"));
    console.log("  ✅ Bảng lessons đã được cập nhật");

    // 14. Tạo bảng contests (cuộc thi)
    console.log("\n📦 Tạo bảng contests...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        contest_code VARCHAR(10) UNIQUE NOT NULL,
        created_by INT NOT NULL,
        class_id INT,
        course_id INT,
        lesson_id INT,
        open_all_games BOOLEAN DEFAULT FALSE,
        status ENUM('draft', 'active', 'closed') DEFAULT 'draft',
        start_time TIMESTAMP NULL,
        end_time TIMESTAMP NULL,
        show_ranking BOOLEAN DEFAULT TRUE,
        allow_resubmit BOOLEAN DEFAULT TRUE,
        max_attempts INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
        INDEX idx_contests_code (contest_code),
        INDEX idx_contests_status (status),
        INDEX idx_contests_class (class_id),
        INDEX idx_contests_time (start_time, end_time)
      )
    `);
    console.log("  ✅ Bảng contests đã được tạo");

    // 15. Tạo bảng contest_games (game nào được mở trong cuộc thi)
    console.log("\n📦 Tạo bảng contest_games...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contest_games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        game_id INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        UNIQUE KEY unique_contest_game (contest_id, game_id),
        INDEX idx_contest_games_active (contest_id, is_active)
      )
    `);
    console.log("  ✅ Bảng contest_games đã được tạo");

    // 16. Tạo bảng contest_submissions (bài nộp trong cuộc thi)
    console.log("\n📦 Tạo bảng contest_submissions...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contest_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        game_id INT NOT NULL,
        user_id INT NOT NULL,
        code TEXT,
        score DECIMAL(5,2) DEFAULT 0,
        passed_tests INT DEFAULT 0,
        total_tests INT DEFAULT 0,
        is_correct BOOLEAN DEFAULT FALSE,
        execution_time INT,
        attempt_number INT DEFAULT 1,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_contest_sub_user (contest_id, user_id),
        INDEX idx_contest_sub_game (contest_id, game_id),
        INDEX idx_contest_sub_score (contest_id, game_id, score DESC)
      )
    `);
    console.log("  ✅ Bảng contest_submissions đã được tạo");

    // 17. Thêm giáo viên mẫu
    console.log("\n👤 Thêm giáo viên mẫu...");
    const passwordHash =
      "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"; // 123456

    await connection.query(
      `
      INSERT INTO users (username, password, full_name, email, role, status) VALUES
        ('teacher1', ?, 'Nguyễn Văn A', 'teacher1@school.edu.vn', 'teacher', 'active'),
        ('teacher2', ?, 'Trần Thị B', 'teacher2@school.edu.vn', 'teacher', 'active')
      ON DUPLICATE KEY UPDATE username = username
    `,
      [passwordHash, passwordHash],
    );
    console.log(
      "  ✅ Đã thêm giáo viên mẫu (teacher1, teacher2 - password: 123456)",
    );

    console.log("\n✨ Migration hoàn tất!");
    console.log("\n📋 Tài khoản mẫu:");
    console.log("  - Admin: admin / 123456");
    console.log("  - Teacher: teacher1 / 123456");
    console.log("  - Teacher: teacher2 / 123456");
  } catch (error) {
    console.error("\n❌ Lỗi migration:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
