import { Archive, Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Habit, RoutineTemplate } from '../types/habit';
import { ROUTINE_TEMPLATES } from '../utils/habits';
import { getCategoryIconColors, HabitIcon } from './Icons';

interface RoutinesViewProps {
  habits: Habit[];
  onAddTemplate: (template: RoutineTemplate) => void;
  onEditHabit: (habit: Habit) => void;
  onToggleArchive: (habitId: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onOpenNewHabit: () => void;
}

export function RoutinesView({
  habits,
  onAddTemplate,
  onEditHabit,
  onToggleArchive,
  onDeleteHabit,
  onOpenNewHabit,
}: RoutinesViewProps) {
  const existingTitles = new Set(habits.map((h) => h.title.trim().toLowerCase()));
  const activeHabits = habits.filter((h) => !h.archived);
  const archivedHabits = habits.filter((h) => h.archived);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-[34px] sm:text-[40px] leading-[1.12] tracking-[-0.025em] text-[#1A260E]">
            Ritual Library
          </h1>
          <p className="text-[15px] text-[#586251] mt-1">
            Explore proven daily habits or fine-tune your personal lineup.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewHabit}
          className="zest-btn-primary rounded-full px-5 min-h-[44px] inline-flex items-center gap-1.5 text-sm font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
          <span>Custom Habit</span>
        </button>
      </div>

      {/* Curated Starter Templates */}
      <section aria-label="Curated ritual templates" className="space-y-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-[#1A260E]">
            Starter Rituals
          </h2>
          <p className="text-[14px] text-[#586251]">
            Tap to add directly to your Today schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROUTINE_TEMPLATES.map((tpl) => {
            const alreadyAdded = existingTitles.has(tpl.title.trim().toLowerCase());
            const iconColors = getCategoryIconColors(tpl.category);

            return (
              <article
                key={tpl.id}
                className="zest-card rounded-3xl p-5 flex items-start gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${iconColors.bg} ${iconColors.text}`}
                >
                  <HabitIcon icon={tpl.icon} className="w-6 h-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-lg text-[#1A260E]">
                    {tpl.title}
                  </h3>
                  <p className="text-[13px] text-[#586251] mt-0.5">
                    {tpl.category} · {tpl.timeOfDay} · {tpl.durationMinutes} min · +{tpl.xpReward} XP
                  </p>
                  <p className="text-[14px] text-[#586251] mt-2 leading-snug">
                    {tpl.benefit}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => onAddTemplate(tpl)}
                  aria-label={
                    alreadyAdded
                      ? `${tpl.title} already in your day`
                      : `Add ${tpl.title} to your day`
                  }
                  className={`rounded-full px-4 min-h-[44px] text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    alreadyAdded
                      ? 'bg-[#E7F2DF] text-[#4B7C00] cursor-default'
                      : 'zest-btn-secondary cursor-pointer'
                  }`}
                >
                  {alreadyAdded ? (
                    <>
                      <Check className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Manage Active & Archived Habits */}
      <section aria-label="Manage your rituals" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-2xl text-[#1A260E]">
            Your Active Lineup ({activeHabits.length})
          </h2>
        </div>

        <div className="zest-card rounded-3xl divide-y divide-[#D8E0D1]/70">
          {activeHabits.length > 0 ? (
            activeHabits.map((habit) => {
              const iconColors = getCategoryIconColors(habit.category);
              return (
                <div
                  key={habit.id}
                  className="p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center ${iconColors.bg} ${iconColors.text}`}
                    >
                      <HabitIcon icon={habit.icon} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-base text-[#1A260E] truncate">
                        {habit.title}
                      </p>
                      <p className="text-[13px] text-[#586251]">
                        {habit.category} · {habit.cadence} · {habit.timeOfDay} · +{habit.xpReward} XP
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditHabit(habit)}
                      aria-label={`Edit ${habit.title}`}
                      className="min-h-[44px] min-w-[44px] px-3 rounded-2xl bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleArchive(habit.id)}
                      aria-label={`Pause ${habit.title}`}
                      className="min-h-[44px] min-w-[44px] px-3 rounded-2xl bg-[#E7F2DF] text-[#586251] hover:text-[#1A260E] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Archive className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
                      <span>Pause</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHabit(habit.id)}
                      aria-label={`Delete ${habit.title}`}
                      className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#FFDAD6]/70 text-[#93000A] hover:bg-[#FFDAD6] inline-flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-[15px] text-[#586251]">
              No active habits. Add a starter ritual above or create your own!
            </div>
          )}
        </div>

        {archivedHabits.length > 0 && (
          <div className="pt-2 space-y-3">
            <h3 className="font-display font-bold text-lg text-[#586251]">
              Paused Rituals ({archivedHabits.length})
            </h3>
            <div className="zest-card rounded-3xl divide-y divide-[#D8E0D1]/70">
              {archivedHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-base text-[#586251] truncate">
                      {habit.title}
                    </p>
                    <p className="text-[13px] text-[#586251]">
                      {habit.category} · Paused
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleArchive(habit.id)}
                      aria-label={`Restore ${habit.title}`}
                      className="zest-btn-secondary rounded-full px-4 min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHabit(habit.id)}
                      aria-label={`Delete ${habit.title}`}
                      className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#FFDAD6]/70 text-[#93000A] hover:bg-[#FFDAD6] inline-flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
