-- ============================================================
-- SCHEMA QUẢN LÝ HỆ THỐNG PYLEARN ARENA
-- Hệ thống phân cấp: Admin > Giáo viên > Học sinh
-- ============================================================

-- 1. CẬP NHẬT BẢNG USERS - THÊM ROLE TEACHER
-- ============================================================
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'student';

-- Thêm các cột mới cho users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'suspended') DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;

-- Index cho role và status
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- 2. BẢNG CLASSES - QUẢN LÝ LỚP HỌC
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Mã lớp duy nhất để tham gia',
  teacher_id INT NOT NULL COMMENT 'Giáo viên chủ nhiệm',
  school_year VARCHAR(20) COMMENT 'Năm học: 2025-2026',
  grade VARCHAR(20) COMMENT 'Khối: 10, 11, 12',
  max_students INT DEFAULT 50,
  status ENUM('active', 'archived', 'closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_classes_teacher (teacher_id),
  INDEX idx_classes_status (status),
  INDEX idx_classes_code (code)
);

-- 3. BẢNG CLASS_MEMBERS - THÀNH VIÊN LỚP HỌC
-- ============================================================
CREATE TABLE IF NOT EXISTS class_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('student', 'assistant') DEFAULT 'student' COMMENT 'Học sinh hoặc trợ giảng',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'removed', 'left') DEFAULT 'active',
  
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_class_member (class_id, user_id),
  INDEX idx_class_members_user (user_id),
  INDEX idx_class_members_status (status)
);

-- 4. BẢNG COURSE_ACCESS - QUYỀN TRUY CẬP KHÓA HỌC CHO LỚP
-- ============================================================
CREATE TABLE IF NOT EXISTS course_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  course_id INT NOT NULL COMMENT 'ID từ bảng courses',
  granted_by INT NOT NULL COMMENT 'Người cấp quyền (teacher/admin)',
  is_active BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL COMMENT 'Hết hạn truy cập (nếu có)',
  
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_course_access (class_id, course_id),
  INDEX idx_course_access_active (is_active)
);

-- 5. BẢNG ASSIGNMENTS - BÀI TẬP/NHIỆM VỤ
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  game_id INT NOT NULL COMMENT 'ID từ bảng games',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT NOT NULL,
  
  -- Thời gian
  start_time TIMESTAMP NOT NULL COMMENT 'Bắt đầu nhận bài',
  end_time TIMESTAMP NOT NULL COMMENT 'Hết hạn nộp bài',
  late_submission BOOLEAN DEFAULT FALSE COMMENT 'Cho phép nộp muộn',
  late_penalty DECIMAL(5,2) DEFAULT 0 COMMENT 'Phần trăm trừ điểm khi nộp muộn',
  
  -- Cấu hình
  max_attempts INT DEFAULT NULL COMMENT 'Số lần nộp tối đa (NULL = không giới hạn)',
  show_ranking BOOLEAN DEFAULT TRUE COMMENT 'Hiển thị bảng xếp hạng',
  show_answers_after BOOLEAN DEFAULT FALSE COMMENT 'Hiển thị đáp án sau khi hết hạn',
  
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
);

-- 6. BẢNG SUBMISSIONS - NỘP BÀI
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Nội dung bài nộp
  code TEXT NOT NULL COMMENT 'Code Python của học sinh',
  
  -- Kết quả chấm
  score DECIMAL(5,2) DEFAULT NULL COMMENT 'Điểm (0-100)',
  passed_tests INT DEFAULT 0 COMMENT 'Số test cases đúng',
  total_tests INT DEFAULT 0 COMMENT 'Tổng số test cases',
  execution_time INT DEFAULT NULL COMMENT 'Thời gian chạy (ms)',
  
  -- Trạng thái
  status ENUM('pending', 'running', 'passed', 'failed', 'error') DEFAULT 'pending',
  error_message TEXT COMMENT 'Lỗi nếu có',
  is_late BOOLEAN DEFAULT FALSE COMMENT 'Nộp muộn',
  
  -- Metadata
  attempt_number INT DEFAULT 1 COMMENT 'Lần nộp thứ mấy',
  ip_address VARCHAR(45) COMMENT 'IP khi nộp bài',
  user_agent TEXT COMMENT 'Trình duyệt',
  
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  graded_at TIMESTAMP NULL,
  
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_submissions_assignment (assignment_id),
  INDEX idx_submissions_user (user_id),
  INDEX idx_submissions_status (status),
  INDEX idx_submissions_score (score DESC)
);

-- 7. BẢNG RANKINGS - BẢNG XẾP HẠNG (CACHE)
-- ============================================================
CREATE TABLE IF NOT EXISTS rankings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  user_id INT NOT NULL,
  
  best_score DECIMAL(5,2) DEFAULT 0,
  best_submission_id INT COMMENT 'ID bài nộp tốt nhất',
  total_attempts INT DEFAULT 0,
  first_passed_at TIMESTAMP NULL COMMENT 'Thời điểm pass đầu tiên',
  
  rank_position INT DEFAULT NULL COMMENT 'Vị trí xếp hạng',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (best_submission_id) REFERENCES submissions(id) ON DELETE SET NULL,
  UNIQUE KEY unique_ranking (assignment_id, user_id),
  INDEX idx_rankings_rank (assignment_id, rank_position)
);

-- 8. BẢNG NOTIFICATIONS - THÔNG BÁO
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('assignment', 'grade', 'class', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500) COMMENT 'Link đến trang liên quan',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, is_read),
  INDEX idx_notifications_created (created_at DESC)
);

-- 9. BẢNG ACTIVITY_LOG - LỊCH SỬ HOẠT ĐỘNG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL COMMENT 'login, submit, create_class, etc.',
  entity_type VARCHAR(50) COMMENT 'class, assignment, submission, etc.',
  entity_id INT COMMENT 'ID của entity',
  details JSON COMMENT 'Chi tiết bổ sung',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_action (action),
  INDEX idx_activity_created (created_at DESC)
);

-- 10. BẢNG SETTINGS - CẤU HÌNH HỆ THỐNG
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description VARCHAR(255),
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert cấu hình mặc định
INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('allow_self_registration', 'false', 'Cho phép học sinh tự đăng ký'),
  ('default_max_students', '50', 'Số học sinh tối đa mỗi lớp'),
  ('submission_timeout', '30000', 'Timeout chạy code (ms)'),
  ('max_code_length', '50000', 'Độ dài code tối đa'),
  ('site_name', 'PyLearn Arena', 'Tên website'),
  ('maintenance_mode', 'false', 'Chế độ bảo trì')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- ============================================================
-- VIEWS HỮU ÍCH
-- ============================================================

-- View: Thống kê lớp học
CREATE OR REPLACE VIEW v_class_stats AS
SELECT 
  c.id AS class_id,
  c.name AS class_name,
  c.code AS class_code,
  u.full_name AS teacher_name,
  COUNT(DISTINCT cm.user_id) AS student_count,
  COUNT(DISTINCT ca.course_id) AS course_count,
  COUNT(DISTINCT a.id) AS assignment_count
FROM classes c
LEFT JOIN users u ON c.teacher_id = u.id
LEFT JOIN class_members cm ON c.id = cm.class_id AND cm.status = 'active'
LEFT JOIN course_access ca ON c.id = ca.class_id AND ca.is_active = TRUE
LEFT JOIN assignments a ON c.id = a.class_id AND a.status = 'published'
WHERE c.status = 'active'
GROUP BY c.id, c.name, c.code, u.full_name;

-- View: Bảng xếp hạng assignment
CREATE OR REPLACE VIEW v_assignment_leaderboard AS
SELECT 
  r.assignment_id,
  r.user_id,
  u.full_name,
  u.username,
  r.best_score,
  r.total_attempts,
  r.first_passed_at,
  r.rank_position
FROM rankings r
JOIN users u ON r.user_id = u.id
ORDER BY r.assignment_id, r.rank_position;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Procedure: Cập nhật ranking sau khi nộp bài
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_update_ranking(IN p_submission_id INT)
BEGIN
  DECLARE v_assignment_id INT;
  DECLARE v_user_id INT;
  DECLARE v_score DECIMAL(5,2);
  
  -- Lấy thông tin submission
  SELECT assignment_id, user_id, score 
  INTO v_assignment_id, v_user_id, v_score
  FROM submissions WHERE id = p_submission_id;
  
  -- Cập nhật hoặc insert ranking
  INSERT INTO rankings (assignment_id, user_id, best_score, best_submission_id, total_attempts, first_passed_at)
  VALUES (v_assignment_id, v_user_id, v_score, p_submission_id, 1, 
          IF(v_score >= 100, CURRENT_TIMESTAMP, NULL))
  ON DUPLICATE KEY UPDATE
    best_score = IF(v_score > best_score, v_score, best_score),
    best_submission_id = IF(v_score > best_score, p_submission_id, best_submission_id),
    total_attempts = total_attempts + 1,
    first_passed_at = IF(first_passed_at IS NULL AND v_score >= 100, CURRENT_TIMESTAMP, first_passed_at);
  
  -- Cập nhật rank_position cho toàn bộ assignment
  SET @rank := 0;
  UPDATE rankings r
  SET rank_position = (@rank := @rank + 1)
  WHERE assignment_id = v_assignment_id
  ORDER BY best_score DESC, first_passed_at ASC;
END //
DELIMITER ;

-- ============================================================
-- DỮ LIỆU MẪU
-- ============================================================

-- Thêm giáo viên mẫu
INSERT INTO users (username, password, full_name, email, role, status) VALUES
  ('teacher1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Nguyễn Văn A', 'teacher1@school.edu.vn', 'teacher', 'active'),
  ('teacher2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Trần Thị B', 'teacher2@school.edu.vn', 'teacher', 'active')
ON DUPLICATE KEY UPDATE username = username;

-- Thêm học sinh mẫu
INSERT INTO users (username, password, full_name, email, role, status, created_by) VALUES
  ('student1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Lê Văn C', 'student1@school.edu.vn', 'student', 'active', 2),
  ('student2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Phạm Thị D', 'student2@school.edu.vn', 'student', 'active', 2),
  ('student3', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Hoàng Văn E', 'student3@school.edu.vn', 'student', 'active', 2)
ON DUPLICATE KEY UPDATE username = username;
