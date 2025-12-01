-- Pushups Tracker Database Schema (with Gamification)
-- Run this in your Supabase SQL Editor to set up the database

-- ============================================
-- CORE TABLES
-- ============================================

-- User profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  xp int not null default 0,
  level int not null default 1,
  total_pushups int not null default 0,
  total_workouts int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_workout_date date,
  push_token text, -- For push notifications
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Workouts table (updated with gamification fields)
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date timestamp with time zone default now(),
  total_pushups int not null default 0,
  total_time_seconds int not null default 0,
  active_time_seconds int not null default 0,
  rest_time_seconds int not null default 0,
  pushups_per_minute float not null default 0,
  difficulty text not null default 'normal', -- easy, normal, hard, extreme
  variation text default 'standard', -- specific pushup type
  xp_earned int not null default 0,
  created_at timestamp with time zone default now()
);

-- Sets table (individual sets within a workout)
create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade not null,
  set_number int not null,
  pushups int not null default 0,
  duration_seconds int not null default 0,
  rest_after_seconds int not null default 0
);

-- ============================================
-- FRIENDS SYSTEM
-- ============================================

-- Friendships
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  friend_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending', -- pending, accepted, blocked
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

-- Nudges (motivation reminders)
create table if not exists nudges (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references auth.users(id) on delete cascade not null,
  to_user_id uuid references auth.users(id) on delete cascade not null,
  message text default 'Time to do some pushups! 💪',
  read_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- ============================================
-- REWARDS SYSTEM
-- ============================================

-- Available rewards (reference table)
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null, -- variation, decoration, medal
  category text, -- for decorations: border, background, badge
  icon text, -- emoji or icon name
  unlock_level int not null default 1,
  rarity text default 'common', -- common, rare, epic, legendary
  data jsonb, -- extra data like colors, styles
  created_at timestamp with time zone default now()
);

-- User unlocked rewards
create table if not exists user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reward_id uuid references rewards(id) on delete cascade not null,
  equipped boolean default false, -- if user is using this reward
  unlocked_at timestamp with time zone default now(),
  unique(user_id, reward_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- nudge, level_up, reward_unlock, friend_request
  title text not null,
  body text,
  data jsonb, -- additional data
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================
-- LEVEL THRESHOLDS
-- ============================================

create table if not exists levels (
  level int primary key,
  xp_required int not null,
  title text -- e.g., "Beginner", "Warrior", "Champion"
);

-- Insert level data
insert into levels (level, xp_required, title) values
  (1, 0, 'Rookie'),
  (2, 500, 'Beginner'),
  (3, 1200, 'Amateur'),
  (4, 2500, 'Regular'),
  (5, 4500, 'Dedicated'),
  (6, 7000, 'Committed'),
  (7, 10000, 'Warrior'),
  (8, 14000, 'Fighter'),
  (9, 19000, 'Athlete'),
  (10, 25000, 'Champion'),
  (15, 60000, 'Elite'),
  (20, 120000, 'Master'),
  (25, 200000, 'Grandmaster'),
  (30, 300000, 'Legend'),
  (40, 500000, 'Mythic'),
  (50, 750000, 'Immortal')
on conflict (level) do nothing;

-- ============================================
-- DEFAULT REWARDS
-- ============================================

insert into rewards (name, description, type, unlock_level, rarity, icon) values
  -- Pushup Variations
  ('Standard Push-up', 'The classic push-up', 'variation', 1, 'common', '💪'),
  ('Knee Push-up', 'Easier variation on knees', 'variation', 1, 'common', '🦵'),
  ('Wide Push-up', 'Hands wider than shoulders', 'variation', 2, 'common', '↔️'),
  ('Diamond Push-up', 'Hands form a diamond shape', 'variation', 3, 'rare', '💎'),
  ('Incline Push-up', 'Hands elevated on surface', 'variation', 4, 'common', '📐'),
  ('Decline Push-up', 'Feet elevated', 'variation', 6, 'rare', '⬇️'),
  ('Archer Push-up', 'One arm extended to side', 'variation', 10, 'epic', '🏹'),
  ('Staggered Push-up', 'One hand forward, one back', 'variation', 8, 'rare', '🔀'),
  ('Explosive Push-up', 'Push off the ground', 'variation', 12, 'epic', '💥'),
  ('Clap Push-up', 'Clap hands mid-air', 'variation', 15, 'epic', '👏'),
  ('Weighted Push-up', 'With added weight', 'variation', 10, 'rare', '🏋️'),
  ('One-Arm Push-up', 'Ultimate single arm', 'variation', 25, 'legendary', '☝️'),
  ('Planche Push-up', 'Elevated planche position', 'variation', 30, 'legendary', '🤸'),
  
  -- Medals
  ('Bronze Medal', 'Reached level 5', 'medal', 5, 'common', '🥉'),
  ('Silver Medal', 'Reached level 10', 'medal', 10, 'rare', '🥈'),
  ('Gold Medal', 'Reached level 20', 'medal', 20, 'epic', '🥇'),
  ('Diamond Medal', 'Reached level 30', 'medal', 30, 'legendary', '💎'),
  ('Pushup Master', 'Reached level 50', 'medal', 50, 'legendary', '👑'),
  
  -- Profile Decorations
  ('Bronze Border', 'Bronze profile border', 'decoration', 5, 'common', '🟤'),
  ('Silver Border', 'Silver profile border', 'decoration', 10, 'rare', '⚪'),
  ('Gold Border', 'Gold profile border', 'decoration', 20, 'epic', '🟡'),
  ('Fire Border', 'Animated fire border', 'decoration', 25, 'epic', '🔥'),
  ('Diamond Border', 'Diamond profile border', 'decoration', 30, 'legendary', '💠'),
  ('Rainbow Border', 'Animated rainbow border', 'decoration', 40, 'legendary', '🌈'),
  
  -- Streak Badges
  ('7 Day Streak', 'Worked out 7 days in a row', 'medal', 1, 'common', '7️⃣'),
  ('30 Day Streak', 'Worked out 30 days in a row', 'medal', 1, 'rare', '📅'),
  ('100 Day Streak', 'Worked out 100 days in a row', 'medal', 1, 'epic', '💯'),
  ('365 Day Streak', 'Worked out a full year', 'medal', 1, 'legendary', '🗓️')
on conflict do nothing;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table workouts enable row level security;
alter table sets enable row level security;
alter table friendships enable row level security;
alter table nudges enable row level security;
alter table user_rewards enable row level security;
alter table notifications enable row level security;
alter table rewards enable row level security;
alter table levels enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- Workouts policies
create policy "Users can view their own workouts"
  on workouts for select using (auth.uid() = user_id);

create policy "Friends can view workout summaries"
  on workouts for select using (
    exists (
      select 1 from friendships
      where friendships.status = 'accepted'
      and ((friendships.user_id = auth.uid() and friendships.friend_id = workouts.user_id)
        or (friendships.friend_id = auth.uid() and friendships.user_id = workouts.user_id))
    )
  );

create policy "Users can insert their own workouts"
  on workouts for insert with check (auth.uid() = user_id);

create policy "Users can update their own workouts"
  on workouts for update using (auth.uid() = user_id);

create policy "Users can delete their own workouts"
  on workouts for delete using (auth.uid() = user_id);

-- Sets policies
create policy "Users can view sets of their workouts"
  on sets for select using (
    exists (select 1 from workouts where workouts.id = sets.workout_id and workouts.user_id = auth.uid())
  );

create policy "Users can insert sets for their workouts"
  on sets for insert with check (
    exists (select 1 from workouts where workouts.id = sets.workout_id and workouts.user_id = auth.uid())
  );

create policy "Users can update sets of their workouts"
  on sets for update using (
    exists (select 1 from workouts where workouts.id = sets.workout_id and workouts.user_id = auth.uid())
  );

create policy "Users can delete sets of their workouts"
  on sets for delete using (
    exists (select 1 from workouts where workouts.id = sets.workout_id and workouts.user_id = auth.uid())
  );

-- Friendships policies
create policy "Users can view their friendships"
  on friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can send friend requests"
  on friendships for insert with check (auth.uid() = user_id);

create policy "Users can update friendships they're part of"
  on friendships for update using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can delete their friendships"
  on friendships for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Nudges policies
create policy "Users can view nudges sent to them"
  on nudges for select using (auth.uid() = to_user_id);

create policy "Users can send nudges to friends"
  on nudges for insert with check (
    auth.uid() = from_user_id
    and exists (
      select 1 from friendships
      where friendships.status = 'accepted'
      and ((friendships.user_id = auth.uid() and friendships.friend_id = nudges.to_user_id)
        or (friendships.friend_id = auth.uid() and friendships.user_id = nudges.to_user_id))
    )
  );

create policy "Users can mark their nudges as read"
  on nudges for update using (auth.uid() = to_user_id);

-- User rewards policies
create policy "Users can view their own rewards"
  on user_rewards for select using (auth.uid() = user_id);

create policy "Public can view user rewards for profiles"
  on user_rewards for select using (true);

create policy "System can insert user rewards"
  on user_rewards for insert with check (auth.uid() = user_id);

create policy "Users can update their rewards"
  on user_rewards for update using (auth.uid() = user_id);

-- Notifications policies
create policy "Users can view their notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "Users can update their notifications"
  on notifications for update using (auth.uid() = user_id);

create policy "System can insert notifications"
  on notifications for insert with check (true);

-- Rewards and Levels are public reference tables
create policy "Anyone can view rewards" on rewards for select using (true);
create policy "Anyone can view levels" on levels for select using (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'name'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update profile stats after workout
create or replace function public.update_profile_stats()
returns trigger as $$
declare
  current_xp int;
  current_level int;
  new_level int;
  streak int;
begin
  -- Get current profile stats
  select xp, level, current_streak into current_xp, current_level, streak
  from profiles where id = new.user_id;

  -- Calculate new streak
  if exists (
    select 1 from profiles
    where id = new.user_id
    and last_workout_date = current_date - interval '1 day'
  ) then
    streak := streak + 1;
  elsif exists (
    select 1 from profiles
    where id = new.user_id
    and last_workout_date = current_date
  ) then
    -- Same day, don't change streak
    streak := streak;
  else
    streak := 1;
  end if;

  -- Calculate new level
  select max(level) into new_level from levels where xp_required <= (current_xp + new.xp_earned);
  if new_level is null then new_level := 1; end if;

  -- Update profile
  update profiles set
    xp = xp + new.xp_earned,
    level = new_level,
    total_pushups = total_pushups + new.total_pushups,
    total_workouts = total_workouts + 1,
    current_streak = streak,
    longest_streak = greatest(longest_streak, streak),
    last_workout_date = current_date,
    updated_at = now()
  where id = new.user_id;

  -- Check for new level rewards
  if new_level > current_level then
    insert into notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'level_up',
      'Level Up! 🎉',
      'You reached level ' || new_level || '!',
      jsonb_build_object('new_level', new_level, 'old_level', current_level)
    );

    -- Unlock level rewards
    insert into user_rewards (user_id, reward_id)
    select new.user_id, r.id
    from rewards r
    where r.unlock_level <= new_level
    and not exists (
      select 1 from user_rewards ur
      where ur.user_id = new.user_id and ur.reward_id = r.id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for workout completion
drop trigger if exists on_workout_created on workouts;
create trigger on_workout_created
  after insert on workouts
  for each row execute procedure public.update_profile_stats();

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_workouts_user_id on workouts(user_id);
create index if not exists idx_workouts_created_at on workouts(created_at desc);
create index if not exists idx_sets_workout_id on sets(workout_id);
create index if not exists idx_profiles_username on profiles(username);
create index if not exists idx_friendships_user_id on friendships(user_id);
create index if not exists idx_friendships_friend_id on friendships(friend_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_nudges_to_user on nudges(to_user_id);
