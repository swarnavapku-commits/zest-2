import { Sparkles, Star } from 'lucide-react';
import type { DailyProgressSummary } from '../types/habit';
import { MILESTONE_THRESHOLDS } from '../utils/habits';

interface DailyProgressCardProps {
  summary: DailyProgressSummary;
  selectedDateLabel: string;
}

export function DailyProgressCard({
  summary,
  selectedDateLabel,
}: DailyProgressCardProps) {
  const isComplete = summary.totalCount > 0 && summary.completedCount === summary.totalCount;

  return (
    <section
      aria-label="Daily progress summary"
      className="zest-card rounded-3xl p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#586251]">
            {selectedDateLabel}
          </p>
          <h2 className="font-display font-bold text-[22px] sm:text-[26px] leading-tight text-[#1A260E] mt-1">
            {isComplete
              ? 'All rituals complete!'
              : summary.totalCount === 0
                ? 'Ready to build your day'
                : `${summary.completedCount} of ${summary.totalCount} rituals done`}
          </h2>
        </div>

        <div className="shrink-0 text-right">
          <span className="block font-display font-extrabold text-3xl leading-none text-[#4B7C00] tabular-nums">
            {summary.percentage}%
          </span>
          <span className="block text-xs font-semibold text-[#586251] mt-1 tabular-nums">
            +{summary.xpEarnedToday} XP earned
          </span>
        </div>
      </div>

      {/* Tactile 16px Pill Track with Milestone Stars */}
      <div className="mt-6 relative pt-1 pb-2">
        <div
          role="progressbar"
          aria-valuenow={summary.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Daily habit progress: ${summary.percentage}%`}
          className="h-4 w-full rounded-full bg-[#E7F2DF] overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-[#538900] transition-[width] duration-300 ease-out"
            style={{ width: `${summary.percentage}%` }}
          />
        </div>

        {/* Milestone Stars */}
        <div className="relative h-7 mt-1.5" aria-hidden="true">
          {MILESTONE_THRESHOLDS.map((threshold, idx) => {
            const reached = summary.milestonesReached[idx];
            const leftStyle =
              threshold === 100
                ? 'calc(100% - 28px)'
                : `calc(${threshold}% - 14px)`;
            return (
              <div
                key={threshold}
                style={{ left: leftStyle }}
                className={`absolute top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-transform duration-200 ${
                  reached
                    ? 'bg-[#CC8400] border-[#995F00] text-white scale-110'
                    : 'bg-[#FDFFFB] border-[#D8E0D1] text-[#586251]'
                }`}
              >
                <Star
                  className="w-3.5 h-3.5"
                  fill={reached ? 'currentColor' : 'none'}
                  strokeWidth={2.5}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[13px] text-[#586251]">
        <span>
          {isComplete
            ? 'Clean sweep bonus unlocked for today.'
            : `${Math.max(0, summary.totalCount - summary.completedCount)} remaining to hit 100%`}
        </span>
        {isComplete && (
          <span className="inline-flex items-center gap-1 font-semibold text-[#4B7C00]">
            <Sparkles className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
            <span>Perfect Day</span>
          </span>
        )}
      </div>
    </section>
  );
}
