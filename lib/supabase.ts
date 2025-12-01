import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Replace these with your Supabase project credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nqwboqajraksgdbemgzz.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2JvcWFqcmFrc2dkYmVtZ3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODU4MTQsImV4cCI6MjA4MDA2MTgxNH0.-43WQ1JvG8fkzSZovg9Dm0fP0MYXfKazNmUDH0l_c_I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  total_pushups: number;
  total_workouts: number;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  total_pushups: number;
  total_time_seconds: number;
  active_time_seconds: number;
  rest_time_seconds: number;
  pushups_per_minute: number;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  variation: string;
  xp_earned: number;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  set_number: number;
  pushups: number;
  duration_seconds: number;
  rest_after_seconds: number;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface FriendWithProfile extends Friendship {
  friend_profile?: Profile;
  user_profile?: Profile;
}

export interface Nudge {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
  from_profile?: Profile;
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  type: 'variation' | 'decoration' | 'medal';
  category: string | null;
  icon: string | null;
  unlock_level: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  data: any;
  created_at: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  equipped: boolean;
  unlocked_at: string;
  reward?: Reward;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'nudge' | 'level_up' | 'reward_unlock' | 'friend_request';
  title: string;
  body: string | null;
  data: any;
  read: boolean;
  created_at: string;
}

export interface Level {
  level: number;
  xp_required: number;
  title: string;
}
