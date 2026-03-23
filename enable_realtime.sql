-- ENABLE REALTIME FOR CORE TABLES
-- Run this in Supabase SQL Editor

-- 1. Enable replication for the public schema
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- 2. Verify settings (Optional)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
