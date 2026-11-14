import { ArrowRight } from 'lucide-react';
import type { LevelInfo } from '../types/habit';
import { SproutMascot } from './Icons';

interface DarkShowcaseCardProps {
  levelInfo: LevelInfo;
  weeklyCompletionRate: number;
  onOpenRecap: () => void;
}

export function DarkShowcaseCard({
  levelInfo,
  weeklyCompletionRate,
  onOpenRecap,
}: DarkShowcaseCardProps) {
  return (
    <section
      aria-label="Level and weekly recap showcase"
      className="rounded-3xl bg-[#1C3400] text-white p-6 shadow-[0px_8px_24px_rgba(26,38,14,0.12)]"
    >
      <div className="flex items-center gap-4">
        <SproutMascot className="w-18 h-18 shrink-0 zest-media-fade" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#B6F56D]">
            Level {levelInfo.level}
          </p>
          <h2 className="font-display font-bold text-[22px] leading-tight text-white mt-0.5">
            {levelInfo.title}
          </h2>
          <p className="text-[13px] text-[#D7F3C2] mt-1 tabular-nums">
            {levelInfo.totalXp.toLocaleString()} total XP
          </p>
        </div>
      </div>

      {/* Level XP Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-[13px] text-[#D7F3C2] mb-2">
          <span>Next: {levelInfo.nextTitle}</span>
          <span className="font-semibold tabular-nums">
            {levelInfo.xpNeededForNext} XP left
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-[#2E4F00] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#B6F56D] transition-[width] duration-300"
            style={{ width: `${levelInfo.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-[#2E4F00] flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-[#D7F3C2]">Weekly rhythm</p>
          <p className="font-display font-extrabold text-xl text-white tabular-nums">
            {weeklyCompletionRate}% avg
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenRecap}
          className="zest-btn-secondary rounded-full px-4 min-h-[44px] inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        >
          <span>Weekly Recap</span>
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
