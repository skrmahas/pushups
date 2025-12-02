// Workout Plan Database Operations
import { ExerciseType } from './exercises';
import { Difficulty } from './gamification';
import { generateWorkoutPlan, Intensity, PlanDay, Timeline, WorkoutPlan } from './plan-generator';
import { supabase } from './supabase';

export interface DBWorkoutPlan {
  id: string;
  user_id: string;
  exercise_type: ExerciseType;
  intensity: Intensity;
  timeline_months: number;
  target_goal: number;
  starting_max_reps: number | null;
  total_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBPlanDay {
  id: string;
  plan_id: string;
  day_number: number;
  is_rest_day: boolean;
  target_total_reps: number;
  recommended_sets: number[];
  notes: string | null;
}

// Daily goal bonus XP configuration
export const DAILY_GOAL_BONUS = {
  base: 100,
  difficultyMultipliers: {
    easy: 0.75,
    normal: 1.0,
    hard: 1.5,
    extreme: 2.0,
  } as Record<Difficulty, number>,
  streakBonusPerDay: 10,
  maxStreakBonus: 100,
};

/**
 * Create a new workout plan for a user
 */
export async function createWorkoutPlan(
  userId: string,
  exerciseType: ExerciseType,
  intensity: Intensity,
  timelineMonths: Timeline,
  maxReps?: number
): Promise<string | null> {
  // Generate the plan
  const plan = generateWorkoutPlan({
    exerciseType,
    intensity,
    timelineMonths,
    maxReps,
  });

  // Deactivate any existing plans
  await supabase
    .from('workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId);

  // Insert the plan
  const { data: planData, error: planError } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      exercise_type: exerciseType,
      intensity,
      timeline_months: timelineMonths,
      target_goal: plan.targetGoal,
      starting_max_reps: maxReps || null,
      total_days: plan.totalDays,
      is_active: true,
    })
    .select()
    .single();

  if (planError || !planData) {
    console.error('Error creating workout plan:', planError);
    return null;
  }

  // Insert all plan days
  const planDaysToInsert = plan.days.map(day => ({
    plan_id: planData.id,
    day_number: day.dayNumber,
    is_rest_day: day.isRestDay,
    target_total_reps: day.targetTotalReps,
    recommended_sets: day.recommendedSets,
    notes: day.notes || null,
  }));

  // Insert in batches to avoid hitting limits
  const batchSize = 50;
  for (let i = 0; i < planDaysToInsert.length; i += batchSize) {
    const batch = planDaysToInsert.slice(i, i + batchSize);
    const { error: daysError } = await supabase
      .from('plan_days')
      .insert(batch);

    if (daysError) {
      console.error('Error inserting plan days batch:', daysError);
    }
  }

  // Update user profile with the new plan
  await supabase
    .from('profiles')
    .update({
      current_plan_id: planData.id,
      current_plan_day: 1,
      exercise_type: exerciseType,
      onboarding_completed: true,
    })
    .eq('id', userId);

  return planData.id;
}

/**
 * Get user's active workout plan
 */
export async function getActiveWorkoutPlan(userId: string): Promise<DBWorkoutPlan | null> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching active workout plan:', error);
    return null;
  }

  return data;
}

/**
 * Get a specific day from the user's plan
 */
export async function getPlanDayForUser(userId: string, dayNumber: number): Promise<DBPlanDay | null> {
  // Get user's active plan
  const plan = await getActiveWorkoutPlan(userId);
  if (!plan) return null;

  const { data, error } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('day_number', dayNumber)
    .single();

  if (error) {
    console.error('Error fetching plan day:', error);
    return null;
  }

  return data;
}

/**
 * Get today's workout plan for user
 */
export async function getTodaysPlan(userId: string): Promise<{
  planDay: DBPlanDay | null;
  plan: DBWorkoutPlan | null;
  dayNumber: number;
}> {
  // Get user's profile to find current day
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('current_plan_day, current_plan_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.current_plan_id) {
    return { planDay: null, plan: null, dayNumber: 1 };
  }

  const dayNumber = profile.current_plan_day || 1;
  const planDay = await getPlanDayForUser(userId, dayNumber);
  const plan = await getActiveWorkoutPlan(userId);

  return { planDay, plan, dayNumber };
}

/**
 * Advance user to the next day in their plan
 */
export async function advancePlanDay(userId: string): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_plan_day, current_plan_id')
    .eq('id', userId)
    .single();

  if (!profile) return 1;

  const plan = await getActiveWorkoutPlan(userId);
  if (!plan) return 1;

  const nextDay = Math.min((profile.current_plan_day || 1) + 1, plan.total_days);

  await supabase
    .from('profiles')
    .update({ current_plan_day: nextDay })
    .eq('id', userId);

  return nextDay;
}

/**
 * Check if workout meets daily goal requirements
 */
export function checkDailyGoalCompletion(
  totalReps: number,
  planDay: DBPlanDay | null
): boolean {
  if (!planDay || planDay.is_rest_day) return false;
  
  // User must complete at least 90% of target to count as completion
  const threshold = planDay.target_total_reps * 0.9;
  return totalReps >= threshold;
}

/**
 * Calculate bonus XP for completing daily goal
 */
export function calculateDailyGoalBonus(
  difficulty: Difficulty,
  currentStreak: number,
  planDay: DBPlanDay | null
): number {
  if (!planDay || planDay.is_rest_day) return 0;

  const base = DAILY_GOAL_BONUS.base;
  const difficultyMultiplier = DAILY_GOAL_BONUS.difficultyMultipliers[difficulty];
  const streakBonus = Math.min(
    currentStreak * DAILY_GOAL_BONUS.streakBonusPerDay,
    DAILY_GOAL_BONUS.maxStreakBonus
  );

  return Math.floor(base * difficultyMultiplier + streakBonus);
}

/**
 * Get plan progress statistics
 */
export async function getPlanProgress(userId: string): Promise<{
  currentDay: number;
  totalDays: number;
  percentComplete: number;
  workoutsCompleted: number;
  daysRemaining: number;
  isOnTrack: boolean;
} | null> {
  const { plan, dayNumber } = await getTodaysPlan(userId);
  if (!plan) return null;

  // Count completed workouts
  const { count } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', plan.created_at);

  const workoutsCompleted = count || 0;
  const percentComplete = Math.round((dayNumber / plan.total_days) * 100);
  const daysRemaining = plan.total_days - dayNumber;

  // Calculate expected workouts based on intensity
  const workoutDaysPerWeek = plan.intensity === 'beginner' ? 4 : plan.intensity === 'intermediate' ? 5 : 6;
  const weeksElapsed = Math.floor(dayNumber / 7);
  const expectedWorkouts = weeksElapsed * workoutDaysPerWeek;
  const isOnTrack = expectedWorkouts === 0 || workoutsCompleted >= expectedWorkouts * 0.8;

  return {
    currentDay: dayNumber,
    totalDays: plan.total_days,
    percentComplete,
    workoutsCompleted,
    daysRemaining,
    isOnTrack,
  };
}

/**
 * Get upcoming days preview (next 7 days)
 */
export async function getUpcomingDays(userId: string): Promise<DBPlanDay[]> {
  const { plan, dayNumber } = await getTodaysPlan(userId);
  if (!plan) return [];

  const { data, error } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .gte('day_number', dayNumber)
    .lte('day_number', dayNumber + 6)
    .order('day_number', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming days:', error);
    return [];
  }

  return data || [];
}

/**
 * Reset plan to a specific day (for adjustments)
 */
export async function resetPlanToDay(userId: string, dayNumber: number): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ current_plan_day: dayNumber })
    .eq('id', userId);

  return !error;
}

/**
 * Save onboarding data
 */
export async function saveOnboardingData(
  userId: string,
  data: {
    exerciseType: ExerciseType;
    intensity: Intensity;
    timelineMonths: Timeline;
    maxReps?: number;
    fitnessLevel?: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('user_onboarding')
    .upsert({
      user_id: userId,
      exercise_type: data.exerciseType,
      intensity: data.intensity,
      timeline_months: data.timelineMonths,
      max_reps: data.maxReps || null,
      fitness_level: data.fitnessLevel || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error saving onboarding data:', error);
    return false;
  }

  return true;
}

/**
 * Get onboarding data
 */
export async function getOnboardingData(userId: string): Promise<{
  exerciseType?: ExerciseType;
  intensity?: Intensity;
  timelineMonths?: Timeline;
  maxReps?: number;
  fitnessLevel?: string;
  completedAt?: string;
} | null> {
  const { data, error } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    exerciseType: data.exercise_type,
    intensity: data.intensity,
    timelineMonths: data.timeline_months,
    maxReps: data.max_reps,
    fitnessLevel: data.fitness_level,
    completedAt: data.completed_at,
  };
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(userId: string): Promise<boolean> {
  const { error: onboardingError } = await supabase
    .from('user_onboarding')
    .update({ completed_at: new Date().toISOString() })
    .eq('user_id', userId);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId);

  return !onboardingError && !profileError;
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.onboarding_completed || false;
}

