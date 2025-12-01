-- MIGRATION SCRIPT: Run this FIRST if you already have existing data
-- This adds the new gamification columns without dropping tables

-- ============================================
-- ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================

-- Add new columns to workouts table (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='difficulty') THEN
        ALTER TABLE workouts ADD COLUMN difficulty text NOT NULL DEFAULT 'normal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='variation') THEN
        ALTER TABLE workouts ADD COLUMN variation text DEFAULT 'standard';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='xp_earned') THEN
        ALTER TABLE workouts ADD COLUMN xp_earned int NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- CREATE NEW TABLES (if they don't exist)
-- ============================================

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  total_pushups int NOT NULL DEFAULT 0,
  total_workouts int NOT NULL DEFAULT 0,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_workout_date date,
  push_token text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Nudges
CREATE TABLE IF NOT EXISTS nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text DEFAULT 'Time to do some pushups! 💪',
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  category text,
  icon text,
  unlock_level int NOT NULL DEFAULT 1,
  rarity text DEFAULT 'common',
  data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- User rewards
CREATE TABLE IF NOT EXISTS user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE NOT NULL,
  equipped boolean DEFAULT false,
  unlocked_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, reward_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Levels
CREATE TABLE IF NOT EXISTS levels (
  level int PRIMARY KEY,
  xp_required int NOT NULL,
  title text
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP AND RECREATE POLICIES
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Friendships policies  
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

CREATE POLICY "Users can view their friendships" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friendships they're part of" ON friendships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete their friendships" ON friendships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Nudges policies
DROP POLICY IF EXISTS "Users can view nudges sent to them" ON nudges;
DROP POLICY IF EXISTS "Users can send nudges to friends" ON nudges;
DROP POLICY IF EXISTS "Users can mark their nudges as read" ON nudges;

CREATE POLICY "Users can view nudges sent to them" ON nudges FOR SELECT USING (auth.uid() = to_user_id);
CREATE POLICY "Users can send nudges" ON nudges FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can mark their nudges as read" ON nudges FOR UPDATE USING (auth.uid() = to_user_id);

-- User rewards policies
DROP POLICY IF EXISTS "Users can view their own rewards" ON user_rewards;
DROP POLICY IF EXISTS "Public can view user rewards for profiles" ON user_rewards;
DROP POLICY IF EXISTS "System can insert user rewards" ON user_rewards;
DROP POLICY IF EXISTS "Users can update their rewards" ON user_rewards;

CREATE POLICY "Users can view all rewards" ON user_rewards FOR SELECT USING (true);
CREATE POLICY "Users can insert their rewards" ON user_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their rewards" ON user_rewards FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Rewards and Levels (public read)
DROP POLICY IF EXISTS "Anyone can view rewards" ON rewards;
DROP POLICY IF EXISTS "Anyone can view levels" ON levels;

CREATE POLICY "Anyone can view rewards" ON rewards FOR SELECT USING (true);
CREATE POLICY "Anyone can view levels" ON levels FOR SELECT USING (true);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert levels (ignore if already exist)
INSERT INTO levels (level, xp_required, title) VALUES
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
ON CONFLICT (level) DO NOTHING;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_to_user ON nudges(to_user_id);

