import { CalendarCheck, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { DayCompletionMap, Habit } from '../types/habit';
import {
  calculateDailyProgress,
  formatDateKey,
  getHabitsActiveOnDate,
  getPastDays,
  getWeeklySummary,
  HABIT_CATEGORIES,
} from '../utils/habits';

interface InsightsViewProps {
  referenceDate: Date;
  habits: Habit[];
  completions: DayCompletionMap;
  onOpenRecap: () => void;
}

export function InsightsView({
  referenceDate,
  habits,
  completions,
  onOpenRecap,
}: InsightsViewProps) {
  const weekly = getWeeklySummary(habits, completions, referenceDate);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() =>
    formatDateKey(referenceDate),
  );
  const selectedDayInfo =
    weekly.days.find((d) => d.dateKey === selectedDayKey) ?? weekly.days[0];
  const past28Days = getPastDays(referenceDate, 28);
  const past14Days = getPastDays(referenceDate, 14);
  const activeHabits = habits.filter((h) => !h.archived);

  // Category check-ins over past 14 days
  const categoryStats = HABIT_CATEGORIES.map((category) => {
    const catHabits = activeHabits.filter((h) => h.category === category);
    const catIds = new Set(catHabits.map((h) => h.id));
    let completed = 0;
    const possible = catHabits.length * past14Days.length;

    for (const dayKey of past14Days) {
      const doneIds = completions[dayKey] ?? [];
      for (const id of doneIds) {
        if (catIds.has(id)) completed += 1;
      }
    }

    const rate = possible > 0 ? Math.round((completed / possible) * 100) : 0;
    return { category, completed, rate };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-[34px] sm:text-[40px] leading-[1.12] tracking-[-0.025em] text-[#1A260E]">
            Rhythm & Insights
          </h1>
          <p className="text-[15px] text-[#586251] mt-1">
            See how your small daily rituals compound over weeks.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenRecap}
          className="zest-btn-secondary rounded-full px-5 min-h-[44px] text-sm font-bold cursor-pointer"
        >
          Open Weekly Recap
        </button>
      </div>

      {/* Dark Feature Showcase Hero */}
      <section
        aria-label="Weekly highlights"
        className="rounded-3xl bg-[#1C3400] text-white p-6 sm:p-8 shadow-[0px_8px_24px_rgba(26,38,14,0.12)]"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-[13px] text-[#D7F3C2] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#B6F56D]" aria-hidden="true" />
              <span>Weekly Rate</span>
            </p>
            <p className="font-display font-extrabold text-3xl sm:text-4xl mt-1 tabular-nums">
              {weekly.averageCompletionRate}%
            </p>
          </div>
          <div>
            <p className="text-[13px] text-[#D7F3C2] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FFB95A]" aria-hidden="true" />
              <span>Weekly XP</span>
            </p>
            <p className="font-display font-extrabold text-3xl sm:text-4xl mt-1 tabular-nums">
              +{weekly.totalWeeklyXp}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-[#D7F3C2] flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-[#B6F56D]" aria-hidden="true" />
              <span>Perfect Days</span>
            </p>
            <p className="font-display font-extrabold text-3xl sm:text-4xl mt-1 tabular-nums">
              {weekly.perfectDaysCount}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-[#D7F3C2] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#FFB95A]" aria-hidden="true" />
              <span>Peak Day</span>
            </p>
            <p className="font-display font-extrabold text-3xl sm:text-4xl mt-1">
              {weekly.bestDayLabel}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Rhythm Bar Chart */}
        <section
          aria-label="7-day completion chart"
          className="lg:col-span-7 zest-card rounded-3xl p-6"
        >
          <h2 className="font-display font-bold text-xl text-[#1A260E]">
            This Week’s Rhythm
          </h2>
          <p className="text-[13px] text-[#586251] mt-1">
            Daily ritual completion percentage from Monday through Sunday.
          </p>

          <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3 items-end h-48">
            {weekly.days.map((day) => {
              const barHeight = day.percentage === 0 ? 0 : Math.max(8, day.percentage);
              const isFull = day.percentage === 100 && day.totalCount > 0;
              const isSelected = day.dateKey === selectedDayInfo.dateKey;
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => setSelectedDayKey(day.dateKey)}
                  aria-pressed={isSelected}
                  aria-label={`${day.dayShort}: ${day.completedCount} of ${day.totalCount} rituals (${day.percentage}%)`}
                  className="flex flex-col items-center justify-end h-full gap-2 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-2"
                >
                  <span
                    className={`text-[12px] font-bold tabular-nums ${
                      isSelected ? 'text-[#4B7C00]' : 'text-[#586251]'
                    }`}
                  >
                    {day.percentage}%
                  </span>
                  <div
                    className={`w-full max-w-[40px] flex-1 bg-[#E7F2DF] rounded-2xl p-1 flex items-end overflow-hidden transition-shadow ${
                      isSelected ? 'ring-2 ring-[#4B7C00] ring-offset-2 ring-offset-[#FDFFFB]' : ''
                    }`}
                  >
                    {barHeight > 0 && (
                      <div
                        className={`w-full rounded-xl transition-[height] duration-300 ${
                          isFull ? 'bg-[#4B7C00]' : 'bg-[#73AE19]'
                        }`}
                        style={{ height: `${barHeight}%` }}
                      />
                    )}
                  </div>
                  <span
                    className={`font-display font-bold text-xs ${
                      isSelected ? 'text-[#4B7C00]' : 'text-[#1A260E]'
                    }`}
                  >
                    {day.dayShort}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#D8E0D1]/70 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#586251]">
            <span className="font-semibold text-[#1A260E]">
              {selectedDayInfo.dayShort} breakdown: {selectedDayInfo.completedCount} of{' '}
              {selectedDayInfo.totalCount} rituals completed
            </span>
            <span className="font-bold text-[#4B7C00] tabular-nums">
              +{selectedDayInfo.xpEarned} XP
            </span>
          </div>
        </section>

        {/* Category Balance */}
        <section
          aria-label="Category consistency"
          className="lg:col-span-5 zest-card rounded-3xl p-6"
        >
          <h2 className="font-display font-bold text-xl text-[#1A260E]">
            14-Day Category Balance
          </h2>
          <p className="text-[13px] text-[#586251] mt-1">
            Consistency across your four wellness pillars.
          </p>

          <div className="mt-6 space-y-4">
            {categoryStats.map((item) => {
              const barColor =
                item.category === 'Mindfulness'
                  ? 'bg-[#395CA7]'
                  : item.category === 'Movement'
                    ? 'bg-[#CC8400]'
                    : 'bg-[#4B7C00]';
              return (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-bold text-[#1A260E]">{item.category}</span>
                    <span className="text-[#586251] font-semibold tabular-nums">
                      {item.rate}% · {item.completed} check-ins
                    </span>
                  </div>
                  <div className="h-3.5 w-full rounded-full bg-[#E7F2DF] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.max(4, item.rate)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 28-Day Squircle Heatmap */}
      <section
        aria-label="28-day consistency grid"
        className="zest-card rounded-3xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl text-[#1A260E]">
              28-Day Consistency Garden
            </h2>
            <p className="text-[13px] text-[#586251] mt-0.5">
              Each tile reflects how many rituals you finished that day.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#586251]">
            <span>Less</span>
            <span className="w-4 h-4 rounded-md bg-[#E7F2DF] inline-block" aria-hidden="true" />
            <span className="w-4 h-4 rounded-md bg-[#D7F3C2] inline-block" aria-hidden="true" />
            <span className="w-4 h-4 rounded-md bg-[#9BD854] inline-block" aria-hidden="true" />
            <span className="w-4 h-4 rounded-md bg-[#4B7C00] inline-block" aria-hidden="true" />
            <span>100%</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 sm:grid-cols-14 gap-2.5">
          {past28Days.map((dayKey) => {
            const dayHabits = getHabitsActiveOnDate(habits, dayKey);
            const summary = calculateDailyProgress(dayHabits, completions[dayKey] ?? []);
            const colorClass =
              summary.percentage === 0
                ? 'bg-[#E7F2DF] text-[#586251]'
                : summary.percentage < 50
                  ? 'bg-[#D7F3C2] text-[#1A260E]'
                  : summary.percentage < 100
                    ? 'bg-[#9BD854] text-[#1A260E]'
                    : 'bg-[#4B7C00] text-white';
            const dayNum = Number(dayKey.split('-')[2]);

            return (
              <div
                key={dayKey}
                title={`${dayKey}: ${summary.completedCount}/${summary.totalCount} (${summary.percentage}%)`}
                className={`aspect-square rounded-2xl flex items-center justify-center font-display font-bold text-xs tabular-nums ${colorClass}`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
