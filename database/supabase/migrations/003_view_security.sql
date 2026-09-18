-- Custom JWT auth is enforced by the Next.js API using its server DB connection.
-- Supabase API roles must not bypass table RLS through owner-rights views.
ALTER VIEW public.v_class_stats SET (security_invoker = true);
ALTER VIEW public.v_assignment_leaderboard SET (security_invoker = true);
