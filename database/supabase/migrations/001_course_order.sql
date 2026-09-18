-- Preserve any order already configured by an earlier manual migration.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS order_num integer;
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id)::integer AS position
  FROM public.courses
)
UPDATE public.courses c SET order_num = ordered.position
FROM ordered WHERE c.id = ordered.id AND c.order_num IS NULL;
ALTER TABLE public.courses ALTER COLUMN order_num SET DEFAULT 0;
ALTER TABLE public.courses ALTER COLUMN order_num SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_order ON public.courses(order_num);
