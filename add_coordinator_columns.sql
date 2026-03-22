-- Add coordinator_id and coordinator_name to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES users(uid);
ALTER TABLE events ADD COLUMN IF NOT EXISTS coordinator_name TEXT;

-- Add website column if it doesn't already exist (it was mentioned in previous conversations but let's be sure)
ALTER TABLE events ADD COLUMN IF NOT EXISTS website TEXT;

-- Create policy for coordinators to view their assigned events if not already covered
-- Actually, the current policies for events are "Anyone can view events", so it's fine.

-- Refresh the realtime publication to include the new columns if necessary
-- ALTER PUBLICATION supabase_realtime ADD TABLE events;
