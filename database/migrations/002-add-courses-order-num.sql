-- Migration: Add order_num to courses table
-- Run this in Supabase SQL editor

ALTER TABLE courses ADD COLUMN IF NOT EXISTS order_num integer DEFAULT 0;

-- Khởi tạo order_num theo thứ tự created_at
UPDATE courses
SET order_num = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS row_num
  FROM courses
) sub
WHERE courses.id = sub.id;

CREATE INDEX IF NOT EXISTS idx_courses_order ON courses(order_num);
