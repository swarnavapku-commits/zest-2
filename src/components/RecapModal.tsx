import { Flame, Sparkles, Trophy, X } from 'lucide-react';
import { useEffect } from 'react';
import type { LevelInfo } from '../types/habit';
import { SproutMascot } from './Icons';

interface RecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: LevelInfo;
  weeklyAverageRate: number;
  weeklyXp: number;
  perfectDaysCount: number;
  bestStreak: number;
}

export function RecapModal({
  isOpen,
  onClose,
  levelInfo,
  weeklyAverageRate,
  weeklyXp,
  perfectDaysCount,
  bestStreak,
}: RecapModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#131F08]/55 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recap-modal-title"
        className="zest-modal-in w-full sm:max-w-md bg-[#FDFFFB] border-2 border-[#D8E0D1] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0px_12px_36px_rgba(26,38,14,0.2)]"
      >
        {/* Dark Botanical Hero Header */}
        <div className="bg-[#1C3400] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close weekly recap"
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[#2E4F00] text-[#D7F3C2] hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
          </button>

          <div className="flex flex-col items-center text-center pt-2">
            <SproutMascot className="w-24 h-24 zest-media-fade" />
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#B6F56D] mt-3">
              Weekly Recap · Level {levelInfo.level}
            </p>
            <h2
              id="recap-modal-title"
              className="font-display font-extrabold text-[28px] leading-tight mt-1"
            >
              Steady Growth, {levelInfo.title}
            </h2>
            <p className="text-[14px] text-[#D7F3C2] mt-1">
              You averaged {weeklyAverageRate}% ritual completion this week.
            </p>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-[#E7F2DF] p-3.5">
              <Sparkles className="w-5 h-5 text-[#4B7C00] mx-auto" strokeWidth={2.5} aria-hidden="true" />
              <p className="font-display font-extrabold text-xl text-[#1A260E] mt-1.5 tabular-nums">
                +{weeklyXp}
              </p>
              <p className="text-[12px] font-semibold text-[#586251]">Weekly XP</p>
            </div>

            <div className="rounded-2xl bg-[#FFF0D4] p-3.5">
              <Flame className="w-5 h-5 text-[#CC8400] mx-auto" fill="currentColor" aria-hidden="true" />
              <p className="font-display font-extrabold text-xl text-[#995F00] mt-1.5 tabular-nums">
                {bestStreak}d
              </p>
              <p className="text-[12px] font-semibold text-[#995F00]">Top Streak</p>
            </div>

            <div className="rounded-2xl bg-[#D9E2FF] p-3.5">
              <Trophy className="w-5 h-5 text-[#395CA7] mx-auto" strokeWidth={2.5} aria-hidden="true" />
              <p className="font-display font-extrabold text-xl text-[#143E88] mt-1.5 tabular-nums">
                {perfectDaysCount}
              </p>
              <p className="text-[12px] font-semibold text-[#143E88]">Full Sweeps</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="zest-btn-primary w-full rounded-full min-h-[48px] text-[15px] font-bold cursor-pointer"
          >
            Keep Growing
          </button>
        </div>
      </div>
    </div>
  );
}
