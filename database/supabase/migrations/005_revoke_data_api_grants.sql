-- Supabase grants anon and authenticated full privileges on public by default,
-- for projects that talk to the database through its Data API. This project
-- never does: there is no @supabase/supabase-js dependency, no client import,
-- and no anon or service key anywhere. The Next.js API is the only caller and
-- it connects directly as the table owner, so it is unaffected by grants.
--
-- Row level security with no policy already denied those roles every row, but
-- leaving the grants in place made that protection depend on a single fact.
-- Adding one permissive policy to one table later would have opened it to the
-- public internet. Removing the grants makes the closed door the default.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Tables created from now on must not inherit the grants either.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
