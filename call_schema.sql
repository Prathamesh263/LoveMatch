-- Create 'call_sessions' table for active signaling
create table public.call_sessions (
  id uuid not null primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  caller_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  call_type text check (call_type in ('voice', 'video')) not null,
  status text check (status in ('ringing', 'active', 'ended', 'declined', 'missed')) default 'ringing',
  sdp_offer jsonb,
  sdp_answer jsonb,
  ice_candidates jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create 'call_history' table for logging
create table public.call_history (
  id uuid not null primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete set null,
  caller_id uuid references public.profiles(id),
  receiver_id uuid references public.profiles(id),
  call_type text check (call_type in ('voice', 'video')),
  status text check (status in ('completed', 'missed', 'declined', 'failed')),
  duration integer default 0, -- in seconds
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Enable RLS
alter table public.call_sessions enable row level security;
alter table public.call_history enable row level security;

-- Policies for call_sessions
create policy "Users can view their own call sessions"
  on public.call_sessions for select
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

create policy "Users can insert call sessions"
  on public.call_sessions for insert
  with check (auth.uid() = caller_id);

create policy "Users can update their own call sessions"
  on public.call_sessions for update
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

-- Policies for call_history
create policy "Users can view their own call history"
  on public.call_history for select
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

create policy "Users can insert call history"
  on public.call_history for insert
  with check (auth.uid() = caller_id or auth.uid() = receiver_id);

-- Enable Realtime for call_sessions
alter publication supabase_realtime add table call_sessions;
