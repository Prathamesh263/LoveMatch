-- ==========================================
-- WebRTC Signaling Schema Fix Script
-- ==========================================

-- 1. Reset Tables (DROP to ensure clean state)
DROP TABLE IF EXISTS public.ice_candidates CASCADE;
DROP TABLE IF EXISTS public.call_sessions CASCADE;
DROP TABLE IF EXISTS public.call_history CASCADE;

-- 2. Create 'call_sessions' table
CREATE TABLE public.call_sessions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE, -- Optional, can be null for direct calls if implemented
  caller_id uuid REFERENCES public.profiles(id) NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) NOT NULL,
  call_type text CHECK (call_type IN ('voice', 'video')) NOT NULL,
  status text CHECK (status IN ('ringing', 'active', 'ended', 'declined', 'missed')) DEFAULT 'ringing',
  sdp_offer jsonb,
  sdp_answer jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CRITICAL: Enable Replica Identity Full for Realtime
-- This ensures that when a row is updated/deleted, the full row is sent to listeners.
-- Without this, filtering like `filter: 'receiver_id=eq.X'` might fail on UPDATEs if receiver_id isn't changed.
ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;

-- 3. Create 'ice_candidates' table
CREATE TABLE public.ice_candidates (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid REFERENCES public.call_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL, -- The user who generated this candidate
  candidate jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- CRITICAL: Enable Replica Identity Full for Realtime
ALTER TABLE public.ice_candidates REPLICA IDENTITY FULL;

-- 4. Create 'call_history' table (Optional logging)
CREATE TABLE public.call_history (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES public.profiles(id),
  receiver_id uuid REFERENCES public.profiles(id),
  status text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- 5. Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Call Sessions: Both Caller and Receiver must see the session
CREATE POLICY "Users can view their own call sessions"
  ON public.call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert call sessions"
  ON public.call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own call sessions"
  ON public.call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ICE Candidates: Public within the session context (simplified for reliability)
-- Strictly speaking, we could restrict this, but for signaling reliability, openness for session participants is key.
CREATE POLICY "Users can view ice candidates for their calls"
  ON public.ice_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.call_sessions 
      WHERE id = ice_candidates.call_session_id 
      AND (caller_id = auth.uid() OR receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert ice candidates"
  ON public.ice_candidates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Realtime Publication
-- Ensure tables are in the publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE ice_candidates;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 8. Grant Permissions (Just in case)
GRANT ALL ON TABLE public.call_sessions TO service_role;
GRANT ALL ON TABLE public.call_sessions TO authenticated;

GRANT ALL ON TABLE public.ice_candidates TO service_role;
GRANT ALL ON TABLE public.ice_candidates TO authenticated;
