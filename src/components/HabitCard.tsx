import { Check, Flame } from 'lucide-react';
import type { Habit } from '../types/habit';
import { getCategoryIconColors, HabitIcon } from './Icons';

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  streak: number;
  onToggle: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
}

export function HabitCard({
  habit,
  isCompleted,
  streak,
  onToggle,
  onEdit,
}: HabitCardProps) {
  const iconColors = getCategoryIconColors(habit.category);

  return (
    <article
      data-testid={`habit-card-${habit.id}`}
      className={`zest-card-hover rounded-3xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 transition-colors duration-200 ${
        isCompleted
          ? 'bg-[#F2F9ED] border-2 border-[#538900] shadow-[0px_4px_12px_rgba(26,38,14,0.03)]'
          : 'bg-[#FDFFFB] border-2 border-[#D8E0D1]/75 shadow-[0px_4px_12px_rgba(26,38,14,0.04)]'
      }`}
    >
      {/* Left Circular Category Icon Badge */}
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center transition-colors ${
          isCompleted ? 'bg-[#D7F3C2] text-[#3D6700]' : `${iconColors.bg} ${iconColors.text}`
        }`}
      >
        <HabitIcon icon={habit.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>

      {/* Middle Details (accessible button to inspect/edit habit) */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onEdit(habit)}
          className="text-left w-full group rounded-lg focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-2 cursor-pointer"
        >
          <h3
            className={`font-display font-bold text-base sm:text-lg leading-snug truncate transition-colors ${
              isCompleted
                ? 'line-through text-[#586251]'
                : 'text-[#1A260E] group-hover:text-[#4B7C00]'
            }`}
          >
            {habit.title}
          </h3>
          <p className="text-[12px] sm:text-[13px] text-[#586251] mt-0.5 truncate">
            <span>{habit.timeOfDay}</span>
            <span aria-hidden="true"> · </span>
            <span>{habit.durationMinutes} min</span>
            <span aria-hidden="true"> · </span>
            <span className="font-semibold text-[#4B7C00] tabular-nums">
              +{habit.xpReward} XP
            </span>
          </p>
        </button>
      </div>

      {/* Streak Badge */}
      {streak > 0 && (
        <div
          className="inline-flex items-center gap-1 rounded-full bg-[#FDFFFB] border-2 border-[#CC8400]/30 px-2 sm:px-2.5 py-0.5 sm:py-1 shrink-0"
          title={`${streak}-day streak`}
        >
          <Flame
            className="w-4 h-4 text-[#CC8400]"
            fill="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="font-display font-bold text-sm text-[#995F00] tabular-nums">
            {streak}
          </span>
        </div>
      )}

      {/* Tactile 44x44px+ Squircle Check Target */}
      <button
        type="button"
        onClick={() => onToggle(habit.id)}
        aria-pressed={isCompleted}
        aria-label={
          isCompleted
            ? `Mark ${habit.title} as pending`
            : `Complete ${habit.title}`
        }
        className={`zest-check-target min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-2 ${
          isCompleted
            ? 'bg-[#4B7C00] border-2 border-[#3C6300] text-white animate-check-pop'
            : 'bg-[#E7F2DF] border-2 border-[#D8E0D1] text-transparent hover:border-[#538900]/60'
        }`}
      >
        <Check className="w-6 h-6" strokeWidth={3} aria-hidden="true" />
      </button>
    </article>
  );
}
