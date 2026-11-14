export type HabitCategory = 'Wellness' | 'Mindfulness' | 'Movement' | 'Focus';

export type HabitTimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';

export type HabitCadence = 'Daily' | 'Weekdays' | '3x / week';

export type HabitIconId =
  | 'droplets'
  | 'sun'
  | 'book'
  | 'footprints'
  | 'wind'
  | 'moon'
  | 'apple'
  | 'dumbbell'
  | 'sparkles'
  | 'coffee'
  | 'heart'
  | 'pen';

export interface Habit {
  id: string;
  title: string;
  category: HabitCategory;
  timeOfDay: HabitTimeOfDay;
  durationMinutes: number;
  cadence: HabitCadence;
  xpReward: number;
  icon: HabitIconId;
  archived?: boolean;
  createdAt: string;
}

/** Map of YYYY-MM-DD -> array of completed habit IDs */
export type DayCompletionMap = Record<string, string[]>;

export interface DailyProgressSummary {
  completedCount: number;
  totalCount: number;
  percentage: number;
  xpEarnedToday: number;
  milestonesReached: boolean[];
}

export interface LevelInfo {
  level: number;
  title: string;
  nextTitle: string;
  totalXp: number;
  currentLevelFloorXp: number;
  nextLevelThresholdXp: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export interface BadgeInfo {
  id: string;
  title: string;
  description: string;
  category: 'Streak' | 'Consistency' | 'Mastery';
  unlocked: boolean;
  currentValue: number;
  targetValue: number;
}

export interface RoutineTemplate {
  id: string;
  title: string;
  category: HabitCategory;
  timeOfDay: HabitTimeOfDay;
  durationMinutes: number;
  cadence: HabitCadence;
  xpReward: number;
  icon: HabitIconId;
  benefit: string;
}

export interface HabitFormInput {
  title: string;
  category: HabitCategory;
  timeOfDay: HabitTimeOfDay;
  durationMinutes: number;
  cadence: HabitCadence;
  xpReward: number;
  icon: HabitIconId;
}

export interface HabitValidationResult {
  valid: boolean;
  errors: {
    title?: string;
    durationMinutes?: string;
  };
}
