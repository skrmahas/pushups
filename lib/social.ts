// Social Features - Workout Feed, Comments, Likes
import { supabase, Profile, Workout } from './supabase';

export interface WorkoutComment {
  id: string;
  workout_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface WorkoutLike {
  id: string;
  workout_id: string;
  user_id: string;
  created_at: string;
}

export interface WorkoutWithSocial extends Workout {
  profile?: Profile;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export type WorkoutPrivacy = 'public' | 'friends' | 'private';

/**
 * Get user's workout feed (their own workouts)
 */
export async function getUserWorkoutFeed(userId: string, limit: number = 20): Promise<WorkoutWithSocial[]> {
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workout feed:', error);
    return [];
  }

  // Get likes and comments count for each workout
  const workoutsWithSocial: WorkoutWithSocial[] = [];
  for (const workout of workouts || []) {
    const [likesResult, commentsResult] = await Promise.all([
      supabase
        .from('workout_likes')
        .select('*', { count: 'exact', head: true })
        .eq('workout_id', workout.id),
      supabase
        .from('workout_comments')
        .select('*', { count: 'exact', head: true })
        .eq('workout_id', workout.id),
    ]);

    workoutsWithSocial.push({
      ...workout,
      likes_count: likesResult.count || 0,
      comments_count: commentsResult.count || 0,
    });
  }

  return workoutsWithSocial;
}

/**
 * Get a friend's public workout feed
 */
export async function getFriendWorkoutFeed(
  friendId: string, 
  currentUserId: string,
  limit: number = 20
): Promise<WorkoutWithSocial[]> {
  // Get workouts that are public or friends-only (if we're friends)
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', friendId)
    .in('privacy', ['public', 'friends'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching friend workout feed:', error);
    return [];
  }

  // Get likes and comments count, and check if current user liked
  const workoutsWithSocial: WorkoutWithSocial[] = [];
  for (const workout of workouts || []) {
    const [likesResult, commentsResult, isLikedResult] = await Promise.all([
      supabase
        .from('workout_likes')
        .select('*', { count: 'exact', head: true })
        .eq('workout_id', workout.id),
      supabase
        .from('workout_comments')
        .select('*', { count: 'exact', head: true })
        .eq('workout_id', workout.id),
      supabase
        .from('workout_likes')
        .select('id')
        .eq('workout_id', workout.id)
        .eq('user_id', currentUserId)
        .single(),
    ]);

    workoutsWithSocial.push({
      ...workout,
      likes_count: likesResult.count || 0,
      comments_count: commentsResult.count || 0,
      is_liked: !!isLikedResult.data,
    });
  }

  return workoutsWithSocial;
}

/**
 * Get workout details with social info
 */
export async function getWorkoutWithSocial(
  workoutId: string, 
  currentUserId: string
): Promise<WorkoutWithSocial | null> {
  const { data: workout, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (error || !workout) {
    console.error('Error fetching workout:', error);
    return null;
  }

  // Get profile, likes count, comments count, and if user liked
  const [profileResult, likesResult, commentsResult, isLikedResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', workout.user_id).single(),
    supabase.from('workout_likes').select('*', { count: 'exact', head: true }).eq('workout_id', workoutId),
    supabase.from('workout_comments').select('*', { count: 'exact', head: true }).eq('workout_id', workoutId),
    supabase.from('workout_likes').select('id').eq('workout_id', workoutId).eq('user_id', currentUserId).single(),
  ]);

  return {
    ...workout,
    profile: profileResult.data || undefined,
    likes_count: likesResult.count || 0,
    comments_count: commentsResult.count || 0,
    is_liked: !!isLikedResult.data,
  };
}

/**
 * Like or unlike a workout
 */
export async function toggleWorkoutLike(userId: string, workoutId: string): Promise<boolean> {
  // Check if already liked
  const { data: existing } = await supabase
    .from('workout_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('workout_id', workoutId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('workout_likes')
      .delete()
      .eq('id', existing.id);
    
    return !error;
  } else {
    // Like
    const { error } = await supabase
      .from('workout_likes')
      .insert({ user_id: userId, workout_id: workoutId });
    
    return !error;
  }
}

/**
 * Get comments for a workout
 */
export async function getWorkoutComments(workoutId: string): Promise<WorkoutComment[]> {
  const { data, error } = await supabase
    .from('workout_comments')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

/**
 * Add a comment to a workout
 */
export async function addComment(
  userId: string, 
  workoutId: string, 
  text: string
): Promise<WorkoutComment | null> {
  const { data, error } = await supabase
    .from('workout_comments')
    .insert({
      user_id: userId,
      workout_id: workoutId,
      text: text.trim(),
    })
    .select(`
      *,
      profile:profiles(*)
    `)
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }

  return data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('workout_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Update workout privacy setting
 */
export async function updateWorkoutPrivacy(
  workoutId: string, 
  userId: string, 
  privacy: WorkoutPrivacy
): Promise<boolean> {
  const { error } = await supabase
    .from('workouts')
    .update({ privacy })
    .eq('id', workoutId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating workout privacy:', error);
    return false;
  }

  return true;
}

/**
 * Get social stats for a user
 */
export async function getUserSocialStats(userId: string): Promise<{
  totalLikesReceived: number;
  totalCommentsReceived: number;
}> {
  // Get all user's workouts
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId);

  if (!workouts || workouts.length === 0) {
    return { totalLikesReceived: 0, totalCommentsReceived: 0 };
  }

  const workoutIds = workouts.map(w => w.id);

  const [likesResult, commentsResult] = await Promise.all([
    supabase
      .from('workout_likes')
      .select('*', { count: 'exact', head: true })
      .in('workout_id', workoutIds),
    supabase
      .from('workout_comments')
      .select('*', { count: 'exact', head: true })
      .in('workout_id', workoutIds),
  ]);

  return {
    totalLikesReceived: likesResult.count || 0,
    totalCommentsReceived: commentsResult.count || 0,
  };
}

