-- ═══════════════════════════════════════════════════════════════════════
-- UNIGUILD SUPABASE SCHEMA (FINALIZED)
-- ═══════════════════════════════════════════════════════════════════════

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- CREATE EXTENSION IF NOT EXISTS "vector"; -- Uncomment if your Supabase tier supports pgvector

-- Cleanup: Drop all existing tables, functions, and triggers to start fresh
DROP TRIGGER IF EXISTS trg_notify_event_created ON events;
DROP TRIGGER IF EXISTS trg_registration_refresh_slots ON registrations;
DROP TRIGGER IF EXISTS trg_sync_event_name_title ON events;
DROP FUNCTION IF EXISTS public.notify_event_created();
DROP FUNCTION IF EXISTS public.mark_attendance(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.on_registration_changed_refresh_slots();
DROP FUNCTION IF EXISTS public.recalculate_event_slots(UUID);
DROP FUNCTION IF EXISTS public.sync_event_name_title();

DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    college TEXT DEFAULT 'Sasi Institute of Technology',
    department TEXT,
    year TEXT,
    avatar TEXT,
    avatar_url TEXT,
    skills TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active',
    phone TEXT,
    bio TEXT,
    resume_url TEXT,
    github TEXT,
    linkedin TEXT,
    website TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    projects JSONB DEFAULT '[]',
    work_experience JSONB DEFAULT '[]'
);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    name TEXT,
    date TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    location TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Event',
    image TEXT,
    banner_url TEXT,
    coordinator_email TEXT,
    registration_type TEXT DEFAULT 'single',
    max_team_size INT DEFAULT 1,
    host TEXT DEFAULT 'University',
    slots JSONB DEFAULT '{"total": 100, "filled": 0}',
    target_audience TEXT DEFAULT 'All Students',
    volunteer_ids UUID[] DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Upcoming'
);

-- 3. JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    logo TEXT,
    logo_url TEXT,
    location TEXT,
    type TEXT DEFAULT 'Full-time',
    salary TEXT,
    description TEXT,
    requirements TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    is_paid BOOLEAN DEFAULT TRUE,
    stipend TEXT,
    deadline TIMESTAMPTZ,
    app_link TEXT,
    website TEXT,
    domain TEXT,
    target_audience TEXT DEFAULT 'All Students',
    target_section TEXT DEFAULT 'All',
    target_branch TEXT DEFAULT 'All',
    target_year TEXT DEFAULT 'All',
    target_institution TEXT DEFAULT 'All',
    applications_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'all',
    title TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    priority TEXT DEFAULT 'Normal',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT,
    student_id UUID REFERENCES auth.users(id),
    student_name TEXT,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    event_name TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered',
    attended BOOLEAN DEFAULT FALSE,
    attended_at TIMESTAMPTZ,
    scanned_by TEXT,
    scanned_by_name TEXT,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_url TEXT,
    issued_at TIMESTAMPTZ,
    date TEXT,
    host TEXT,
    category TEXT,
    team_name TEXT,
    team_id TEXT,
    team_members JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    job_title TEXT,
    company TEXT,
    student_id UUID REFERENCES auth.users(id),
    student_name TEXT,
    student_email TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'applied'
);

-- 7. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    deadline TIMESTAMPTZ,
    priority TEXT DEFAULT 'Medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id),
    team_id TEXT,
    idea TEXT,
    github_repo TEXT,
    video_url TEXT,
    live_link TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SCORES TABLE
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES auth.users(id),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    score INT CHECK (score >= 0),
    feedback TEXT,
    scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id),
    receiver_id TEXT NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'coordinator', 'evaluator', 'volunteer'
    status TEXT DEFAULT 'assigned',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    performed_by UUID,
    target_user UUID REFERENCES auth.users(id),
    target_table TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- DROP ALL EXISTING POLICIES (idempotent cleanup)
DROP POLICY IF EXISTS "Anyone can view assignments" ON assignments;
DROP POLICY IF EXISTS "Coordinators can manage assignments" ON assignments;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view all other users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can create their profile" ON users;
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Creators can update their events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Creators can delete their events" ON events;
DROP POLICY IF EXISTS "Anyone can view jobs" ON jobs;
DROP POLICY IF EXISTS "Creators can update their jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON jobs;
DROP POLICY IF EXISTS "Creators can delete their jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON notifications;
DROP POLICY IF EXISTS "Users can view their own registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators can view all registrations" ON registrations;
DROP POLICY IF EXISTS "Users can create their own registration" ON registrations;
DROP POLICY IF EXISTS "Coordinators can update registrations" ON registrations;
DROP POLICY IF EXISTS "Users can view their own applications" ON applications;
DROP POLICY IF EXISTS "Recruiters can view applications" ON applications;
DROP POLICY IF EXISTS "Users can create their own application" ON applications;
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view submissions" ON submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON submissions;
DROP POLICY IF EXISTS "Evaluators can view/update scores" ON scores;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Super admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- ASSIGNMENTS POLICIES
CREATE POLICY "Anyone can view assignments" ON assignments FOR SELECT USING (true);
CREATE POLICY "Coordinators can manage assignments" ON assignments FOR ALL USING (true);

-- USERS POLICIES
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "Users can view all other users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = uid);
CREATE POLICY "Anyone can create their profile" ON users FOR INSERT WITH CHECK (true);

-- EVENTS POLICIES
CREATE POLICY "Anyone can view events" ON events FOR SELECT USING (true);
CREATE POLICY "Creators can update their events" ON events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can delete their events" ON events FOR DELETE USING (auth.uid() = created_by);

-- JOBS POLICIES
CREATE POLICY "Anyone can view jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Creators can update their jobs" ON jobs FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can create jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can delete their jobs" ON jobs FOR DELETE USING (auth.uid() = created_by);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = 'all' OR user_id = auth.uid()::text);
CREATE POLICY "Authenticated users can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can mark their own notifications as read" ON notifications FOR UPDATE USING (user_id = auth.uid()::text);

-- REGISTRATIONS POLICIES
CREATE POLICY "Users can view their own registrations" ON registrations FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Coordinators can view all registrations" ON registrations FOR SELECT USING (true);
CREATE POLICY "Users can create their own registration" ON registrations FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Coordinators can update registrations" ON registrations FOR UPDATE USING (true);

-- APPLICATIONS POLICIES
CREATE POLICY "Users can view their own applications" ON applications FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Recruiters can view applications" ON applications FOR SELECT USING (true);
CREATE POLICY "Users can create their own application" ON applications FOR INSERT WITH CHECK (auth.uid() = student_id);

-- TASKS POLICIES
CREATE POLICY "Users can view tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update tasks" ON tasks FOR UPDATE USING (true);

-- SUBMISSIONS POLICIES
CREATE POLICY "Users can view submissions" ON submissions FOR SELECT USING (true);
CREATE POLICY "Users can create submissions" ON submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

-- SCORES POLICIES
CREATE POLICY "Evaluators can view/update scores" ON scores FOR ALL USING (true);

-- MESSAGES POLICIES
CREATE POLICY "Users can view messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- AUDIT_LOGS POLICIES
CREATE POLICY "Super admins can view audit logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

-- Function: Sync event name/title
CREATE OR REPLACE FUNCTION public.sync_event_name_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NULL AND NEW.title IS NOT NULL THEN NEW.name := NEW.title; END IF;
  IF NEW.title IS NULL AND NEW.name IS NOT NULL THEN NEW.title := NEW.name; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_event_name_title BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION public.sync_event_name_title();

-- Function: Recalculate event slots
CREATE OR REPLACE FUNCTION public.recalculate_event_slots(target_event_id UUID)
RETURNS VOID AS $$
DECLARE
  registration_count INTEGER;
  existing_total INTEGER;
BEGIN
  IF target_event_id IS NULL THEN RETURN; END IF;
  
  SELECT COUNT(*)::INTEGER INTO registration_count FROM registrations
  WHERE event_id = target_event_id AND COALESCE(status, 'registered') <> 'cancelled';
  
  SELECT COALESCE((slots->>'total')::INTEGER, 100) INTO existing_total FROM events WHERE id = target_event_id;
  
  UPDATE events SET slots = jsonb_build_object(
    'filled', COALESCE(registration_count, 0),
    'total', GREATEST(COALESCE(existing_total, 100), COALESCE(registration_count, 0))
  ), updated_at = NOW() WHERE id = target_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Registration changed refresh slots
CREATE OR REPLACE FUNCTION public.on_registration_changed_refresh_slots()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN 
    PERFORM recalculate_event_slots(OLD.event_id); 
    RETURN OLD; 
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.event_id IS DISTINCT FROM NEW.event_id THEN 
    PERFORM recalculate_event_slots(OLD.event_id); 
  END IF;
  
  PERFORM recalculate_event_slots(NEW.event_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registration_refresh_slots AFTER INSERT OR UPDATE OR DELETE ON registrations
FOR EACH ROW EXECUTE FUNCTION public.on_registration_changed_refresh_slots();

-- Function: Get user role (Type Safety Fix)
CREATE OR REPLACE FUNCTION public.get_user_role(p_uid UUID)
RETURNS TEXT AS $$
  SELECT role FROM users WHERE uid = p_uid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Mark attendance (supports UUID id or 7-digit unique_id lookup)
CREATE OR REPLACE FUNCTION public.mark_attendance(
  p_registration_id TEXT,
  p_scanner_id TEXT,
  p_scanner_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  allowed BOOLEAN;
  reg_record registrations%ROWTYPE;
  v_uuid UUID;
BEGIN
  SELECT get_user_role(auth.uid()) IN ('coordinator', 'head_coordinator', 'volunteer', 'super_admin') INTO allowed;
  
  IF COALESCE(allowed, FALSE) = FALSE THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'unauthorized');
  END IF;

  -- Try UUID lookup first, then unique_id lookup
  BEGIN
    v_uuid := p_registration_id::UUID;
    SELECT * INTO reg_record FROM registrations WHERE id = v_uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    SELECT * INTO reg_record FROM registrations WHERE unique_id = p_registration_id;
  END;

  -- Fallback: also try unique_id if UUID lookup found nothing
  IF reg_record IS NULL THEN
    SELECT * INTO reg_record FROM registrations WHERE unique_id = p_registration_id;
  END IF;

  IF reg_record IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_found');
  END IF;

  IF reg_record.attended THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'reason', 'already_marked',
      'student_name', reg_record.student_name,
      'event_name', reg_record.event_name,
      'attended_at', reg_record.attended_at
    );
  END IF;

  UPDATE registrations SET 
    attended = TRUE, 
    status = 'attended', 
    attended_at = NOW(),
    scanned_by = p_scanner_id, 
    scanned_by_name = p_scanner_name, 
    updated_at = NOW()
  WHERE id = reg_record.id;

  RETURN jsonb_build_object(
    'ok', TRUE, 
    'reason', 'marked', 
    'registration_id', reg_record.id,
    'student_name', reg_record.student_name, 
    'event_name', reg_record.event_name, 
    'attended_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-generate 7-digit numeric unique_id on registration
CREATE OR REPLACE FUNCTION public.generate_unique_reg_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_id IS NULL OR NEW.unique_id = '' THEN
    NEW.unique_id := LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_unique_reg_id ON registrations;
CREATE TRIGGER trg_generate_unique_reg_id BEFORE INSERT ON registrations
FOR EACH ROW EXECUTE FUNCTION public.generate_unique_reg_id();

-- Trigger: Auto notify on event created
CREATE OR REPLACE FUNCTION public.notify_event_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, priority, read, created_at) VALUES (
    'all', 'New Event Published', COALESCE(NEW.name, NEW.title, 'New event') || ' is now live in Discover.',
    'event', 'Normal', FALSE, NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_event_created ON events;
CREATE TRIGGER trg_notify_event_created AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION public.notify_event_created();

-- Enable realtime (run in Supabase Dashboard > Database > Replication if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE users, events, jobs, notifications, registrations, applications, tasks, submissions, scores, messages;
