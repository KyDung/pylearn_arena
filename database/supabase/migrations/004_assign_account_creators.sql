-- Accounts created before created_by was populated are invisible to teachers,
-- because the teacher account listing scopes to accounts a teacher created.
-- Backfill an owner without guessing: a student belongs to exactly one class in
-- the audited data, so the class owner is the creator. DISTINCT ON keeps the
-- result deterministic if a student is ever in several classes.
UPDATE public.users u
SET created_by = owner.teacher_id
FROM (
  SELECT DISTINCT ON (cm.user_id) cm.user_id, c.teacher_id
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.status = 'active'
  ORDER BY cm.user_id, cm.class_id
) owner
WHERE u.id = owner.user_id
  AND u.created_by IS NULL
  AND u.role = 'student'
  AND owner.teacher_id IS NOT NULL
  AND owner.teacher_id <> u.id;

-- Teachers, and any student who belongs to no class, fall back to the first
-- admin. Nobody becomes their own creator.
UPDATE public.users u
SET created_by = (SELECT id FROM public.users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE u.created_by IS NULL
  AND u.role <> 'admin'
  AND u.id <> (SELECT id FROM public.users WHERE role = 'admin' ORDER BY id LIMIT 1);

-- The root admin keeps created_by NULL on purpose: no account created it.
