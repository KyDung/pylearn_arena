-- The teacher runs classroom sessions, and from now on contests. Three other
-- ways of handing out work were built and never used: assignments, quick
-- sessions joined by a code, and a notification/audit pair nothing ever wrote.
-- None of them was reachable from the navigation, and every table below held
-- zero rows when this migration was written.
--
-- schema.sql is deliberately left alone. It is the historical baseline, and
-- migration 002 still has to replay against it, so the current shape of the
-- database is the baseline plus every migration, not the baseline alone.

-- v_class_stats counts assignments, so it has to lose that column before the
-- table can go. The column list changes, which CREATE OR REPLACE cannot do.
DROP VIEW IF EXISTS public.v_assignment_leaderboard;
DROP VIEW IF EXISTS public.v_class_stats;

CREATE VIEW public.v_class_stats AS
SELECT
  c.id AS class_id,
  c.name AS class_name,
  c.code AS class_code,
  u.full_name AS teacher_name,
  count(DISTINCT cm.user_id) AS student_count,
  count(DISTINCT ca.course_id) AS course_count
FROM classes c
  LEFT JOIN users u ON c.teacher_id = u.id
  LEFT JOIN class_members cm ON c.id = cm.class_id AND cm.status = 'active'
  LEFT JOIN course_access ca ON c.id = ca.class_id AND ca.is_active = true
WHERE c.status = 'active'
GROUP BY c.id, c.name, c.code, u.full_name;

-- Recreating the view resets what migration 003 set, so restore it here.
ALTER VIEW public.v_class_stats SET (security_invoker = true);

-- Children first, so no drop depends on a foreign key that is still live.
DROP TABLE IF EXISTS public.assignment_submissions;
DROP TABLE IF EXISTS public.rankings;
DROP TABLE IF EXISTS public.submissions;
DROP TABLE IF EXISTS public.assignments;

DROP TABLE IF EXISTS public.lesson_session_submissions;
DROP TABLE IF EXISTS public.lesson_sessions;

DROP TABLE IF EXISTS public.activity_log;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.class_students;
