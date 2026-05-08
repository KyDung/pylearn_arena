-- ============================================================
-- SCHEMA FOR SESSIONS & CONTESTS
-- Sessions: Buổi học thực hành (1 game, luyện tập)
-- Contests: Cuộc thi (nhiều game, xếp hạng, giới hạn thời gian)
-- ============================================================

-- ============================================================
-- 1. SESSIONS - BUỔI HỌC THỰC HÀNH
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  game_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Timing
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  duration_minutes INT DEFAULT 60,
  auto_close BOOLEAN DEFAULT TRUE COMMENT 'Auto close after duration',
  
  -- Status
  status ENUM('active', 'closed') DEFAULT 'active',
  
  -- Creator
  created_by INT NOT NULL,
  
  -- Stats (cache)
  total_submissions INT DEFAULT 0,
  unique_submitters INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_sessions_class (class_id),
  INDEX idx_sessions_game (game_id),
  INDEX idx_sessions_status (status),
  INDEX idx_sessions_created_by (created_by),
  INDEX idx_sessions_active (status, closed_at)
);

-- Session Submissions - Bài nộp trong session
CREATE TABLE IF NOT EXISTS session_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Nội dung
  code TEXT NOT NULL,
  
  -- Kết quả
  score DECIMAL(5,2) DEFAULT 0,
  passed_tests INT DEFAULT 0,
  total_tests INT DEFAULT 0,
  is_correct BOOLEAN DEFAULT FALSE,
  execution_time INT DEFAULT NULL COMMENT 'ms',
  error_message TEXT,
  
  -- Metadata
  attempt_number INT DEFAULT 1,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_session_submissions_session (session_id),
  INDEX idx_session_submissions_user (user_id),
  INDEX idx_session_submissions_correct (session_id, is_correct)
);

-- ============================================================
-- 2. CONTESTS - CUỘC THI
-- ============================================================

CREATE TABLE IF NOT EXISTS contests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  contest_code VARCHAR(10) NOT NULL UNIQUE COMMENT 'Mã tham gia cuộc thi',
  
  -- Creator
  created_by INT NOT NULL,
  
  -- Target (optional - có thể public)
  class_id INT NULL COMMENT 'Giới hạn cho 1 lớp (null = public)',
  course_id INT NULL COMMENT 'Khóa học nguồn',
  lesson_id INT NULL COMMENT 'Bài học nguồn',
  
  -- Mode
  open_all_games BOOLEAN DEFAULT FALSE COMMENT 'Mở tất cả game trong lesson',
  
  -- Timing
  start_time TIMESTAMP NULL COMMENT 'Thời gian bắt đầu',
  end_time TIMESTAMP NULL COMMENT 'Thời gian kết thúc',
  
  -- Rules
  show_ranking BOOLEAN DEFAULT TRUE COMMENT 'Hiện bảng xếp hạng',
  allow_resubmit BOOLEAN DEFAULT TRUE COMMENT 'Cho phép nộp lại',
  max_attempts INT NULL COMMENT 'Số lần nộp tối đa mỗi game (null = không giới hạn)',
  
  -- Status
  status ENUM('draft', 'active', 'closed') DEFAULT 'draft',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  
  INDEX idx_contests_creator (created_by),
  INDEX idx_contests_class (class_id),
  INDEX idx_contests_status (status),
  INDEX idx_contests_code (contest_code),
  INDEX idx_contests_time (start_time, end_time)
);

-- Contest Games - Danh sách game trong cuộc thi
CREATE TABLE IF NOT EXISTS contest_games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  game_id INT NOT NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  points INT DEFAULT 100 COMMENT 'Điểm cho game này',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_contest_game (contest_id, game_id),
  INDEX idx_contest_games_contest (contest_id),
  INDEX idx_contest_games_order (contest_id, sort_order)
);

-- Contest Submissions - Bài nộp trong cuộc thi
CREATE TABLE IF NOT EXISTS contest_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  game_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Nội dung
  code TEXT NOT NULL,
  
  -- Kết quả
  score DECIMAL(5,2) DEFAULT 0,
  passed_tests INT DEFAULT 0,
  total_tests INT DEFAULT 0,
  is_correct BOOLEAN DEFAULT FALSE,
  execution_time INT DEFAULT NULL COMMENT 'ms',
  error_message TEXT,
  
  -- Metadata
  attempt_number INT DEFAULT 1,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_contest_submissions_contest (contest_id),
  INDEX idx_contest_submissions_game (contest_id, game_id),
  INDEX idx_contest_submissions_user (user_id),
  INDEX idx_contest_submissions_score (contest_id, user_id, score DESC)
);

-- Contest Rankings (cached) - Bảng xếp hạng
CREATE TABLE IF NOT EXISTS contest_rankings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  user_id INT NOT NULL,
  
  total_score DECIMAL(8,2) DEFAULT 0,
  games_completed INT DEFAULT 0,
  total_games INT DEFAULT 0,
  total_attempts INT DEFAULT 0,
  best_submission_time TIMESTAMP NULL COMMENT 'Thời điểm nộp bài cuối cùng đúng',
  rank_position INT DEFAULT NULL,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_contest_ranking (contest_id, user_id),
  INDEX idx_contest_rankings_rank (contest_id, rank_position),
  INDEX idx_contest_rankings_score (contest_id, total_score DESC)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger cập nhật stats session khi có submission mới
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_session_submission_insert
AFTER INSERT ON session_submissions
FOR EACH ROW
BEGIN
  UPDATE sessions 
  SET 
    total_submissions = total_submissions + 1,
    unique_submitters = (
      SELECT COUNT(DISTINCT user_id) 
      FROM session_submissions 
      WHERE session_id = NEW.session_id
    )
  WHERE id = NEW.session_id;
END//
DELIMITER ;

-- Trigger cập nhật ranking khi có submission contest mới
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_contest_submission_insert
AFTER INSERT ON contest_submissions
FOR EACH ROW
BEGIN
  -- Tính tổng điểm cao nhất cho mỗi game
  INSERT INTO contest_rankings (contest_id, user_id, total_score, games_completed, total_games, total_attempts, best_submission_time)
  SELECT 
    NEW.contest_id,
    NEW.user_id,
    COALESCE(SUM(best_score), 0) as total_score,
    COUNT(CASE WHEN is_correct = TRUE THEN 1 END) as games_completed,
    (SELECT COUNT(*) FROM contest_games WHERE contest_id = NEW.contest_id AND is_active = TRUE) as total_games,
    (SELECT COUNT(*) FROM contest_submissions WHERE contest_id = NEW.contest_id AND user_id = NEW.user_id) as total_attempts,
    NOW()
  FROM (
    SELECT game_id, MAX(score) as best_score, MAX(is_correct) as is_correct
    FROM contest_submissions
    WHERE contest_id = NEW.contest_id AND user_id = NEW.user_id
    GROUP BY game_id
  ) as game_scores
  ON DUPLICATE KEY UPDATE
    total_score = VALUES(total_score),
    games_completed = VALUES(games_completed),
    total_games = VALUES(total_games),
    total_attempts = VALUES(total_attempts),
    best_submission_time = NOW();
END//
DELIMITER ;
