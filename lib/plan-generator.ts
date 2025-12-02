// Workout Plan Generator - Creates progressive workout plans
import { ExerciseType, getExerciseGoal } from './exercises';

export type Intensity = 'beginner' | 'intermediate' | 'advanced';
export type Timeline = 1 | 3 | 6 | 12; // months
export type FitnessLevel = 'beginner' | 'some_experience' | 'intermediate' | 'advanced';

export interface PlanDay {
  dayNumber: number;
  isRestDay: boolean;
  targetTotalReps: number;
  recommendedSets: number[]; // Array of rep counts, e.g., [20, 20, 20, 20, 20]
  notes?: string;
}

export interface WorkoutPlan {
  exerciseType: ExerciseType;
  intensity: Intensity;
  timelineMonths: Timeline;
  targetGoal: number;
  startingMaxReps: number | null;
  totalDays: number;
  days: PlanDay[];
}

export interface PlanGeneratorInput {
  exerciseType: ExerciseType;
  intensity: Intensity;
  timelineMonths: Timeline;
  maxReps?: number;
  fitnessLevel?: FitnessLevel;
}

// Intensity configurations
const INTENSITY_CONFIG: Record<Intensity, { restDaysPerWeek: number; progressionRate: number; startingPercentage: number }> = {
  beginner: {
    restDaysPerWeek: 3, // 4 workout days per week
    progressionRate: 0.03, // 3% increase per week
    startingPercentage: 0.3, // Start at 30% of goal
  },
  intermediate: {
    restDaysPerWeek: 2, // 5 workout days per week
    progressionRate: 0.05, // 5% increase per week
    startingPercentage: 0.5, // Start at 50% of goal
  },
  advanced: {
    restDaysPerWeek: 1, // 6 workout days per week
    progressionRate: 0.07, // 7% increase per week
    startingPercentage: 0.7, // Start at 70% of goal
  },
};

// Set distribution strategies based on total reps
function distributeRepsIntoSets(totalReps: number, intensity: Intensity): number[] {
  // Determine target reps per set based on intensity
  let targetRepsPerSet: number;
  
  if (intensity === 'beginner') {
    targetRepsPerSet = Math.min(15, Math.ceil(totalReps / 6)); // More sets, fewer reps each
  } else if (intensity === 'intermediate') {
    targetRepsPerSet = Math.min(20, Math.ceil(totalReps / 5));
  } else {
    targetRepsPerSet = Math.min(25, Math.ceil(totalReps / 4)); // Fewer sets, more reps each
  }
  
  // Ensure at least 5 reps per set
  targetRepsPerSet = Math.max(5, targetRepsPerSet);
  
  const sets: number[] = [];
  let remaining = totalReps;
  
  while (remaining > 0) {
    const repsForSet = Math.min(targetRepsPerSet, remaining);
    if (repsForSet >= 3) { // Don't add sets with less than 3 reps
      sets.push(repsForSet);
    } else if (sets.length > 0) {
      // Add remaining to last set
      sets[sets.length - 1] += repsForSet;
    }
    remaining -= repsForSet;
  }
  
  // Balance sets - try to make them more even
  if (sets.length > 1) {
    const avgReps = Math.floor(totalReps / sets.length);
    const extraReps = totalReps % sets.length;
    
    for (let i = 0; i < sets.length; i++) {
      sets[i] = avgReps + (i < extraReps ? 1 : 0);
    }
  }
  
  return sets;
}

// Calculate starting point based on user's current max
function calculateStartingReps(input: PlanGeneratorInput): number {
  const goal = getExerciseGoal(input.exerciseType);
  const config = INTENSITY_CONFIG[input.intensity];
  
  // If user provided their max, use that as starting point
  if (input.maxReps && input.maxReps > 0) {
    // Start daily goal at 2-3x their max reps (they'll do multiple sets)
    const multiplier = input.intensity === 'beginner' ? 2 : input.intensity === 'intermediate' ? 2.5 : 3;
    return Math.min(Math.floor(input.maxReps * multiplier), Math.floor(goal * 0.8));
  }
  
  // Use fitness level if provided
  if (input.fitnessLevel) {
    const levelMultipliers: Record<FitnessLevel, number> = {
      beginner: 0.25,
      some_experience: 0.4,
      intermediate: 0.55,
      advanced: 0.7,
    };
    return Math.floor(goal * levelMultipliers[input.fitnessLevel]);
  }
  
  // Default based on intensity
  return Math.floor(goal * config.startingPercentage);
}

// Generate rest day pattern for a week
function generateWeekPattern(intensity: Intensity): boolean[] {
  // Returns array of 7 booleans, true = rest day
  const restDays = INTENSITY_CONFIG[intensity].restDaysPerWeek;
  
  if (intensity === 'beginner') {
    // Rest every other day: W-R-W-R-W-R-R
    return [false, true, false, true, false, true, true];
  } else if (intensity === 'intermediate') {
    // 2 rest days: W-W-W-R-W-W-R
    return [false, false, false, true, false, false, true];
  } else {
    // 1 rest day: W-W-W-W-W-W-R
    return [false, false, false, false, false, false, true];
  }
}

// Main plan generation function
export function generateWorkoutPlan(input: PlanGeneratorInput): WorkoutPlan {
  const goal = getExerciseGoal(input.exerciseType);
  const totalDays = input.timelineMonths * 30; // Approximate days in timeline
  const config = INTENSITY_CONFIG[input.intensity];
  
  const startingReps = calculateStartingReps(input);
  const weekPattern = generateWeekPattern(input.intensity);
  
  const days: PlanDay[] = [];
  
  // Calculate how much we need to progress per day to reach goal
  const repsToGain = goal - startingReps;
  const workoutDays = Math.floor(totalDays * (7 - config.restDaysPerWeek) / 7);
  const repsPerWorkoutDay = repsToGain / workoutDays;
  
  let currentDayTarget = startingReps;
  let workoutDayCount = 0;
  
  for (let day = 1; day <= totalDays; day++) {
    const weekDay = (day - 1) % 7;
    const isRestDay = weekPattern[weekDay];
    
    if (isRestDay) {
      days.push({
        dayNumber: day,
        isRestDay: true,
        targetTotalReps: 0,
        recommendedSets: [],
        notes: 'Rest day - recover and prepare for tomorrow!',
      });
    } else {
      workoutDayCount++;
      
      // Progressive increase with some periodization
      // Every 4th workout day is a "light" day (80% of target)
      const isLightDay = workoutDayCount % 4 === 0;
      let targetReps = Math.round(currentDayTarget);
      
      if (isLightDay) {
        targetReps = Math.round(targetReps * 0.8);
      }
      
      // Ensure minimum reps
      targetReps = Math.max(targetReps, 10);
      
      // Cap at goal
      targetReps = Math.min(targetReps, goal);
      
      const sets = distributeRepsIntoSets(targetReps, input.intensity);
      
      // Generate notes based on week number and progress
      const weekNumber = Math.ceil(day / 7);
      const progressPercentage = Math.round((targetReps / goal) * 100);
      let notes: string | undefined;
      
      if (day === 1) {
        notes = 'Day 1 - Let\'s begin your journey!';
      } else if (isLightDay) {
        notes = 'Light day - focus on form and recovery';
      } else if (progressPercentage >= 100) {
        notes = 'You\'ve reached your goal! Keep pushing!';
      } else if (weekNumber % 4 === 0 && weekDay === 0) {
        notes = `Week ${weekNumber} - Great progress! ${progressPercentage}% to goal`;
      }
      
      days.push({
        dayNumber: day,
        isRestDay: false,
        targetTotalReps: targetReps,
        recommendedSets: sets,
        notes,
      });
      
      // Increase target for next workout day
      if (!isLightDay) {
        currentDayTarget += repsPerWorkoutDay;
      }
    }
  }
  
  return {
    exerciseType: input.exerciseType,
    intensity: input.intensity,
    timelineMonths: input.timelineMonths,
    targetGoal: goal,
    startingMaxReps: input.maxReps || null,
    totalDays,
    days,
  };
}

// Get summary of a workout plan
export function getPlanSummary(plan: WorkoutPlan): {
  totalWorkoutDays: number;
  totalRestDays: number;
  averageRepsPerDay: number;
  startingDailyReps: number;
  endingDailyReps: number;
} {
  const workoutDays = plan.days.filter(d => !d.isRestDay);
  const restDays = plan.days.filter(d => d.isRestDay);
  
  const totalReps = workoutDays.reduce((sum, d) => sum + d.targetTotalReps, 0);
  
  return {
    totalWorkoutDays: workoutDays.length,
    totalRestDays: restDays.length,
    averageRepsPerDay: Math.round(totalReps / workoutDays.length),
    startingDailyReps: workoutDays[0]?.targetTotalReps || 0,
    endingDailyReps: workoutDays[workoutDays.length - 1]?.targetTotalReps || plan.targetGoal,
  };
}

// Get a specific day from the plan
export function getPlanDay(plan: WorkoutPlan, dayNumber: number): PlanDay | null {
  return plan.days.find(d => d.dayNumber === dayNumber) || null;
}

// Calculate what week/day label to show
export function getDayLabel(dayNumber: number): string {
  const week = Math.ceil(dayNumber / 7);
  const dayOfWeek = ((dayNumber - 1) % 7) + 1;
  return `Week ${week}, Day ${dayOfWeek}`;
}

// Check if user is on track with their plan
export function calculatePlanProgress(
  planTotalDays: number,
  currentDay: number,
  completedWorkouts: number,
  expectedWorkoutsPerWeek: number
): {
  daysProgress: number;
  workoutsProgress: number;
  isOnTrack: boolean;
  daysRemaining: number;
} {
  const daysProgress = Math.round((currentDay / planTotalDays) * 100);
  const expectedWorkouts = Math.floor((currentDay / 7) * expectedWorkoutsPerWeek);
  const workoutsProgress = expectedWorkouts > 0 ? Math.round((completedWorkouts / expectedWorkouts) * 100) : 100;
  
  return {
    daysProgress,
    workoutsProgress: Math.min(workoutsProgress, 100),
    isOnTrack: workoutsProgress >= 80,
    daysRemaining: planTotalDays - currentDay,
  };
}

// Generate a preview of the first week for onboarding
export function generateWeekPreview(input: PlanGeneratorInput): PlanDay[] {
  const plan = generateWorkoutPlan(input);
  return plan.days.slice(0, 7);
}

// Adjust plan difficulty (when user requests changes)
export function adjustPlanDifficulty(
  currentPlan: WorkoutPlan,
  currentDay: number,
  adjustment: 'easier' | 'harder'
): WorkoutPlan {
  const multiplier = adjustment === 'easier' ? 0.85 : 1.15;
  
  const adjustedDays = currentPlan.days.map(day => {
    if (day.dayNumber <= currentDay || day.isRestDay) {
      return day; // Don't change past days or rest days
    }
    
    const newTarget = Math.round(day.targetTotalReps * multiplier);
    const clampedTarget = Math.max(10, Math.min(newTarget, currentPlan.targetGoal));
    
    return {
      ...day,
      targetTotalReps: clampedTarget,
      recommendedSets: distributeRepsIntoSets(clampedTarget, currentPlan.intensity),
    };
  });
  
  return {
    ...currentPlan,
    days: adjustedDays,
  };
}

// Suggest plan adjustment based on recent performance
export function suggestPlanAdjustment(
  recentCompletionRates: number[], // Array of completion percentages for last 5-7 workouts
): 'keep' | 'easier' | 'harder' {
  if (recentCompletionRates.length < 3) {
    return 'keep'; // Not enough data
  }
  
  const avgCompletion = recentCompletionRates.reduce((a, b) => a + b, 0) / recentCompletionRates.length;
  
  if (avgCompletion >= 110) {
    return 'harder'; // User is crushing it, make it harder
  } else if (avgCompletion < 70) {
    return 'easier'; // User is struggling, make it easier
  }
  
  return 'keep';
}

