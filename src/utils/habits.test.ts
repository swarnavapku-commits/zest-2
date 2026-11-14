import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyProgress,
  calculateLevelInfo,
  calculateStreak,
  calculateTotalXp,
  createInitialSeedData,
  filterHabits,
  formatDateKey,
  getUnlockedBadges,
  getWeeklySummary,
  validateHabitInput,
} from './habits';

test('calculateDailyProgress computes percentage, XP, and milestone stars accurately', () => {
  const ref = new Date(2026, 10, 13);
  const { habits } = createInitialSeedData(ref);

  const half = calculateDailyProgress(habits, ['h-water', 'h-sunlight', 'h-breath']);
  assert.equal(half.completedCount, 3);
  assert.equal(half.totalCount, 6);
  assert.equal(half.percentage, 50);
  assert.equal(half.xpEarnedToday, 70);
  assert.deepEqual(half.milestonesReached, [true, false, false]);

  const full = calculateDailyProgress(
    habits,
    habits.map((h) => h.id),
  );
  assert.equal(full.percentage, 100);
  assert.deepEqual(full.milestonesReached, [true, true, true]);
});

test('calculateStreak counts consecutive days including optional today completion', () => {
  const ref = new Date(2026, 10, 13);
  const today = formatDateKey(ref);
  const y1 = formatDateKey(new Date(2026, 10, 12));
  const y2 = formatDateKey(new Date(2026, 10, 11));
  const y3 = formatDateKey(new Date(2026, 10, 10));

  const completions = {
    [y1]: ['h-1'],
    [y2]: ['h-1'],
    [y3]: [],
  };

  assert.equal(calculateStreak('h-1', completions, ref), 2);
  completions[today] = ['h-1'];
  assert.equal(calculateStreak('h-1', completions, ref), 3);
});

test('calculateLevelInfo maps XP to level, title, and remaining XP', () => {
  const lvl1 = calculateLevelInfo(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.title, 'Seedling');
  assert.equal(lvl1.xpNeededForNext, 350);

  const lvl4 = calculateLevelInfo(1100);
  assert.equal(lvl4.level, 4);
  assert.equal(lvl4.title, 'Meadow Sprout');
  assert.equal(lvl4.xpIntoLevel, 50);
});

test('filterHabits filters by category and search query without returning archived habits', () => {
  const ref = new Date(2026, 10, 13);
  const { habits } = createInitialSeedData(ref);
  habits[0] = { ...habits[0], archived: true };

  const wellness = filterHabits(habits, 'Wellness', '');
  assert.equal(wellness.length, 1);
  assert.equal(wellness[0].id, 'h-sunlight');

  const queryMatch = filterHabits(habits, 'All', 'breath');
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'h-breath');
});

test('validateHabitInput rejects blank or invalid inputs with clear messages', () => {
  const emptyResult = validateHabitInput({
    title: '   ',
    category: 'Focus',
    timeOfDay: 'Morning',
    durationMinutes: 15,
    cadence: 'Daily',
    xpReward: 25,
    icon: 'book',
  });
  assert.equal(emptyResult.valid, false);
  assert.equal(emptyResult.errors.title, 'Please enter a habit name.');

  const invalidDuration = validateHabitInput({
    title: 'Read 10 pages',
    category: 'Focus',
    timeOfDay: 'Morning',
    durationMinutes: 0,
    cadence: 'Daily',
    xpReward: 25,
    icon: 'book',
  });
  assert.equal(invalidDuration.valid, false);
  assert.ok(invalidDuration.errors.durationMinutes);

  const valid = validateHabitInput({
    title: 'Read 10 pages',
    category: 'Focus',
    timeOfDay: 'Morning',
    durationMinutes: 15,
    cadence: 'Daily',
    xpReward: 25,
    icon: 'book',
  });
  assert.equal(valid.valid, true);
});

test('seed data generates positive XP, unlocks starter badges, and preserves past perfect days', () => {
  const ref = new Date(2026, 10, 13);
  const { habits, completions } = createInitialSeedData(ref);
  const xp = calculateTotalXp(habits, completions);
  assert.ok(xp >= 1500);
  const badges = getUnlockedBadges(habits, completions, xp, ref);
  assert.ok(badges.some((b) => b.id === 'badge-first-sprout' && b.unlocked));
  assert.ok(badges.some((b) => b.id === 'badge-7-day-flame' && b.unlocked));

  const extendedHabits = [
    ...habits,
    {
      id: 'h-new',
      title: 'Evening Stretch',
      category: 'Movement' as const,
      timeOfDay: 'Evening' as const,
      durationMinutes: 10,
      cadence: 'Daily' as const,
      xpReward: 20,
      icon: 'dumbbell' as const,
      createdAt: formatDateKey(ref),
    },
  ];
  const weekly = getWeeklySummary(extendedHabits, completions, ref);
  assert.ok(weekly.perfectDaysCount >= 1);
});
