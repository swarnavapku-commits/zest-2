import type { DayCompletionMap, Habit } from '../types/habit';
import { calculateDailyProgress, getWeekDays } from '../utils/habits';

interface WeekDayScrollerProps {
  referenceDate: Date;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  habits: Habit[];
  completions: DayCompletionMap;
}

export function WeekDayScroller({
  referenceDate,
  selectedDateKey,
  onSelectDate,
  habits,
  completions,
}: WeekDayScrollerProps) {
  const days = getWeekDays(referenceDate);

  return (
    <div
      role="group"
      aria-label="Select day of week"
      className="grid grid-cols-7 gap-1.5 sm:gap-2.5"
    >
      {days.map((day) => {
        const isSelected = day.dateKey === selectedDateKey;
        const progress = calculateDailyProgress(habits, completions[day.dateKey] ?? []);
        const isFullDay = progress.totalCount > 0 && progress.completedCount === progress.totalCount;

        return (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onSelectDate(day.dateKey)}
            aria-pressed={isSelected}
            aria-label={`${day.dayShort} ${day.dayNumber}${day.isToday ? ', Today' : ''}, ${progress.completedCount} of ${progress.totalCount} completed`}
            className={`min-h-[60px] rounded-2xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-2 ${
              isSelected
                ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                : 'bg-[#FDFFFB] text-[#1A260E] border-2 border-[#D8E0D1]/70 hover:border-[#538900]/50'
            }`}
          >
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.04em] leading-none ${
                isSelected ? 'text-[#D7F3C2]' : 'text-[#586251]'
              }`}
            >
              {day.dayShort}
            </span>
            <span className="font-display font-bold text-lg leading-none tabular-nums">
              {day.dayNumber}
            </span>
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${
                isSelected
                  ? isFullDay
                    ? 'bg-[#FFB95A]'
                    : 'bg-white/70'
                  : isFullDay
                    ? 'bg-[#4B7C00]'
                    : progress.completedCount > 0
                      ? 'bg-[#9BD854]'
                      : 'bg-[#D8E0D1]'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
