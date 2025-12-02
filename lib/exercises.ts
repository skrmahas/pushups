// Exercise Types System - Supports both Pushups and Pullups

export type ExerciseType = 'pushups' | 'pullups';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export interface ExerciseVariation {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: Difficulty;
  unlockLevel: number;
  xpMultiplier: number;
}

export interface DifficultyConfig {
  name: string;
  multiplier: number;
  description: string;
  color: string;
  variations: ExerciseVariation[];
}

export interface ExerciseConfig {
  id: ExerciseType;
  name: string;
  namePlural: string;
  goal: number;
  icon: string;
  description: string;
  accentColor: string;
  difficulties: Record<Difficulty, DifficultyConfig>;
}

// Pushup Variations by Difficulty
const PUSHUP_DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    multiplier: 0.75,
    description: 'Modified push-ups for beginners',
    color: '#4ADE80',
    variations: [
      { id: 'wall', name: 'Wall Push-up', description: 'Pushups against a wall', icon: '🧱', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.0 },
      { id: 'knee', name: 'Knee Push-up', description: 'Pushups on your knees', icon: '🦵', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.1 },
      { id: 'incline', name: 'Incline Push-up', description: 'Hands on elevated surface', icon: '📐', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.15 },
    ],
  },
  normal: {
    name: 'Normal',
    multiplier: 1.0,
    description: 'Standard push-up variations',
    color: '#3B82F6',
    variations: [
      { id: 'standard', name: 'Standard Push-up', description: 'Classic pushup form', icon: '💪', difficulty: 'normal', unlockLevel: 1, xpMultiplier: 1.0 },
      { id: 'wide', name: 'Wide Push-up', description: 'Hands wider than shoulders', icon: '↔️', difficulty: 'normal', unlockLevel: 2, xpMultiplier: 1.1 },
      { id: 'diamond', name: 'Diamond Push-up', description: 'Hands form diamond shape', icon: '💎', difficulty: 'normal', unlockLevel: 3, xpMultiplier: 1.25 },
      { id: 'close', name: 'Close-Grip Push-up', description: 'Hands close together', icon: '🤏', difficulty: 'normal', unlockLevel: 4, xpMultiplier: 1.33 },
    ],
  },
  hard: {
    name: 'Hard',
    multiplier: 1.5,
    description: 'Advanced variations with added challenge',
    color: '#F59E0B',
    variations: [
      { id: 'decline', name: 'Decline Push-up', description: 'Feet elevated', icon: '⬇️', difficulty: 'hard', unlockLevel: 6, xpMultiplier: 1.0 },
      { id: 'staggered', name: 'Staggered Push-up', description: 'One hand forward, one back', icon: '🔀', difficulty: 'hard', unlockLevel: 8, xpMultiplier: 1.2 },
      { id: 'archer', name: 'Archer Push-up', description: 'One arm extended to side', icon: '🏹', difficulty: 'hard', unlockLevel: 10, xpMultiplier: 1.4 },
      { id: 'weighted', name: 'Weighted Push-up', description: 'With added weight', icon: '🏋️', difficulty: 'hard', unlockLevel: 10, xpMultiplier: 1.5 },
    ],
  },
  extreme: {
    name: 'Extreme',
    multiplier: 2.0,
    description: 'Elite-level push-up variations',
    color: '#EF4444',
    variations: [
      { id: 'explosive', name: 'Explosive Push-up', description: 'Push off the ground', icon: '💥', difficulty: 'extreme', unlockLevel: 12, xpMultiplier: 1.0 },
      { id: 'clap', name: 'Clap Push-up', description: 'Clap hands mid-air', icon: '👏', difficulty: 'extreme', unlockLevel: 15, xpMultiplier: 1.25 },
      { id: 'one_arm', name: 'One-Arm Push-up', description: 'Single arm pushup', icon: '☝️', difficulty: 'extreme', unlockLevel: 25, xpMultiplier: 1.75 },
      { id: 'planche', name: 'Planche Push-up', description: 'Elevated planche position', icon: '🤸', difficulty: 'extreme', unlockLevel: 30, xpMultiplier: 2.0 },
    ],
  },
};

// Pullup Variations by Difficulty
const PULLUP_DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    multiplier: 0.75,
    description: 'Assisted pull-ups for beginners',
    color: '#4ADE80',
    variations: [
      { id: 'band_assisted', name: 'Band-Assisted Pull-up', description: 'With resistance band support', icon: '🎗️', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.0 },
      { id: 'negative', name: 'Negative Pull-up', description: 'Slow lowering phase only', icon: '⬇️', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.1 },
      { id: 'australian', name: 'Australian Pull-up', description: 'Horizontal body row', icon: '🇦🇺', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.15 },
    ],
  },
  normal: {
    name: 'Normal',
    multiplier: 1.0,
    description: 'Standard pull-up variations',
    color: '#3B82F6',
    variations: [
      { id: 'standard_pullup', name: 'Standard Pull-up', description: 'Classic overhand grip', icon: '💪', difficulty: 'normal', unlockLevel: 1, xpMultiplier: 1.0 },
      { id: 'wide_grip', name: 'Wide-Grip Pull-up', description: 'Hands wider than shoulders', icon: '↔️', difficulty: 'normal', unlockLevel: 2, xpMultiplier: 1.1 },
      { id: 'close_grip_pullup', name: 'Close-Grip Pull-up', description: 'Hands close together', icon: '🤏', difficulty: 'normal', unlockLevel: 3, xpMultiplier: 1.2 },
      { id: 'neutral_grip', name: 'Neutral-Grip Pull-up', description: 'Palms facing each other', icon: '🤝', difficulty: 'normal', unlockLevel: 4, xpMultiplier: 1.15 },
    ],
  },
  hard: {
    name: 'Hard',
    multiplier: 1.5,
    description: 'Advanced pull-up variations',
    color: '#F59E0B',
    variations: [
      { id: 'weighted_pullup', name: 'Weighted Pull-up', description: 'With added weight', icon: '🏋️', difficulty: 'hard', unlockLevel: 6, xpMultiplier: 1.0 },
      { id: 'archer_pullup', name: 'Archer Pull-up', description: 'One arm extended to side', icon: '🏹', difficulty: 'hard', unlockLevel: 8, xpMultiplier: 1.3 },
      { id: 'typewriter', name: 'Typewriter Pull-up', description: 'Side to side at the top', icon: '⌨️', difficulty: 'hard', unlockLevel: 10, xpMultiplier: 1.4 },
      { id: 'muscle_up_progression', name: 'Muscle-up Progression', description: 'Transition over the bar', icon: '🔝', difficulty: 'hard', unlockLevel: 12, xpMultiplier: 1.5 },
    ],
  },
  extreme: {
    name: 'Extreme',
    multiplier: 2.0,
    description: 'Elite-level pull-up variations',
    color: '#EF4444',
    variations: [
      { id: 'explosive_pullup', name: 'Explosive Pull-up', description: 'Maximum power pull', icon: '💥', difficulty: 'extreme', unlockLevel: 15, xpMultiplier: 1.0 },
      { id: 'clapping_pullup', name: 'Clapping Pull-up', description: 'Clap at the top', icon: '👏', difficulty: 'extreme', unlockLevel: 18, xpMultiplier: 1.25 },
      { id: 'one_arm_progression', name: 'One-Arm Progression', description: 'Working toward one-arm', icon: '☝️', difficulty: 'extreme', unlockLevel: 25, xpMultiplier: 1.75 },
    ],
  },
};

// Exercise Configurations
export const EXERCISES: Record<ExerciseType, ExerciseConfig> = {
  pushups: {
    id: 'pushups',
    name: 'Push-up',
    namePlural: 'Push-ups',
    goal: 100,
    icon: '💪',
    description: 'Upper body pushing exercise targeting chest, shoulders, and triceps',
    accentColor: '#FF6B35',
    difficulties: PUSHUP_DIFFICULTIES,
  },
  pullups: {
    id: 'pullups',
    name: 'Pull-up',
    namePlural: 'Pull-ups',
    goal: 50,
    icon: '🏋️',
    description: 'Upper body pulling exercise targeting back, biceps, and core',
    accentColor: '#8B5CF6',
    difficulties: PULLUP_DIFFICULTIES,
  },
};

// Helper Functions

/**
 * Get exercise configuration by type
 */
export function getExerciseConfig(exerciseType: ExerciseType): ExerciseConfig {
  return EXERCISES[exerciseType];
}

/**
 * Get difficulty configuration for an exercise
 */
export function getDifficultyConfig(exerciseType: ExerciseType, difficulty: Difficulty): DifficultyConfig {
  return EXERCISES[exerciseType].difficulties[difficulty];
}

/**
 * Get all variations for an exercise type
 */
export function getAllVariations(exerciseType: ExerciseType): ExerciseVariation[] {
  const exercise = EXERCISES[exerciseType];
  const allVariations: ExerciseVariation[] = [];
  
  for (const difficulty of Object.values(exercise.difficulties)) {
    allVariations.push(...difficulty.variations);
  }
  
  return allVariations;
}

/**
 * Get unlocked variations for user level
 */
export function getUnlockedVariations(exerciseType: ExerciseType, userLevel: number): ExerciseVariation[] {
  return getAllVariations(exerciseType).filter(v => v.unlockLevel <= userLevel);
}

/**
 * Get variations for a specific difficulty that are unlocked
 */
export function getUnlockedVariationsForDifficulty(
  exerciseType: ExerciseType,
  difficulty: Difficulty,
  userLevel: number
): ExerciseVariation[] {
  const difficultyConfig = getDifficultyConfig(exerciseType, difficulty);
  return difficultyConfig.variations.filter(v => v.unlockLevel <= userLevel);
}

/**
 * Get a specific variation by ID
 */
export function getVariationById(exerciseType: ExerciseType, variationId: string): ExerciseVariation | undefined {
  return getAllVariations(exerciseType).find(v => v.id === variationId);
}

/**
 * Get default variation for an exercise type
 */
export function getDefaultVariation(exerciseType: ExerciseType): ExerciseVariation {
  if (exerciseType === 'pushups') {
    return PUSHUP_DIFFICULTIES.normal.variations[0]; // Standard Push-up
  }
  return PULLUP_DIFFICULTIES.normal.variations[0]; // Standard Pull-up
}

/**
 * Build variation multiplier lookup map
 */
export function buildVariationMultipliers(exerciseType: ExerciseType): Record<string, number> {
  const multipliers: Record<string, number> = {};
  const exercise = EXERCISES[exerciseType];
  
  for (const [difficulty, config] of Object.entries(exercise.difficulties)) {
    for (const variation of config.variations) {
      multipliers[variation.id] = variation.xpMultiplier;
    }
  }
  
  return multipliers;
}

/**
 * Calculate combined XP multiplier for difficulty + variation
 */
export function calculateCombinedMultiplier(
  exerciseType: ExerciseType,
  difficulty: Difficulty,
  variationId: string
): number {
  const difficultyConfig = getDifficultyConfig(exerciseType, difficulty);
  const variation = getVariationById(exerciseType, variationId);
  
  const difficultyMultiplier = difficultyConfig.multiplier;
  const variationMultiplier = variation?.xpMultiplier || 1.0;
  
  return difficultyMultiplier * variationMultiplier;
}

/**
 * Get exercise goal based on type
 */
export function getExerciseGoal(exerciseType: ExerciseType): number {
  return EXERCISES[exerciseType].goal;
}

/**
 * Format exercise name for display
 */
export function formatExerciseName(exerciseType: ExerciseType, count: number = 1): string {
  const exercise = EXERCISES[exerciseType];
  return count === 1 ? exercise.name : exercise.namePlural;
}

