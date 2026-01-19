-- ============================================================
-- COURSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50) DEFAULT 'beginner',
  total_lessons INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LESSONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id VARCHAR(100) NOT NULL,
  course_id VARCHAR(100) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  game_type VARCHAR(50),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, course_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);

-- ============================================================
-- USER PROGRESS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id VARCHAR(100) NOT NULL,
  course_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  UNIQUE(user_id, lesson_id, course_id),
  FOREIGN KEY (lesson_id, course_id) REFERENCES lessons(id, course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson ON user_progress(lesson_id, course_id);

-- ============================================================
-- SAMPLE DATA
-- ============================================================
INSERT INTO courses (id, title, description, level, total_lessons)
VALUES ('python-basics', 'Python Cơ Bản', 'Học các khái niệm cơ bản về Python thông qua game', 'beginner', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, course_id, title, description, order_index, duration_minutes, game_type)
VALUES 
  ('t10-cd-b12-id1', 'python-basics', 'Đảo ngược chuỗi', 'Học cách đảo ngược chuỗi trong Python', 1, 15, 'string'),
  ('t10-cd-b12-id2', 'python-basics', 'Cắt chuỗi', 'Học cách cắt chuỗi với slicing', 2, 15, 'string'),
  ('t10-cd-b12-id3', 'python-basics', 'Kiểm tra chuỗi con', 'Học cách kiểm tra chuỗi con trong chuỗi', 3, 15, 'string'),
  ('t10-cd-b12-id4', 'python-basics', 'Thay thế chuỗi', 'Học cách thay thế ký tự trong chuỗi', 4, 15, 'string')
ON CONFLICT (id, course_id) DO NOTHING;
