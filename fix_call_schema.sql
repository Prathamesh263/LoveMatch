-- 1. Ensure 'matches' has primary key (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'matches_pkey'
    ) THEN
        ALTER TABLE public.matches ADD PRIMARY KEY (id);
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Create 'call_sessions' table (if not exists)
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  caller_id uuid REFERENCES public.profiles(id) NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) NOT NULL,
  call_type text CHECK (call_type IN ('voice', 'video')) NOT NULL,
  status text CHECK (status IN ('ringing', 'active', 'ended', 'declined', 'missed')) DEFAULT 'ringing',
  sdp_offer jsonb,
  sdp_answer jsonb,
  -- We will ignore the old ice_candidates array column in favor of the new table
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create 'ice_candidates' table for robust signaling
CREATE TABLE IF NOT EXISTS public.ice_candidates (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid REFERENCES public.call_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL, -- The user who generated this candidate
  candidate jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Create 'call_history' table
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  caller_id uuid REFERENCES public.profiles(id),
  receiver_id uuid REFERENCES public.profiles(id),
  call_type text CHECK (call_type IN ('voice', 'video')),
  status text CHECK (status IN ('completed', 'missed', 'declined', 'failed')),
  duration integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- 5. Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- 6. Policies (Drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can insert call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can update their own call sessions" ON public.call_sessions;

DROP POLICY IF EXISTS "Users can view their own ice candidates" ON public.ice_candidates;
DROP POLICY IF EXISTS "Users can insert ice candidates" ON public.ice_candidates;

DROP POLICY IF EXISTS "Users can view their own call history" ON public.call_history;
DROP POLICY IF EXISTS "Users can insert call history" ON public.call_history;

-- Call Sessions Policies
CREATE POLICY "Users can view their own call sessions"
  ON public.call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert call sessions"
  ON public.call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own call sessions"
  ON public.call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ICE Candidates Policies
CREATE POLICY "Users can view their own ice candidates"
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

-- Call History Policies
CREATE POLICY "Users can view their own call history"
  ON public.call_history FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert call history"
  ON public.call_history FOR INSERT
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- 7. Enable Realtime
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
