-- Create user_preferences table if not exists
create table if not exists public.user_preferences (
  user_id uuid references public.profiles(id) primary key,
  ringtone text default 'incoming-call',
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_preferences enable row level security;

-- Policies
create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id)
  on conflict (user_id) do update set ringtone = excluded.ringtone, updated_at = now();

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);
