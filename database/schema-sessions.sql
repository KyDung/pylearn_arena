-- ============================================================
-- SCHEMA FOR SESSIONS - LIVE SUBMISSION SESSIONS
-- Teacher/Admin opens session → Students can submit → Close session
-- ============================================================

-- Create sessions table
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

-- Update submissions table to link with sessions
ALTER TABLE submissions 
  ADD COLUMN session_id INT NULL AFTER assignment_id,
  ADD FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  ADD INDEX idx_submissions_session (session_id);

-- Make assignment_id nullable (can be either assignment or session)
ALTER TABLE submissions 
  MODIFY COLUMN assignment_id INT NULL;
