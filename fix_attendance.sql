-- Fix for mark_attendance RPC
-- This script defines a robust mark_attendance function that handles both UUID registration IDs 
-- and 7-digit unique registration IDs.

CREATE OR REPLACE FUNCTION mark_attendance(
  p_registration_id TEXT,
  p_scanner_id UUID,
  p_scanner_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg RECORD;
  v_event_name TEXT;
BEGIN
  -- 1. Find the registration by either UUID or unique_id (7 digits)
  -- Try UUID first
  IF p_registration_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_reg 
    FROM registrations 
    WHERE id = p_registration_id::UUID
    LIMIT 1;
  ELSE
    -- Try unique_id
    SELECT * INTO v_reg 
    FROM registrations 
    WHERE unique_id = p_registration_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- 2. Check if already marked
  IF v_reg.attended THEN
    -- Get event name for better error message
    SELECT name INTO v_event_name FROM events WHERE id = v_reg.event_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'already_marked', 'event_name', COALESCE(v_event_name, 'this event'));
  END IF;

  -- 3. Mark as attended
  UPDATE registrations 
  SET 
    attended = true, 
    attended_at = NOW()
    -- Note: If you want to track who marked it, add these columns to your table first:
    -- marked_by_id = p_scanner_id,
    -- marked_by_name = p_scanner_name
  WHERE id = v_reg.id;

  -- 4. Update event slots (increment filled)
  UPDATE events 
  SET slots = jsonb_set(
    COALESCE(slots, '{"filled": 0, "total": 100}'::jsonb), 
    '{filled}', 
    (COALESCE((slots->>'filled')::int, 0) + 1)::text::jsonb
  )
  WHERE id = v_reg.event_id;

  -- Get event name for success message
  SELECT name INTO v_event_name FROM events WHERE id = v_reg.event_id;

  RETURN jsonb_build_object(
    'ok', true, 
    'student_name', COALESCE(v_reg.full_name, 'Student'), 
    'event_name', COALESCE(v_event_name, 'Event')
  );
END;
$$;
