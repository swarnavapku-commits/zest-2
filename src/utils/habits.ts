import type {
  BadgeInfo,
  DailyProgressSummary,
  DayCompletionMap,
  Habit,
  HabitCategory,
  HabitFormInput,
  HabitValidationResult,
  LevelInfo,
  RoutineTemplate,
} from '../types/habit';

export const MILESTONE_THRESHOLDS = [33, 66, 100] as const;

export const HABIT_CATEGORIES: HabitCategory[] = [
  'Wellness',
  'Mindfulness',
  'Movement',
  'Focus',
];

const LEVEL_TITLES = [
  'Seedling',
  'Sprout Scout',
  'Sunlit Bud',
  'Meadow Sprout',
  'Dewdrop Keeper',
  'Clover Sprig',
  'Breeze Runner',
  'Canopy Guide',
  'Golden Grove',
  'Botanical Sage',
];

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'tpl-sunlight',
    title: 'Morning Sunlight',
    category: 'Wellness',
    timeOfDay: 'Morning',
    durationMinutes: 10,
    cadence: 'Daily',
    xpReward: 25,
    icon: 'sun',
    benefit: 'Anchors circadian energy within 30 minutes of waking.',
  },
  {
    id: 'tpl-hydration',
    title: 'Electrolyte Hydration',
    category: 'Wellness',
    timeOfDay: 'Morning',
    durationMinutes: 5,
    cadence: 'Daily',
    xpReward: 20,
    icon: 'droplets',
    benefit: 'Replenishes overnight hydration before your first coffee.',
  },
  {
    id: 'tpl-box-breath',
    title: 'Box Breathing Reset',
    category: 'Mindfulness',
    timeOfDay: 'Afternoon',
    durationMinutes: 8,
    cadence: 'Daily',
    xpReward: 25,
    icon: 'wind',
    benefit: 'Lowers afternoon stress and restores calm clarity.',
  },
  {
    id: 'tpl-brisk-walk',
    title: 'Brisk Outdoor Walk',
    category: 'Movement',
    timeOfDay: 'Afternoon',
    durationMinutes: 25,
    cadence: 'Daily',
    xpReward: 35,
    icon: 'footprints',
    benefit: 'Boosts circulation, mood, and creative problem-solving.',
  },
  {
    id: 'tpl-deep-work',
    title: 'Phone-Free Focus Block',
    category: 'Focus',
    timeOfDay: 'Morning',
    durationMinutes: 45,
    cadence: 'Weekdays',
    xpReward: 40,
    icon: 'book',
    benefit: 'Protects uninterrupted momentum for your top priority.',
  },
  {
    id: 'tpl-evening-journal',
    title: 'Three Wins Journal',
    category: 'Mindfulness',
    timeOfDay: 'Evening',
    durationMinutes: 10,
    cadence: 'Daily',
    xpReward: 25,
    icon: 'pen',
    benefit: 'Closes the day with grounded gratitude and reflection.',
  },
  {
    id: 'tpl-mobility',
    title: 'Evening Mobility Flow',
    category: 'Movement',
    timeOfDay: 'Evening',
    durationMinutes: 15,
    cadence: 'Daily',
    xpReward: 30,
    icon: 'dumbbell',
    benefit: 'Releases shoulder and hip tension before rest.',
  },
  {
    id: 'tpl-screen-sunset',
    title: 'Digital Sunset',
    category: 'Wellness',
    timeOfDay: 'Evening',
    durationMinutes: 30,
    cadence: 'Daily',
    xpReward: 30,
    icon: 'moon',
    benefit: 'Dims blue light 30 minutes ahead of sleep.',
  },
];

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, offset: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
  return next;
}

export function getWeekDays(referenceDate: Date): Array<{
  dateKey: string;
  dayShort: string;
  dayNumber: number;
  isToday: boolean;
}> {
  // Build Monday-Sunday week containing referenceDate
  const dayOfWeek = referenceDate.getDay(); // 0 Sun .. 6 Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDays(referenceDate, mondayOffset);
  const todayKey = formatDateKey(referenceDate);
  const shortLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return Array.from({ length: 7 }, (_, idx) => {
    const d = addDays(monday, idx);
    const key = formatDateKey(d);
    return {
      dateKey: key,
      dayShort: shortLabels[idx],
      dayNumber: d.getDate(),
      isToday: key === todayKey,
    };
  });
}

export function getPastDays(referenceDate: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(formatDateKey(addDays(referenceDate, -i)));
  }
  return keys;
}

export function createInitialSeedData(referenceDate: Date = new Date()): {
  habits: Habit[];
  completions: DayCompletionMap;
} {
  const todayKey = formatDateKey(referenceDate);
  const habits: Habit[] = [
    {
      id: 'h-water',
      title: 'Morning Hydration',
      category: 'Wellness',
      timeOfDay: 'Morning',
      durationMinutes: 5,
      cadence: 'Daily',
      xpReward: 20,
      icon: 'droplets',
      createdAt: formatDateKey(addDays(referenceDate, -24)),
    },
    {
      id: 'h-sunlight',
      title: 'Sunlight & Fresh Air',
      category: 'Wellness',
      timeOfDay: 'Morning',
      durationMinutes: 15,
      cadence: 'Daily',
      xpReward: 25,
      icon: 'sun',
      createdAt: formatDateKey(addDays(referenceDate, -24)),
    },
    {
      id: 'h-breath',
      title: 'Mindful Breathwork',
      category: 'Mindfulness',
      timeOfDay: 'Morning',
      durationMinutes: 10,
      cadence: 'Daily',
      xpReward: 25,
      icon: 'wind',
      createdAt: formatDateKey(addDays(referenceDate, -20)),
    },
    {
      id: 'h-walk',
      title: 'Midday Brisk Walk',
      category: 'Movement',
      timeOfDay: 'Afternoon',
      durationMinutes: 25,
      cadence: 'Daily',
      xpReward: 35,
      icon: 'footprints',
      createdAt: formatDateKey(addDays(referenceDate, -18)),
    },
    {
      id: 'h-focus',
      title: 'Deep Focus Reading',
      category: 'Focus',
      timeOfDay: 'Afternoon',
      durationMinutes: 30,
      cadence: 'Weekdays',
      xpReward: 35,
      icon: 'book',
      createdAt: formatDateKey(addDays(referenceDate, -14)),
    },
    {
      id: 'h-winddown',
      title: 'Evening Gratitude Note',
      category: 'Mindfulness',
      timeOfDay: 'Evening',
      durationMinutes: 10,
      cadence: 'Daily',
      xpReward: 25,
      icon: 'moon',
      createdAt: formatDateKey(addDays(referenceDate, -12)),
    },
  ];

  const completions: DayCompletionMap = {};
  // Seed realistic 21-day history ending yesterday, plus partial completion today (3 of 6)
  for (let offset = 21; offset >= 1; offset -= 1) {
    const key = formatDateKey(addDays(referenceDate, -offset));
    const completedForDay: string[] = [];
    // Keep strong streaks on Morning Hydration (11 days) and Mindful Breathwork (7 days)
    if (offset <= 11 || offset % 3 !== 0) {
      completedForDay.push('h-water');
    }
    if (offset <= 9 || offset % 2 === 0) {
      completedForDay.push('h-sunlight');
    }
    if (offset <= 7 || offset % 4 !== 0) {
      completedForDay.push('h-breath');
    }
    if (offset <= 5 || offset % 2 === 1) {
      completedForDay.push('h-walk');
    }
    if (offset % 3 !== 1) {
      completedForDay.push('h-focus');
    }
    if (offset <= 4 || offset % 5 !== 0) {
      completedForDay.push('h-winddown');
    }
    completions[key] = completedForDay;
  }

  // Today starts at 3/6 completed so progress bar & gold star #1 are lit, with clear remaining goals
  completions[todayKey] = ['h-water', 'h-sunlight', 'h-breath'];

  return { habits, completions };
}

export function calculateDailyProgress(
  habits: Habit[],
  completedIds: string[] = [],
): DailyProgressSummary {
  const activeHabits = habits.filter((h) => !h.archived);
  const totalCount = activeHabits.length;
  if (totalCount === 0) {
    return {
      completedCount: 0,
      totalCount: 0,
      percentage: 0,
      xpEarnedToday: 0,
      milestonesReached: MILESTONE_THRESHOLDS.map(() => false),
    };
  }

  const completedSet = new Set(completedIds);
  const completedHabits = activeHabits.filter((h) => completedSet.has(h.id));
  const completedCount = completedHabits.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const xpEarnedToday = completedHabits.reduce((sum, h) => sum + h.xpReward, 0);
  const milestonesReached = MILESTONE_THRESHOLDS.map((threshold) => percentage >= threshold);

  return {
    completedCount,
    totalCount,
    percentage,
    xpEarnedToday,
    milestonesReached,
  };
}

export function calculateStreak(
  habitId: string,
  completions: DayCompletionMap,
  referenceDate: Date = new Date(),
): number {
  const todayKey = formatDateKey(referenceDate);
  const todayDone = (completions[todayKey] ?? []).includes(habitId);

  let streak = todayDone ? 1 : 0;
  // Walk backwards starting from yesterday
  for (let offset = 1; offset <= 365; offset += 1) {
    const key = formatDateKey(addDays(referenceDate, -offset));
    const list = completions[key] ?? [];
    if (list.includes(habitId)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateTotalXp(
  habits: Habit[],
  completions: DayCompletionMap,
): number {
  const habitXpMap = new Map<string, number>();
  for (const h of habits) {
    habitXpMap.set(h.id, h.xpReward);
  }

  let total = 0;
  for (const ids of Object.values(completions)) {
    const uniqueIds = new Set(ids);
    for (const id of uniqueIds) {
      total += habitXpMap.get(id) ?? 25;
    }
  }
  return total;
}

export function calculateLevelInfo(totalXp: number): LevelInfo {
  const xpPerLevel = 350;
  const safeXp = Math.max(0, totalXp);
  const level = Math.floor(safeXp / xpPerLevel) + 1;
  const currentLevelFloorXp = (level - 1) * xpPerLevel;
  const nextLevelThresholdXp = level * xpPerLevel;
  const xpIntoLevel = safeXp - currentLevelFloorXp;
  const xpNeededForNext = nextLevelThresholdXp - safeXp;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpPerLevel) * 100));

  const titleIndex = Math.min(level - 1, LEVEL_TITLES.length - 1);
  const nextTitleIndex = Math.min(level, LEVEL_TITLES.length - 1);

  return {
    level,
    title: LEVEL_TITLES[titleIndex],
    nextTitle: LEVEL_TITLES[nextTitleIndex],
    totalXp: safeXp,
    currentLevelFloorXp,
    nextLevelThresholdXp,
    xpIntoLevel,
    xpNeededForNext,
    progressPercent,
  };
}

export function filterHabits(
  habits: Habit[],
  category: HabitCategory | 'All',
  searchQuery: string,
): Habit[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return habits.filter((habit) => {
    if (habit.archived) return false;
    if (category !== 'All' && habit.category !== category) return false;
    if (normalizedQuery.length > 0) {
      const matchesTitle = habit.title.toLowerCase().includes(normalizedQuery);
      const matchesCategory = habit.category.toLowerCase().includes(normalizedQuery);
      const matchesTime = habit.timeOfDay.toLowerCase().includes(normalizedQuery);
      return matchesTitle || matchesCategory || matchesTime;
    }
    return true;
  });
}

export function validateHabitInput(input: HabitFormInput): HabitValidationResult {
  const errors: HabitValidationResult['errors'] = {};
  const trimmedTitle = input.title.trim();

  if (!trimmedTitle) {
    errors.title = 'Please enter a habit name.';
  } else if (trimmedTitle.length < 2) {
    errors.title = 'Habit name must be at least 2 characters.';
  } else if (trimmedTitle.length > 60) {
    errors.title = 'Habit name must be 60 characters or fewer.';
  }

  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 240) {
    errors.durationMinutes = 'Duration must be between 1 and 240 minutes.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getHabitsActiveOnDate(habits: Habit[], dateKey: string): Habit[] {
  return habits.filter((h) => !h.archived && (!h.createdAt || h.createdAt <= dateKey));
}

export function getWeeklySummary(
  habits: Habit[],
  completions: DayCompletionMap,
  referenceDate: Date = new Date(),
): {
  days: Array<{
    dateKey: string;
    dayShort: string;
    completedCount: number;
    totalCount: number;
    percentage: number;
    xpEarned: number;
  }>;
  averageCompletionRate: number;
  totalWeeklyXp: number;
  perfectDaysCount: number;
  bestDayLabel: string;
} {
  const weekDays = getWeekDays(referenceDate);

  const days = weekDays.map((day) => {
    const dayHabits = getHabitsActiveOnDate(habits, day.dateKey);
    const progress = calculateDailyProgress(dayHabits, completions[day.dateKey] ?? []);
    return {
      dateKey: day.dateKey,
      dayShort: day.dayShort,
      completedCount: progress.completedCount,
      totalCount: progress.totalCount,
      percentage: progress.percentage,
      xpEarned: progress.xpEarnedToday,
    };
  });

  const daysWithData = days.filter((d) => d.completedCount > 0);
  const averageCompletionRate =
    daysWithData.length > 0
      ? Math.round(daysWithData.reduce((sum, d) => sum + d.percentage, 0) / daysWithData.length)
      : 0;
  const totalWeeklyXp = days.reduce((sum, d) => sum + d.xpEarned, 0);
  const perfectDaysCount = days.filter((d) => d.totalCount > 0 && d.completedCount >= d.totalCount).length;

  const bestDay = days.reduce(
    (best, curr) => (curr.completedCount > best.completedCount ? curr : best),
    days[0],
  );

  return {
    days,
    averageCompletionRate,
    totalWeeklyXp,
    perfectDaysCount,
    bestDayLabel: bestDay && bestDay.completedCount > 0 ? bestDay.dayShort : '—',
  };
}

export function getUnlockedBadges(
  habits: Habit[],
  completions: DayCompletionMap,
  totalXp: number,
  referenceDate: Date = new Date(),
): BadgeInfo[] {
  const activeHabits = habits.filter((h) => !h.archived);
  const bestStreak = activeHabits.reduce(
    (max, h) => Math.max(max, calculateStreak(h.id, completions, referenceDate)),
    0,
  );
  const totalCheckins = Object.values(completions).reduce(
    (sum, list) => sum + new Set(list).size,
    0,
  );

  const todaySummary = calculateDailyProgress(
    habits,
    completions[formatDateKey(referenceDate)] ?? [],
  );
  const anyPerfectDay = Object.entries(completions).some(([dayKey, ids]) => {
    const dayHabits = getHabitsActiveOnDate(habits, dayKey);
    return dayHabits.length > 0 && calculateDailyProgress(dayHabits, ids).percentage >= 100;
  });
  const perfectDayProgress = anyPerfectDay || todaySummary.percentage >= 100 ? 1 : 0;

  return [
    {
      id: 'badge-first-sprout',
      title: 'First Sprout',
      description: 'Complete your first 5 habit check-ins.',
      category: 'Consistency',
      unlocked: totalCheckins >= 5,
      currentValue: Math.min(totalCheckins, 5),
      targetValue: 5,
    },
    {
      id: 'badge-3-day-flame',
      title: '3-Day Spark',
      description: 'Keep any ritual going for 3 consecutive days.',
      category: 'Streak',
      unlocked: bestStreak >= 3,
      currentValue: Math.min(bestStreak, 3),
      targetValue: 3,
    },
    {
      id: 'badge-7-day-flame',
      title: 'Steady Flame',
      description: 'Maintain a 7-day streak on any daily habit.',
      category: 'Streak',
      unlocked: bestStreak >= 7,
      currentValue: Math.min(bestStreak, 7),
      targetValue: 7,
    },
    {
      id: 'badge-full-sweep',
      title: 'Clean Sweep',
      description: 'Hit 100% completion on all active rituals in a day.',
      category: 'Mastery',
      unlocked: perfectDayProgress >= 1,
      currentValue: perfectDayProgress,
      targetValue: 1,
    },
    {
      id: 'badge-xp-1000',
      title: 'Sunlight Collector',
      description: 'Accumulate 1,000 lifetime wellness XP.',
      category: 'Mastery',
      unlocked: totalXp >= 1000,
      currentValue: Math.min(totalXp, 1000),
      targetValue: 1000,
    },
    {
      id: 'badge-14-day-flame',
      title: 'Evergreen Habit',
      description: 'Hold a 14-day unbroken streak on a single ritual.',
      category: 'Streak',
      unlocked: bestStreak >= 14,
      currentValue: Math.min(bestStreak, 14),
      targetValue: 14,
    },
  ];
}
