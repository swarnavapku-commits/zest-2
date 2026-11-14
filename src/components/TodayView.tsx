import { Flame, Plus, Search, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import type {
  DailyProgressSummary,
  DayCompletionMap,
  Habit,
  HabitCategory,
  LevelInfo,
} from '../types/habit';
import type {
  PlannerCategory,
  PlannerTask,
  TimeBlock,
} from '../types/planner';
import {
  calculateStreak,
  filterHabits,
  formatDateKey,
  HABIT_CATEGORIES,
} from '../utils/habits';
import { DailyProgressCard } from './DailyProgressCard';
import { DarkShowcaseCard } from './DarkShowcaseCard';
import { HabitCard } from './HabitCard';
import { TimeBlockTimeline } from './TimeBlockTimeline';
import { WeekDayScroller } from './WeekDayScroller';

interface TodayViewProps {
  referenceDate: Date;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  habits: Habit[];
  completions: DayCompletionMap;
  dailyProgress: DailyProgressSummary;
  levelInfo: LevelInfo;
  weeklyCompletionRate: number;
  onToggleHabit: (habitId: string) => void;
  onEditHabit: (habit: Habit) => void;
  onOpenNewHabit: () => void;
  onOpenRecap: () => void;
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  onOpenAutoPlan: () => void;
  onOpenNewTaskModal: (defaultStartMinutes?: number | null) => void;
  onEditTask: (task: PlannerTask) => void;
  onToggleTask: (taskId: string) => void;
  onPlaceItem: (payload: {
    kind: 'task' | 'habit';
    id: string;
    title: string;
    category: PlannerCategory;
    dateKey: string;
    startMinutes: number;
    endMinutes: number;
  }) => void;
  onMoveBlock: (blockId: string, startMinutes: number, endMinutes: number) => void;
  onResizeBlock: (blockId: string, endMinutes: number) => void;
  onRemoveBlock: (blockId: string) => void;
}

export function TodayView({
  referenceDate,
  selectedDateKey,
  onSelectDate,
  habits,
  completions,
  dailyProgress,
  levelInfo,
  weeklyCompletionRate,
  onToggleHabit,
  onEditHabit,
  onOpenNewHabit,
  onOpenRecap,
  tasks,
  timeBlocks,
  onOpenAutoPlan,
  onOpenNewTaskModal,
  onEditTask,
  onToggleTask,
  onPlaceItem,
  onMoveBlock,
  onResizeBlock,
  onRemoveBlock,
}: TodayViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const todayKey = formatDateKey(referenceDate);
  const isViewingToday = selectedDateKey === todayKey;

  const selectedDateObj = (() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  })();

  const selectedDateLabel = isViewingToday
    ? `Today · ${selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

  const completedSet = new Set(completions[selectedDateKey] ?? []);
  const filteredHabits = filterHabits(habits, selectedCategory, searchQuery);

  // Sort pending first, completed second while preserving relative order
  const sortedHabits = [...filteredHabits].sort((a, b) => {
    const aDone = completedSet.has(a.id) ? 1 : 0;
    const bDone = completedSet.has(b.id) ? 1 : 0;
    return aDone - bDone;
  });

  const activeHabits = habits.filter((h) => !h.archived);
  const topStreaks = [...activeHabits]
    .map((h) => ({
      habit: h,
      streak: calculateStreak(h.id, completions, referenceDate),
    }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3);

  const hasActiveFilters = selectedCategory !== 'All' || searchQuery.trim().length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Column */}
      <div className="lg:col-span-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-[34px] sm:text-[40px] leading-[1.12] tracking-[-0.025em] text-[#1A260E]">
              Your Daily Planner
            </h1>
            <p className="text-[15px] text-[#586251] mt-1">
              Pair daily rituals with focused time blocks for calm momentum.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isViewingToday && (
              <button
                type="button"
                onClick={() => onSelectDate(todayKey)}
                className="rounded-full px-3.5 min-h-[40px] bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                Jump to Today
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAutoPlan}
              className="zest-btn-secondary rounded-full px-4 min-h-[40px] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#4B7C00]" aria-hidden="true" />
              <span>Auto-Plan My Day</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenNewTaskModal(10 * 60)}
              className="zest-btn-primary rounded-full px-4 min-h-[40px] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
              <span>New Task / Event</span>
            </button>
          </div>
        </div>

        {/* Interactive Week Scroller */}
        <WeekDayScroller
          referenceDate={referenceDate}
          selectedDateKey={selectedDateKey}
          onSelectDate={onSelectDate}
          habits={habits}
          completions={completions}
        />

        {/* Daily Progress Bar & Milestone Stars */}
        <DailyProgressCard
          summary={dailyProgress}
          selectedDateLabel={selectedDateLabel}
        />

        {/* Search & Category Filter Controls */}
        <div className="space-y-3 pt-1">
          <div className="relative">
            <label htmlFor="habit-search" className="sr-only">
              Search habits
            </label>
            <Search
              className="w-5 h-5 text-[#586251] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <input
              id="habit-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rituals..."
              className="zest-input w-full h-14 rounded-2xl pl-12 pr-12 text-[15px] font-medium"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-[#586251] hover:text-[#1A260E] cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter rituals by category"
            className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap"
          >
            {(['All', ...HABIT_CATEGORIES] as const).map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  aria-pressed={isSelected}
                  className={`rounded-full px-3.5 sm:px-4 min-h-[40px] text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-2 ${
                    isSelected
                      ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                      : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Habit Completion Cards */}
        <div className="space-y-3" data-testid="habit-list">
          {sortedHabits.length > 0 ? (
            sortedHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={completedSet.has(habit.id)}
                streak={calculateStreak(habit.id, completions, referenceDate)}
                onToggle={onToggleHabit}
                onEdit={onEditHabit}
              />
            ))
          ) : (
            <div className="zest-card rounded-3xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#E7F2DF] text-[#4B7C00] flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-xl text-[#1A260E] mt-3">
                {hasActiveFilters ? 'No matching rituals' : 'No rituals yet'}
              </h3>
              <p className="text-[15px] text-[#586251] mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'Try another category or clear your search to see all active rituals.'
                  : 'Create your first daily ritual to start earning XP and building streaks.'}
              </p>
              <div className="mt-5">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="zest-btn-secondary rounded-full px-5 min-h-[44px] text-sm font-bold cursor-pointer"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenNewHabit}
                    className="zest-btn-primary rounded-full px-6 min-h-[44px] text-sm font-bold cursor-pointer"
                  >
                    Create First Habit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Time-Blocking Timeline inside Today tab */}
        <TimeBlockTimeline
          dateKey={selectedDateKey}
          layout="stacked"
          habits={habits}
          completedHabitIds={completions[selectedDateKey] ?? []}
          tasks={tasks}
          timeBlocks={timeBlocks}
          onPlaceItem={onPlaceItem}
          onMoveBlock={onMoveBlock}
          onResizeBlock={onResizeBlock}
          onRemoveBlock={onRemoveBlock}
          onToggleTask={onToggleTask}
          onToggleHabit={onToggleHabit}
          onEditTask={onEditTask}
          onOpenNewTaskAt={(startMin) => onOpenNewTaskModal(startMin)}
        />
      </div>

      {/* Right Sidebar Column */}
      <aside className="lg:col-span-4 space-y-5">
        <DarkShowcaseCard
          levelInfo={levelInfo}
          weeklyCompletionRate={weeklyCompletionRate}
          onOpenRecap={onOpenRecap}
        />

        {/* Streak Momentum Board */}
        <section
          aria-label="Top active streaks"
          className="zest-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-xl text-[#1A260E]">
              Streak Momentum
            </h2>
            <Flame
              className="w-5 h-5 text-[#CC8400]"
              fill="currentColor"
              aria-hidden="true"
            />
          </div>
          <p className="text-[13px] text-[#586251] mt-1">
            Your longest active chains this month.
          </p>

          <div className="mt-4 divide-y divide-[#D8E0D1]/70">
            {topStreaks.length > 0 ? (
              topStreaks.map(({ habit, streak }) => (
                <div
                  key={habit.id}
                  className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[15px] text-[#1A260E] truncate">
                      {habit.title}
                    </p>
                    <p className="text-[12px] text-[#586251]">
                      {habit.category} · {habit.cadence}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#FDFFFB] border-2 border-[#CC8400]/30 px-2.5 py-1 shrink-0">
                    <Flame
                      className="w-3.5 h-3.5 text-[#CC8400]"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    <span className="font-display font-bold text-sm text-[#995F00] tabular-nums">
                      {streak}d
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-[#586251]">
                Complete a ritual today to spark your first streak.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
