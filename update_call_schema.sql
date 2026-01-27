-- Add 'viewed' column to call_history
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;

-- Create function to count unviewed missed calls
CREATE OR REPLACE FUNCTION get_missed_calls_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM call_history
  WHERE receiver_id = user_uuid
  AND status = 'missed'
  AND viewed = FALSE;
$$ LANGUAGE SQL;
