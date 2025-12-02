import { ensureProfileExists, getProfile } from './friends';
import { calculateXP, Difficulty, getLevelFromXP } from './gamification';
import { SetData } from './store';
import { Profile, Reward, supabase, UserReward, Workout, WorkoutSet } from './supabase';
import { ExerciseType } from './exercises';

export async function saveWorkout(
  userId: string,
  sets: SetData[],
  workoutStartTime: number,
  difficulty: Difficulty = 'normal',
  variation: string = 'standard',
  exerciseType: ExerciseType = 'pushups',
  isDailyGoalCompleted: boolean = false,
  dailyGoalBonusXP: number = 0,
  planDay?: number
): Promise<Workout | null> {
  // Ensure profile exists first
  let profile = await getProfile(userId);
  if (!profile) {
    profile = await ensureProfileExists(userId);
  }
  
  const currentStreak = profile?.current_streak || 0;
  const currentXP = profile?.xp || 0;

  const totalReps = sets.reduce((sum, set) => sum + set.pushups, 0);
  const activeTimeSeconds = sets.reduce((sum, set) => sum + set.durationSeconds, 0);
  const restTimeSeconds = sets.reduce((sum, set) => sum + set.restAfterSeconds, 0);
  const totalTimeSeconds = Math.round((Date.now() - workoutStartTime) / 1000);
  const repsPerMinute = activeTimeSeconds > 0 
    ? (totalReps / activeTimeSeconds) * 60 
    : 0;

  // Calculate XP earned (with variation multiplier)
  const xpCalc = calculateXP(totalReps, repsPerMinute, difficulty, currentStreak, variation);
  const totalXPEarned = xpCalc.totalXP + dailyGoalBonusXP;

  // Insert workout
  console.log('Attempting to save workout for user:', userId);
  console.log('Workout data:', { totalReps, difficulty, variation, exerciseType, xp: totalXPEarned, dailyGoal: isDailyGoalCompleted });
  
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      total_pushups: totalReps,
      total_time_seconds: totalTimeSeconds,
      active_time_seconds: activeTimeSeconds,
      rest_time_seconds: restTimeSeconds,
      pushups_per_minute: Math.round(repsPerMinute * 10) / 10,
      difficulty,
      variation,
      xp_earned: totalXPEarned,
      exercise_type: exerciseType,
      is_daily_goal_completed: isDailyGoalCompleted,
      daily_goal_bonus_xp: dailyGoalBonusXP,
      plan_day: planDay || null,
      privacy: 'friends',
    })
    .select()
    .single();

  if (workoutError) {
    console.error('Error saving workout:', workoutError);
    console.error('Error code:', workoutError.code);
    console.error('Error message:', workoutError.message);
    console.error('Error details:', workoutError.details);
    return null;
  }
  
  console.log('Workout saved successfully:', workout.id);

  // Insert sets
  const setsToInsert = sets.map((set) => ({
    workout_id: workout.id,
    set_number: set.setNumber,
    pushups: set.pushups,
    duration_seconds: set.durationSeconds,
    rest_after_seconds: set.restAfterSeconds,
  }));

  const { error: setsError } = await supabase
    .from('sets')
    .insert(setsToInsert);

  if (setsError) {
    console.error('Error saving sets:', setsError);
  }

  // Manually update profile stats (in case trigger doesn't work)
  const newXP = currentXP + totalXPEarned;
  const newLevel = getLevelFromXP(newXP);
  
  // Calculate new streak
  const today = new Date().toISOString().split('T')[0];
  const lastWorkoutDate = profile?.last_workout_date;
  let newStreak = 1;
  
  if (lastWorkoutDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastWorkoutDate === today) {
      // Same day workout, keep streak
      newStreak = currentStreak;
    } else if (lastWorkoutDate === yesterdayStr) {
      // Consecutive day, increase streak
      newStreak = currentStreak + 1;
    }
    // Otherwise reset to 1
  }

  console.log('Updating profile with XP:', newXP, 'Level:', newLevel);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      xp: newXP,
      level: newLevel,
      total_pushups: (profile?.total_pushups || 0) + totalPushups,
      total_workouts: (profile?.total_workouts || 0) + 1,
      current_streak: newStreak,
      longest_streak: Math.max(profile?.longest_streak || 0, newStreak),
      last_workout_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile stats:', profileError);
    console.error('Profile error details:', profileError.message, profileError.details);
  } else {
    console.log('Profile updated successfully');
  }

  return workout;
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workouts:', error);
    return [];
  }

  return data || [];
}

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('workout_id', workoutId)
    .order('set_number', { ascending: true });

  if (error) {
    console.error('Error fetching sets:', error);
    return [];
  }

  return data || [];
}

export async function getWorkoutStats(userId: string) {
  const workouts = await getWorkouts(userId);
  const profile = await getProfile(userId);
  
  if (workouts.length === 0) {
    return {
      totalWorkouts: 0,
      bestSession: 0,
      averagePushups: 0,
      averageRestTime: 0,
      currentStreak: profile?.current_streak || 0,
      maxPushupsInOneSet: 0,
      totalXP: profile?.xp || 0,
      level: profile?.level || 1,
    };
  }

  // Calculate stats
  const totalWorkouts = workouts.length;
  const bestSession = Math.max(...workouts.map(w => w.total_pushups));
  const averagePushups = Math.round(
    workouts.reduce((sum, w) => sum + w.total_pushups, 0) / totalWorkouts
  );
  const averageRestTime = Math.round(
    workouts.reduce((sum, w) => sum + w.rest_time_seconds, 0) / totalWorkouts
  );

  // Get max pushups in one set
  let maxPushupsInOneSet = 0;
  for (const workout of workouts.slice(0, 10)) {
    const sets = await getWorkoutSets(workout.id);
    const maxInWorkout = Math.max(...sets.map(s => s.pushups), 0);
    if (maxInWorkout > maxPushupsInOneSet) {
      maxPushupsInOneSet = maxInWorkout;
    }
  }

  return {
    totalWorkouts,
    bestSession,
    averagePushups,
    averageRestTime,
    currentStreak: profile?.current_streak || 0,
    maxPushupsInOneSet,
    totalXP: profile?.xp || 0,
    level: profile?.level || 1,
  };
}

export async function getUserRewards(userId: string): Promise<UserReward[]> {
  const { data, error } = await supabase
    .from('user_rewards')
    .select(`
      *,
      reward:rewards(*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user rewards:', error);
    return [];
  }

  return data || [];
}

export async function getAllRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('unlock_level', { ascending: true });

  if (error) {
    console.error('Error fetching rewards:', error);
    return [];
  }

  return data || [];
}

export async function equipReward(userId: string, rewardId: string, type: string): Promise<boolean> {
  // Unequip all rewards of the same type first
  const { data: userRewards } = await supabase
    .from('user_rewards')
    .select('*, reward:rewards(*)')
    .eq('user_id', userId)
    .eq('equipped', true);

  if (userRewards) {
    for (const ur of userRewards) {
      if (ur.reward?.type === type) {
        await supabase
          .from('user_rewards')
          .update({ equipped: false })
          .eq('id', ur.id);
      }
    }
  }

  // Equip the selected reward
  const { error } = await supabase
    .from('user_rewards')
    .update({ equipped: true })
    .eq('user_id', userId)
    .eq('reward_id', rewardId);

  if (error) {
    console.error('Error equipping reward:', error);
    return false;
  }

  return true;
}

export async function getLeaderboard(limit: number = 20): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data || [];
}

export async function getFriendsLeaderboard(userId: string): Promise<Profile[]> {
  // Get friend IDs
  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (!friendships || friendships.length === 0) {
    // Return just the user if no friends
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);
    return profile || [];
  }

  // Get all friend IDs plus the user
  const friendIds = new Set<string>([userId]);
  friendships.forEach(f => {
    friendIds.add(f.user_id);
    friendIds.add(f.friend_id);
  });

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', Array.from(friendIds))
    .order('xp', { ascending: false });

  if (error) {
    console.error('Error fetching friends leaderboard:', error);
    return [];
  }

  return data || [];
}
