-- ============================================================
-- COURSE ACCESS SYSTEM
-- Teacher/Admin kiểm soát content hiển thị cho từng lớp
-- ============================================================

-- Bảng settings: Lớp nào được truy cập khóa học nào
CREATE TABLE IF NOT EXISTS class_course_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  course_id INT NOT NULL,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_class_course (class_id, course_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Bảng chi tiết: Topic/Lesson nào được unlock cho lớp
CREATE TABLE IF NOT EXISTS course_content_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  course_id INT NOT NULL,
  content_type ENUM('topic', 'lesson') NOT NULL,
  content_id VARCHAR(100) NOT NULL,  -- topic_id (INT) hoặc lesson_id (VARCHAR)
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_by INT REFERENCES users(id),
  unlocked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_class_course (class_id, course_id),
  INDEX idx_content_lookup (class_id, course_id, content_type, content_id),
  UNIQUE KEY unique_content_access (class_id, course_id, content_type, content_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
