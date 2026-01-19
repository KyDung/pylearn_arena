-- MySQL Schema for PyLearn Arena
-- Chạy script này trong MySQL Workbench để tạo các bảng

-- 1. Bảng users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'student',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng courses
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail VARCHAR(500),
  difficulty VARCHAR(50) DEFAULT 'beginner',
  is_published BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng topics (chapters)
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_num INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course (course_id),
  INDEX idx_order (order_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng lessons
CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  summary TEXT,
  order_num INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  INDEX idx_topic (topic_id),
  INDEX idx_order (order_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng games
CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  path VARCHAR(500) NOT NULL,
  order_num INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson (lesson_id),
  INDEX idx_order (order_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng submissions (nộp bài)
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id INT NOT NULL,
  code TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  score INT DEFAULT 0,
  feedback TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  graded_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_game (game_id),
  INDEX idx_status (status),
  INDEX idx_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng user_progress (tiến độ học tập)
CREATE TABLE IF NOT EXISTS user_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id INT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  score INT DEFAULT 0,
  attempts INT DEFAULT 0,
  last_attempt_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_game (user_id, game_id),
  INDEX idx_user (user_id),
  INDEX idx_game (game_id),
  INDEX idx_completed (is_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert dữ liệu mẫu
-- User mặc định (password: admin123)
INSERT INTO users (username, password, email, full_name, role) 
VALUES 
  ('admin', '$2a$10$rO5qZ8mYvZ.xqvKj9gL9/OQKJ5X5wN0yKh0xhF.8g8xN0yKh0xhF.', 'admin@pylearn.com', 'Administrator', 'teacher'),
  ('student1', '$2a$10$rO5qZ8mYvZ.xqvKj9gL9/OQKJ5X5wN0yKh0xhF.8g8xN0yKh0xhF.', 'student1@pylearn.com', 'Học Viên 1', 'student')
ON DUPLICATE KEY UPDATE username=username;

-- Course Python Basics
INSERT INTO courses (slug, title, description, difficulty, is_published)
VALUES ('python-basics', 'Python Cơ Bản', 'Khóa học Python từ cơ bản đến nâng cao', 'beginner', true)
ON DUPLICATE KEY UPDATE slug=slug;

-- Topic 1
INSERT INTO topics (course_id, slug, title, description, order_num)
VALUES (1, 'chapter-1', 'Chương 1: Làm quen với Python', 'Các khái niệm cơ bản', 1)
ON DUPLICATE KEY UPDATE slug=slug;

-- Lesson
INSERT INTO lessons (topic_id, slug, title, description, summary, order_num)
VALUES (1, 't10-cd-b12', 'Bài 12: Chuỗi và Xử lý văn bản', 'Học cách làm việc với chuỗi trong Python', 'Thao tác chuỗi cơ bản', 12)
ON DUPLICATE KEY UPDATE slug=slug;

-- Games
INSERT INTO games (lesson_id, slug, title, description, path, order_num)
VALUES 
  (1, 't10-cd-b12-id1', 'Game 1: Đảo ngược chuỗi', 'Viết hàm đảo ngược chuỗi', 'python-basics/t10-cd-b12-id1', 1),
  (1, 't10-cd-b12-id2', 'Game 2: Đếm ký tự', 'Đếm số lần xuất hiện của ký tự', 'python-basics/t10-cd-b12-id2', 2),
  (1, 't10-cd-b12-id3', 'Game 3: Chuyển đổi hoa thường', 'Chuyển đổi chữ hoa thành chữ thường', 'python-basics/t10-cd-b12-id3', 3),
  (1, 't10-cd-b12-id4', 'Game 4: Tìm kiếm chuỗi con', 'Tìm vị trí của chuỗi con', 'python-basics/t10-cd-b12-id4', 4)
ON DUPLICATE KEY UPDATE slug=slug;

-- Hoàn tất
SELECT 'Database schema created successfully!' as message;
