import { Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  Habit,
  HabitCadence,
  HabitCategory,
  HabitFormInput,
  HabitIconId,
  HabitTimeOfDay,
} from '../types/habit';
import { HABIT_CATEGORIES, validateHabitInput } from '../utils/habits';
import { HabitIcon } from './Icons';

interface HabitModalProps {
  isOpen: boolean;
  editingHabit: Habit | null;
  onClose: () => void;
  onSave: (input: HabitFormInput, existingId?: string) => void;
  onDelete?: (habitId: string) => void;
}

const ICON_OPTIONS: Array<{ id: HabitIconId; label: string }> = [
  { id: 'droplets', label: 'Water' },
  { id: 'sun', label: 'Sunlight' },
  { id: 'wind', label: 'Breathwork' },
  { id: 'footprints', label: 'Walk' },
  { id: 'book', label: 'Read' },
  { id: 'moon', label: 'Sleep' },
  { id: 'apple', label: 'Nutrition' },
  { id: 'dumbbell', label: 'Strength' },
  { id: 'pen', label: 'Journal' },
  { id: 'coffee', label: 'Morning brew' },
  { id: 'heart', label: 'Self care' },
  { id: 'sparkles', label: 'Mindset' },
];

const TIME_OPTIONS: HabitTimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
const CADENCE_OPTIONS: HabitCadence[] = ['Daily', 'Weekdays', '3x / week'];
const XP_OPTIONS = [20, 25, 35, 40];

export function HabitModal({
  isOpen,
  editingHabit,
  onClose,
  onSave,
  onDelete,
}: HabitModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HabitCategory>('Wellness');
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay>('Morning');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [cadence, setCadence] = useState<HabitCadence>('Daily');
  const [xpReward, setXpReward] = useState<number>(25);
  const [icon, setIcon] = useState<HabitIconId>('sparkles');
  const [errors, setErrors] = useState<{ title?: string; durationMinutes?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editingHabit) {
      setTitle(editingHabit.title);
      setCategory(editingHabit.category);
      setTimeOfDay(editingHabit.timeOfDay);
      setDurationMinutes(editingHabit.durationMinutes);
      setCadence(editingHabit.cadence);
      setXpReward(editingHabit.xpReward);
      setIcon(editingHabit.icon);
    } else {
      setTitle('');
      setCategory('Wellness');
      setTimeOfDay('Morning');
      setDurationMinutes(15);
      setCadence('Daily');
      setXpReward(25);
      setIcon('sparkles');
    }
    setErrors({});
  }, [isOpen, editingHabit]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload: HabitFormInput = {
      title,
      category,
      timeOfDay,
      durationMinutes,
      cadence,
      xpReward,
      icon,
    };
    const validation = validateHabitInput(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    onSave({ ...payload, title: payload.title.trim() }, editingHabit?.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#131F08]/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-modal-title"
        className="zest-modal-in w-full sm:max-w-lg bg-[#FDFFFB] border-2 border-[#D8E0D1] rounded-t-3xl sm:rounded-3xl shadow-[0px_12px_36px_rgba(26,38,14,0.18)] max-h-[92vh] overflow-y-auto"
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1.5 bg-[#D8E0D1] rounded-full mx-auto mt-3" aria-hidden="true" />

        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="habit-modal-title"
              className="font-display font-bold text-2xl text-[#1A260E]"
            >
              {editingHabit ? 'Edit Ritual' : 'New Daily Ritual'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-11 h-11 rounded-full bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
            {/* Title */}
            <div>
              <label
                htmlFor="habit-title-input"
                className="block text-sm font-bold text-[#1A260E] mb-2"
              >
                Ritual Name
              </label>
              <input
                id="habit-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                onBlur={() => {
                  const res = validateHabitInput({
                    title,
                    category,
                    timeOfDay,
                    durationMinutes,
                    cadence,
                    xpReward,
                    icon,
                  });
                  if (res.errors.title) {
                    setErrors((prev) => ({ ...prev, title: res.errors.title }));
                  }
                }}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'habit-title-error' : undefined}
                placeholder="e.g. Read 20 Pages"
                className="zest-input w-full h-14 rounded-2xl px-4 text-[15px] font-medium"
                autoFocus
              />
              {errors.title && (
                <p id="habit-title-error" role="alert" className="text-sm font-semibold text-[#BA1A1A] mt-1.5">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <span className="block text-sm font-bold text-[#1A260E] mb-2">
                Category
              </span>
              <div className="flex flex-wrap gap-2">
                {HABIT_CATEGORIES.map((cat) => {
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={selected}
                      className={`rounded-full px-4 min-h-[44px] text-sm font-bold cursor-pointer transition-colors ${
                        selected
                          ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                          : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time of Day & Cadence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="habit-time-select"
                  className="block text-sm font-bold text-[#1A260E] mb-2"
                >
                  Time of Day
                </label>
                <select
                  id="habit-time-select"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value as HabitTimeOfDay)}
                  className="zest-input w-full h-14 rounded-2xl px-4 text-[15px] font-medium"
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="habit-cadence-select"
                  className="block text-sm font-bold text-[#1A260E] mb-2"
                >
                  Cadence
                </label>
                <select
                  id="habit-cadence-select"
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value as HabitCadence)}
                  className="zest-input w-full h-14 rounded-2xl px-4 text-[15px] font-medium"
                >
                  {CADENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration & XP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="habit-duration-input"
                  className="block text-sm font-bold text-[#1A260E] mb-2"
                >
                  Duration (minutes)
                </label>
                <input
                  id="habit-duration-input"
                  type="number"
                  min={1}
                  max={240}
                  value={Number.isNaN(durationMinutes) ? '' : durationMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setDurationMinutes(Number.isNaN(val) ? 0 : val);
                    if (errors.durationMinutes) {
                      setErrors((prev) => ({ ...prev, durationMinutes: undefined }));
                    }
                  }}
                  className="zest-input w-full h-14 rounded-2xl px-4 text-[15px] font-medium tabular-nums"
                />
                {errors.durationMinutes && (
                  <p role="alert" className="text-sm font-semibold text-[#BA1A1A] mt-1.5">
                    {errors.durationMinutes}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-sm font-bold text-[#1A260E] mb-2">
                  XP Reward
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {XP_OPTIONS.map((xp) => {
                    const selected = xpReward === xp;
                    return (
                      <button
                        key={xp}
                        type="button"
                        onClick={() => setXpReward(xp)}
                        aria-pressed={selected}
                        className={`h-14 rounded-2xl text-sm font-bold tabular-nums cursor-pointer transition-colors ${
                          selected
                            ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                            : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                        }`}
                      >
                        +{xp}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <span className="block text-sm font-bold text-[#1A260E] mb-2">
                Icon
              </span>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((item) => {
                  const selected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      aria-label={`Choose ${item.label} icon`}
                      aria-pressed={selected}
                      className={`min-h-[46px] rounded-2xl flex items-center justify-center cursor-pointer transition-colors ${
                        selected
                          ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                          : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                      }`}
                    >
                      <HabitIcon icon={item.id} className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {editingHabit && onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingHabit.id);
                    onClose();
                  }}
                  aria-label={`Delete ${editingHabit.title}`}
                  className="min-h-[48px] px-4 rounded-full bg-[#FFDAD6] text-[#93000A] font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                  <span>Delete</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="zest-btn-secondary rounded-full px-5 min-h-[48px] text-[15px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="zest-btn-primary rounded-full px-6 min-h-[48px] text-[15px] font-bold cursor-pointer"
                >
                  {editingHabit ? 'Save Changes' : 'Save Ritual'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
