-- ============================================================
-- MIGRATION: Thêm max_submissions cho Sessions và tạo Contests system
-- ============================================================

-- 1. Thêm max_submissions vào bảng sessions
ALTER TABLE sessions 
ADD COLUMN max_submissions INT DEFAULT NULL COMMENT 'Số lần nộp tối đa (NULL = không giới hạn)' AFTER duration_minutes;

-- 2. Tạo bảng contests (tương tự sessions nhưng có thêm giải thưởng)
CREATE TABLE IF NOT EXISTS contests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  game_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Timing - contests có thời gian cụ thể hơn sessions
  start_time TIMESTAMP NOT NULL COMMENT 'Thời gian bắt đầu',
  end_time TIMESTAMP NOT NULL COMMENT 'Thời gian kết thúc',
  result_announce_time TIMESTAMP NULL COMMENT 'Thời gian công bố kết quả',
  
  -- Submission limits
  max_submissions INT DEFAULT 10 COMMENT 'Số lần nộp tối đa',
  
  -- Contest rules
  allow_late_submission BOOLEAN DEFAULT FALSE COMMENT 'Cho phép nộp muộn',
  late_penalty_percent DECIMAL(5,2) DEFAULT 20.00 COMMENT 'Phần trăm trừ điểm khi nộp muộn',
  show_leaderboard BOOLEAN DEFAULT TRUE COMMENT 'Hiển thị bảng xếp hạng trong lúc thi',
  show_leaderboard_scores BOOLEAN DEFAULT FALSE COMMENT 'Hiển thị điểm trong bảng xếp hạng khi đang thi',
  
  -- Prizes/Rewards
  prizes JSON COMMENT 'Thông tin giải thưởng {"1st": "100K", "2nd": "50K", "3rd": "25K"}',
  
  -- Status
  status ENUM('draft', 'published', 'ongoing', 'ended', 'archived') DEFAULT 'draft',
  
  -- Creator
  created_by INT NOT NULL,
  
  -- Stats (cache)
  total_participants INT DEFAULT 0,
  total_submissions INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_contests_class (class_id),
  INDEX idx_contests_game (game_id),
  INDEX idx_contests_status (status),
  INDEX idx_contests_created_by (created_by),
  INDEX idx_contests_time (start_time, end_time)
);

-- 3. Tạo bảng contest_submissions
CREATE TABLE IF NOT EXISTS contest_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Nội dung bài nộp
  code TEXT NOT NULL COMMENT 'Code Python của thí sinh',
  
  -- Kết quả chấm
  score DECIMAL(5,2) DEFAULT NULL COMMENT 'Điểm (0-100)',
  passed_tests INT DEFAULT 0 COMMENT 'Số test cases đúng',
  total_tests INT DEFAULT 0 COMMENT 'Tổng số test cases',
  execution_time INT DEFAULT NULL COMMENT 'Thời gian chạy (ms)',
  
  -- Contest-specific
  is_late BOOLEAN DEFAULT FALSE COMMENT 'Nộp sau thời gian kết thúc',
  final_score DECIMAL(5,2) DEFAULT NULL COMMENT 'Điểm sau khi trừ penalty (nếu có)',
  
  -- Trạng thái
  status ENUM('pending', 'running', 'passed', 'failed', 'error') DEFAULT 'pending',
  error_message TEXT COMMENT 'Lỗi nếu có',
  
  -- Metadata
  attempt_number INT DEFAULT 1 COMMENT 'Lần nộp thứ mấy',
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  graded_at TIMESTAMP NULL,
  
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_contest_submissions_contest (contest_id),
  INDEX idx_contest_submissions_user (user_id),
  INDEX idx_contest_submissions_status (status),
  INDEX idx_contest_submissions_score (final_score DESC),
  INDEX idx_contest_submissions_time (submitted_at)
);

-- 4. Tạo bảng contest_rankings (cache for leaderboard)
CREATE TABLE IF NOT EXISTS contest_rankings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  user_id INT NOT NULL,
  
  best_score DECIMAL(5,2) DEFAULT 0,
  best_submission_id INT COMMENT 'ID bài nộp tốt nhất',
  total_attempts INT DEFAULT 0,
  first_submission_at TIMESTAMP NULL,
  best_submission_at TIMESTAMP NULL,
  
  rank_position INT DEFAULT NULL COMMENT 'Vị trí xếp hạng',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (best_submission_id) REFERENCES contest_submissions(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_contest_ranking (contest_id, user_id),
  INDEX idx_contest_rankings_rank (contest_id, rank_position),
  INDEX idx_contest_rankings_score (contest_id, best_score DESC)
);

-- 5. Tạo view cho contest leaderboard
CREATE OR REPLACE VIEW v_contest_leaderboard AS
SELECT 
  r.contest_id,
  r.user_id,
  u.full_name,
  u.username,
  r.best_score,
  r.total_attempts,
  r.first_submission_at,
  r.best_submission_at,
  r.rank_position,
  c.show_leaderboard_scores
FROM contest_rankings r
JOIN users u ON r.user_id = u.id
JOIN contests c ON r.contest_id = c.id
ORDER BY r.contest_id, r.rank_position;

-- ============================================================
-- ROLLBACK SCRIPT (dùng khi cần revert)
-- ============================================================
-- ALTER TABLE sessions DROP COLUMN max_submissions;
-- DROP VIEW IF EXISTS v_contest_leaderboard;
-- DROP TABLE IF EXISTS contest_rankings;
-- DROP TABLE IF EXISTS contest_submissions;
-- DROP TABLE IF EXISTS contests;
