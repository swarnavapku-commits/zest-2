import { Award, CheckCircle2, Flame, Lock, Sparkles, Trophy } from 'lucide-react';
import type { BadgeInfo, LevelInfo } from '../types/habit';
import { SproutMascot } from './Icons';

interface RewardsViewProps {
  levelInfo: LevelInfo;
  badges: BadgeInfo[];
}

export function RewardsView({ levelInfo, badges }: RewardsViewProps) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-[34px] sm:text-[40px] leading-[1.12] tracking-[-0.025em] text-[#1A260E]">
          Rewards & Milestones
        </h1>
        <p className="text-[15px] text-[#586251] mt-1">
          Grow your botanical companion and collect achievement badges.
        </p>
      </div>

      {/* Character Progression Showcase */}
      <section
        aria-label="Character level progression"
        className="rounded-3xl bg-[#1C3400] text-white p-6 sm:p-8 shadow-[0px_8px_24px_rgba(26,38,14,0.12)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <SproutMascot className="w-24 h-24 shrink-0 zest-media-fade" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#B6F56D]">
              Level {levelInfo.level} Companion
            </p>
            <h2 className="font-display font-extrabold text-3xl text-white mt-1">
              {levelInfo.title}
            </h2>
            <p className="text-[15px] text-[#D7F3C2] mt-1 tabular-nums">
              {levelInfo.totalXp.toLocaleString()} XP total · {levelInfo.xpNeededForNext} XP until{' '}
              <span className="font-bold text-white">{levelInfo.nextTitle}</span>
            </p>

            <div className="mt-4 h-4 w-full rounded-full bg-[#2E4F00] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#B6F56D] transition-[width] duration-300"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <p className="text-[13px] text-[#D7F3C2]">Badges Unlocked</p>
            <p className="font-display font-extrabold text-3xl text-[#FFB95A] mt-0.5 tabular-nums">
              {unlockedCount} / {badges.length}
            </p>
          </div>
        </div>
      </section>

      {/* Badges Grid */}
      <section aria-label="Achievement badges" className="space-y-4">
        <h2 className="font-display font-bold text-2xl text-[#1A260E]">
          Achievement Badges
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const pct = Math.min(
              100,
              Math.round((badge.currentValue / badge.targetValue) * 100),
            );
            const IconComp =
              badge.category === 'Streak'
                ? Flame
                : badge.category === 'Mastery'
                  ? Trophy
                  : Sparkles;

            return (
              <article
                key={badge.id}
                className={`rounded-3xl p-5 flex flex-col justify-between gap-4 transition-colors ${
                  badge.unlocked
                    ? 'zest-card border-[#538900]/50'
                    : 'bg-[#E7F2DF]/60 border-2 border-[#D8E0D1]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        badge.unlocked
                          ? 'bg-[#FFF0D4] text-[#CC8400]'
                          : 'bg-[#D8E0D1]/70 text-[#586251]'
                      }`}
                    >
                      <IconComp
                        className="w-6 h-6"
                        fill={badge.unlocked && badge.category === 'Streak' ? 'currentColor' : 'none'}
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    </div>

                    {badge.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4B7C00]">
                        <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                        <span>Earned</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#586251]">
                        <Lock className="w-3.5 h-3.5" strokeWidth={2.3} aria-hidden="true" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#1A260E] mt-4">
                    {badge.title}
                  </h3>
                  <p className="text-[14px] text-[#586251] mt-1 leading-snug">
                    {badge.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#586251] mb-1.5 tabular-nums">
                    <span>{badge.category}</span>
                    <span>
                      {badge.currentValue} / {badge.targetValue}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#E7F2DF] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        badge.unlocked ? 'bg-[#4B7C00]' : 'bg-[#8DAEFF]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Level Roadmap */}
      <section aria-label="Growth path" className="zest-card rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#4B7C00]" strokeWidth={2.5} aria-hidden="true" />
          <h2 className="font-display font-bold text-xl text-[#1A260E]">
            XP Reward Guide
          </h2>
        </div>
        <p className="text-[14px] text-[#586251] mt-1">
          Every completed ritual earns +20 to +40 XP toward your next botanical tier (350 XP per level).
        </p>
      </section>
    </div>
  );
}
