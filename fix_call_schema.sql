-- 1. Fix 'matches' table to ensure it has a unique/primary key on 'id'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'matches_pkey'
    ) THEN
        -- Attempt to add primary key if missing
        ALTER TABLE public.matches ADD PRIMARY KEY (id);
    END IF;
EXCEPTION
    WHEN others THEN
        -- If that fails (e.g. duplicate IDs), we might need to cleanup or just warn
        RAISE NOTICE 'Could not add primary key to matches: %', SQLERRM;
END $$;


-- 2. Create 'call_sessions' table
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  caller_id uuid REFERENCES public.profiles(id) NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) NOT NULL,
  call_type text CHECK (call_type IN ('voice', 'video')) NOT NULL,
  status text CHECK (status IN ('ringing', 'active', 'ended', 'declined', 'missed')) DEFAULT 'ringing',
  sdp_offer jsonb,
  sdp_answer jsonb,
  ice_candidates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create 'call_history' table
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

-- 4. Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their own call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can insert call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can update their own call sessions" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can view their own call history" ON public.call_history;
DROP POLICY IF EXISTS "Users can insert call history" ON public.call_history;

-- 6. Recreate Policies
CREATE POLICY "Users can view their own call sessions"
  ON public.call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert call sessions"
  ON public.call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own call sessions"
  ON public.call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can view their own call history"
  ON public.call_history FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert call history"
  ON public.call_history FOR INSERT
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- 7. Enable Realtime
-- Check if publication exists, if not create, else add table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table might already be in publication
END $$;
