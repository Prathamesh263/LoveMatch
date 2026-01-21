-- Enable Supabase Realtime for the 'messages' table
-- This is often required for the client to receive 'INSERT' events.

create publication supabase_realtime with (publish = 'insert, update, delete');

alter publication supabase_realtime add table messages;

-- If the publication already exists, the above might fail or produce a warning.
-- A safer approach if you are unsure if 'supabase_realtime' exists:
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
--     CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
--   ELSE
--     ALTER PUBLICATION supabase_realtime ADD TABLE messages;
--   END IF;
-- END
-- $$;

-- Simpler approach that usually works on standard Supabase setups:
alter publication supabase_realtime add table messages;
