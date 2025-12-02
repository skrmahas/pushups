// XP & Leveling System

export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export interface DifficultyConfig {
  name: string;
  multiplier: number;
  description: string;
  color: string;
  variations: PushupVariation[];
}

export interface PushupVariation {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: Difficulty;
  unlockLevel: number;
  xpMultiplier: number; // Variation-specific XP multiplier
}

export interface XPCalculation {
  baseXP: number;
  speedBonus: number;
  difficultyMultiplier: number;
  variationMultiplier: number;
  combinedMultiplier: number;
  streakBonus: number;
  dailyGoalBonus?: number;
  totalXP: number;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-100
}

// Difficulty configurations with variation XP multipliers
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    multiplier: 0.75,
    description: 'Modified pushups for beginners',
    color: '#4ADE80', // Green
    variations: [
      { id: 'wall', name: 'Wall Push-up', description: 'Pushups against a wall', icon: '🧱', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.0 },
      { id: 'knee', name: 'Knee Push-up', description: 'Pushups on your knees', icon: '🦵', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.1 },
      { id: 'incline', name: 'Incline Push-up', description: 'Hands on elevated surface', icon: '📐', difficulty: 'easy', unlockLevel: 1, xpMultiplier: 1.15 },
    ],
  },
  normal: {
    name: 'Normal',
    multiplier: 1.0,
    description: 'Standard pushup variations',
    color: '#3B82F6', // Blue
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
    color: '#F59E0B', // Orange
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
    description: 'Elite-level pushup variations',
    color: '#EF4444', // Red
    variations: [
      { id: 'explosive', name: 'Explosive Push-up', description: 'Push off the ground', icon: '💥', difficulty: 'extreme', unlockLevel: 12, xpMultiplier: 1.0 },
      { id: 'clap', name: 'Clap Push-up', description: 'Clap hands mid-air', icon: '👏', difficulty: 'extreme', unlockLevel: 15, xpMultiplier: 1.25 },
      { id: 'one_arm', name: 'One-Arm Push-up', description: 'Single arm pushup', icon: '☝️', difficulty: 'extreme', unlockLevel: 25, xpMultiplier: 1.75 },
      { id: 'planche', name: 'Planche Push-up', description: 'Elevated planche position', icon: '🤸', difficulty: 'extreme', unlockLevel: 30, xpMultiplier: 2.0 },
    ],
  },
};

// Variation XP multipliers lookup map for quick access
export const VARIATION_MULTIPLIERS: Record<string, number> = {};
Object.values(DIFFICULTIES).forEach(diff => {
  diff.variations.forEach(v => {
    VARIATION_MULTIPLIERS[v.id] = v.xpMultiplier;
  });
});

// Level thresholds (matches database)
export const LEVEL_THRESHOLDS: { level: number; xp: number; title: string }[] = [
  { level: 1, xp: 0, title: 'Rookie' },
  { level: 2, xp: 500, title: 'Beginner' },
  { level: 3, xp: 1200, title: 'Amateur' },
  { level: 4, xp: 2500, title: 'Regular' },
  { level: 5, xp: 4500, title: 'Dedicated' },
  { level: 6, xp: 7000, title: 'Committed' },
  { level: 7, xp: 10000, title: 'Warrior' },
  { level: 8, xp: 14000, title: 'Fighter' },
  { level: 9, xp: 19000, title: 'Athlete' },
  { level: 10, xp: 25000, title: 'Champion' },
  { level: 15, xp: 60000, title: 'Elite' },
  { level: 20, xp: 120000, title: 'Master' },
  { level: 25, xp: 200000, title: 'Grandmaster' },
  { level: 30, xp: 300000, title: 'Legend' },
  { level: 40, xp: 500000, title: 'Mythic' },
  { level: 50, xp: 750000, title: 'Immortal' },
];

/**
 * Calculate XP earned from a workout
 * Base XP is reduced, but multipliers stack (difficulty × variation)
 */
export function calculateXP(
  totalPushups: number,
  pushupsPerMinute: number,
  difficulty: Difficulty,
  currentStreak: number,
  variation: string = 'standard'
): XPCalculation {
  // Base XP: 5 XP per pushup (reduced from 10)
  const baseXP = totalPushups * 5;

  // Speed bonus: up to 75 XP based on pushups per minute
  // 20 pushups/min = 40 bonus, capped at 75
  const speedBonus = Math.min(Math.floor((pushupsPerMinute / 20) * 40), 75);

  // Difficulty multiplier
  const difficultyMultiplier = DIFFICULTIES[difficulty].multiplier;

  // Variation multiplier (defaults to 1.0 if not found)
  const variationMultiplier = VARIATION_MULTIPLIERS[variation] || 1.0;

  // Combined multiplier: difficulty × variation
  const combinedMultiplier = difficultyMultiplier * variationMultiplier;

  // Streak bonus: 3 XP per day, capped at 30
  const streakBonus = Math.min(currentStreak * 3, 30);

  // Total XP with stacking multipliers
  const totalXP = Math.floor((baseXP + speedBonus) * combinedMultiplier + streakBonus);

  return {
    baseXP,
    speedBonus,
    difficultyMultiplier,
    variationMultiplier,
    combinedMultiplier,
    streakBonus,
    totalXP,
  };
}

/**
 * Get level from total XP
 */
export function getLevelFromXP(xp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.xp) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Get detailed level info including progress
 */
export function getLevelInfo(xp: number): LevelInfo {
  const level = getLevelFromXP(xp);
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === level) || LEVEL_THRESHOLDS[0];
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level > level);

  const xpForCurrentLevel = currentThreshold.xp;
  const xpForNextLevel = nextThreshold?.xp || currentThreshold.xp;
  
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const progress = xpNeededForNext > 0 
    ? Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100)
    : 100;

  return {
    level,
    title: currentThreshold.title,
    currentXP: xp,
    xpForCurrentLevel,
    xpForNextLevel,
    progress,
  };
}

/**
 * Get title for a level
 */
export function getLevelTitle(level: number): string {
  const threshold = LEVEL_THRESHOLDS.find(t => t.level === level);
  if (threshold) return threshold.title;
  
  // For intermediate levels, find the closest lower threshold
  const lowerThresholds = LEVEL_THRESHOLDS.filter(t => t.level <= level);
  return lowerThresholds[lowerThresholds.length - 1]?.title || 'Rookie';
}

/**
 * Get XP required for a specific level
 */
export function getXPForLevel(level: number): number {
  const threshold = LEVEL_THRESHOLDS.find(t => t.level === level);
  if (threshold) return threshold.xp;
  
  // For intermediate levels, interpolate
  const lowerThresholds = LEVEL_THRESHOLDS.filter(t => t.level < level);
  const upperThresholds = LEVEL_THRESHOLDS.filter(t => t.level > level);
  
  if (lowerThresholds.length === 0) return 0;
  if (upperThresholds.length === 0) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xp;
  
  const lower = lowerThresholds[lowerThresholds.length - 1];
  const upper = upperThresholds[0];
  
  const levelRange = upper.level - lower.level;
  const xpRange = upper.xp - lower.xp;
  const levelProgress = level - lower.level;
  
  return Math.floor(lower.xp + (xpRange / levelRange) * levelProgress);
}

/**
 * Get all variations available for a user's level
 */
export function getUnlockedVariations(level: number): PushupVariation[] {
  const variations: PushupVariation[] = [];
  
  for (const difficulty of Object.values(DIFFICULTIES)) {
    for (const variation of difficulty.variations) {
      if (variation.unlockLevel <= level) {
        variations.push(variation);
      }
    }
  }
  
  return variations;
}

/**
 * Get variations for a specific difficulty
 */
export function getVariationsForDifficulty(difficulty: Difficulty, level: number): PushupVariation[] {
  return DIFFICULTIES[difficulty].variations.filter(v => v.unlockLevel <= level);
}

/**
 * Get variation info by ID
 */
export function getVariationById(variationId: string): PushupVariation | undefined {
  for (const diff of Object.values(DIFFICULTIES)) {
    const variation = diff.variations.find(v => v.id === variationId);
    if (variation) return variation;
  }
  return undefined;
}

/**
 * Format XP number for display
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * Format multiplier for display
 */
export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}x`;
}
