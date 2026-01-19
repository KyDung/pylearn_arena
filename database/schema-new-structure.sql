-- ============================================================
-- TOPICS TABLE (Chủ đề)
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  course_id VARCHAR(100) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LESSONS TABLE (Updated with topic_id)
-- ============================================================
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;

CREATE TABLE lessons (
  id VARCHAR(100) NOT NULL,
  course_id VARCHAR(100) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, course_id)
);

-- ============================================================
-- GAMES TABLE (Game thuộc lesson)
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(100) NOT NULL,
  lesson_id VARCHAR(100) NOT NULL,
  course_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  game_type VARCHAR(50),
  path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (lesson_id, course_id) REFERENCES lessons(id, course_id) ON DELETE CASCADE
);

-- ============================================================
-- USER PROGRESS TABLE (Updated)
-- ============================================================
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(100) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  UNIQUE(user_id, game_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_topics_course ON topics(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_topic ON lessons(topic_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_games_lesson ON games(lesson_id, course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_game ON user_progress(game_id);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Update course
UPDATE courses 
SET total_lessons = 1, 
    description = 'Học Python thông qua các bài tập thực hành về xử lý xâu ký tự',
    updated_at = NOW()
WHERE id = 'python-basics';

-- Insert Topic
INSERT INTO topics (course_id, title, description, order_index)
VALUES (
  'python-basics',
  'Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính',
  'Học cách giải quyết vấn đề lập trình với Python',
  1
)
ON CONFLICT DO NOTHING;

-- Get topic_id
DO $$
DECLARE
  topic_id_var INTEGER;
BEGIN
  SELECT id INTO topic_id_var FROM topics WHERE course_id = 'python-basics' AND order_index = 1;

  -- Insert Lesson
  INSERT INTO lessons (id, course_id, topic_id, title, description, order_index, duration_minutes)
  VALUES (
    'bai-12',
    'python-basics',
    topic_id_var,
    'Bài 12: Kiểu dữ liệu xâu ký tự - Xử lý xâu ký tự',
    'Học cách làm việc với chuỗi (string) trong Python',
    1,
    60
  )
  ON CONFLICT (id, course_id) DO UPDATE 
  SET topic_id = topic_id_var, updated_at = NOW();

  -- Insert Games
  INSERT INTO games (id, lesson_id, course_id, title, description, order_index, game_type, path)
  VALUES 
    (
      't10-cd-b12-id1',
      'bai-12',
      'python-basics',
      'Game 1: Đảo ngược chuỗi',
      'Viết hàm đảo ngược một chuỗi ký tự',
      1,
      'string',
      't10-cd-b12-id1'
    ),
    (
      't10-cd-b12-id2',
      'bai-12',
      'python-basics',
      'Game 2: Cắt chuỗi',
      'Sử dụng slicing để cắt chuỗi',
      2,
      'string',
      't10-cd-b12-id2'
    ),
    (
      't10-cd-b12-id3',
      'bai-12',
      'python-basics',
      'Game 3: Kiểm tra chuỗi con',
      'Kiểm tra xem một chuỗi có chứa chuỗi con không',
      3,
      'string',
      't10-cd-b12-id3'
    ),
    (
      't10-cd-b12-id4',
      'bai-12',
      'python-basics',
      'Game 4: Thay thế ký tự',
      'Thay thế ký tự trong chuỗi',
      4,
      'string',
      't10-cd-b12-id4'
    )
  ON CONFLICT (id) DO UPDATE 
  SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    order_index = EXCLUDED.order_index,
    updated_at = NOW();
END $$;
