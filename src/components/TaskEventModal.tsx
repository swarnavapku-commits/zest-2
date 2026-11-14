import { Calendar, CheckCircle2, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  PlannerCategory,
  PlannerTask,
  PlannerTaskInput,
  TaskPriority,
} from '../types/planner';
import {
  minutesToTimeInput,
  PLANNER_CATEGORIES,
  TASK_PRIORITIES,
  validatePlannerTaskInput,
} from '../utils/planner';

interface TaskEventModalProps {
  isOpen: boolean;
  defaultDateKey: string;
  defaultStartMinutes?: number | null;
  editingTask: PlannerTask | null;
  googleConnected: boolean;
  onClose: () => void;
  onSave: (input: PlannerTaskInput, existingId?: string) => Promise<void> | void;
  onDelete?: (taskId: string) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function TaskEventModal({
  isOpen,
  defaultDateKey,
  defaultStartMinutes,
  editingTask,
  googleConnected,
  onClose,
  onSave,
  onDelete,
}: TaskEventModalProps) {
  const [title, setTitle] = useState('');
  const [dateKey, setDateKey] = useState(defaultDateKey);
  const [scheduled, setScheduled] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [category, setCategory] = useState<PlannerCategory>('Focus');
  const [notes, setNotes] = useState('');
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState(false);
  const [awaitingGoogleConfirm, setAwaitingGoogleConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    dateKey?: string;
    time?: string;
    durationMinutes?: string;
  }>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDateKey(editingTask.dateKey);
      const hasTime =
        typeof editingTask.startMinutes === 'number' &&
        typeof editingTask.endMinutes === 'number';
      setScheduled(hasTime);
      setStartTime(
        hasTime ? minutesToTimeInput(editingTask.startMinutes!) : '09:00',
      );
      setEndTime(hasTime ? minutesToTimeInput(editingTask.endMinutes!) : '09:45');
      setDurationMinutes(editingTask.durationMinutes || 30);
      setPriority(editingTask.priority);
      setCategory(editingTask.category);
      setNotes(editingTask.notes || '');
      setSyncToGoogleCalendar(Boolean(editingTask.googleEventId));
    } else {
      setTitle('');
      setDateKey(defaultDateKey);
      const startMin =
        typeof defaultStartMinutes === 'number' ? defaultStartMinutes : 10 * 60;
      const endMin = Math.min(23 * 60, startMin + 45);
      setScheduled(defaultStartMinutes !== null);
      setStartTime(minutesToTimeInput(startMin));
      setEndTime(minutesToTimeInput(endMin));
      setDurationMinutes(45);
      setPriority('Medium');
      setCategory('Focus');
      setNotes('');
      setSyncToGoogleCalendar(false);
    }
    setAwaitingGoogleConfirm(false);
    setSubmitting(false);
    setErrors({});
  }, [isOpen, editingTask, defaultDateKey, defaultStartMinutes]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const buildPayload = (): PlannerTaskInput => ({
    title,
    dateKey,
    scheduled,
    startTime,
    endTime,
    durationMinutes,
    priority,
    category,
    notes,
    syncToGoogleCalendar: scheduled && syncToGoogleCalendar,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    const validation = validatePlannerTaskInput(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (
      payload.syncToGoogleCalendar &&
      !editingTask?.googleEventId &&
      !awaitingGoogleConfirm
    ) {
      setAwaitingGoogleConfirm(true);
      return;
    }

    setSubmitting(true);
    try {
      await onSave({ ...payload, title: payload.title.trim() }, editingTask?.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#131F08]/55 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="zest-modal-in w-full sm:max-w-lg bg-[#FDFFFB] border-2 border-[#D8E0D1] rounded-t-3xl sm:rounded-3xl shadow-[0px_12px_36px_rgba(26,38,14,0.18)] max-h-[92vh] overflow-y-auto"
      >
        <div
          className="sm:hidden w-10 h-1.5 bg-[#D8E0D1] rounded-full mx-auto mt-3"
          aria-hidden="true"
        />

        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="task-modal-title"
              className="font-display font-bold text-2xl text-[#1A260E]"
            >
              {editingTask ? 'Edit Task / Event' : 'New Task / Event'}
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

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="planner-task-title"
                className="block text-sm font-bold text-[#1A260E] mb-1.5"
              >
                Title
              </label>
              <input
                id="planner-task-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                onBlur={() => {
                  const res = validatePlannerTaskInput(buildPayload());
                  if (res.errors.title) {
                    setErrors((prev) => ({ ...prev, title: res.errors.title }));
                  }
                }}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'planner-title-error' : undefined}
                placeholder="e.g. Strategy Review or Dentist Visit"
                className="zest-input w-full h-13 rounded-2xl px-4 text-[15px] font-medium"
                autoFocus
              />
              {errors.title && (
                <p
                  id="planner-title-error"
                  role="alert"
                  className="text-sm font-semibold text-[#BA1A1A] mt-1.5"
                >
                  {errors.title}
                </p>
              )}
            </div>

            {/* Date & Scheduling Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="planner-task-date"
                  className="block text-sm font-bold text-[#1A260E] mb-1.5"
                >
                  Date
                </label>
                <input
                  id="planner-task-date"
                  type="date"
                  value={dateKey}
                  onChange={(e) => {
                    setDateKey(e.target.value);
                    if (errors.dateKey) {
                      setErrors((prev) => ({ ...prev, dateKey: undefined }));
                    }
                  }}
                  className="zest-input w-full h-13 rounded-2xl px-4 text-[15px] font-medium tabular-nums"
                />
                {errors.dateKey && (
                  <p role="alert" className="text-sm font-semibold text-[#BA1A1A] mt-1">
                    {errors.dateKey}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-sm font-bold text-[#1A260E] mb-1.5">
                  Schedule Mode
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduled(true);
                      setErrors((prev) => ({ ...prev, durationMinutes: undefined }));
                    }}
                    aria-pressed={scheduled}
                    className={`h-13 rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                      scheduled
                        ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                        : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                    }`}
                  >
                    Time Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduled(false);
                      setAwaitingGoogleConfirm(false);
                      setErrors((prev) => ({ ...prev, time: undefined }));
                    }}
                    aria-pressed={!scheduled}
                    className={`h-13 rounded-2xl text-xs font-bold cursor-pointer transition-colors ${
                      !scheduled
                        ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                        : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                    }`}
                  >
                    Unscheduled
                  </button>
                </div>
              </div>
            </div>

            {/* Start / End Time OR Duration */}
            {scheduled ? (
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="planner-start-time"
                      className="block text-sm font-bold text-[#1A260E] mb-1.5"
                    >
                      Start Time
                    </label>
                    <input
                      id="planner-start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (errors.time) setErrors((prev) => ({ ...prev, time: undefined }));
                      }}
                      className="zest-input w-full h-13 rounded-2xl px-4 text-[15px] font-medium tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="planner-end-time"
                      className="block text-sm font-bold text-[#1A260E] mb-1.5"
                    >
                      End Time
                    </label>
                    <input
                      id="planner-end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        if (errors.time) setErrors((prev) => ({ ...prev, time: undefined }));
                      }}
                      className="zest-input w-full h-13 rounded-2xl px-4 text-[15px] font-medium tabular-nums"
                    />
                  </div>
                </div>
                {errors.time && (
                  <p role="alert" className="text-sm font-semibold text-[#BA1A1A] mt-1.5">
                    {errors.time}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <span className="block text-sm font-bold text-[#1A260E] mb-1.5">
                  Estimated Duration (minutes)
                </span>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((mins) => {
                    const selected = durationMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        aria-pressed={selected}
                        className={`rounded-full px-4 min-h-[40px] text-xs font-bold tabular-nums cursor-pointer transition-colors ${
                          selected
                            ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                            : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                        }`}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>
                {errors.durationMinutes && (
                  <p role="alert" className="text-sm font-semibold text-[#BA1A1A] mt-1">
                    {errors.durationMinutes}
                  </p>
                )}
              </div>
            )}

            {/* Priority */}
            <div>
              <span className="block text-sm font-bold text-[#1A260E] mb-1.5">
                Priority Level
              </span>
              <div className="grid grid-cols-3 gap-2">
                {TASK_PRIORITIES.map((lvl) => {
                  const selected = priority === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      aria-pressed={selected}
                      className={`min-h-[42px] rounded-2xl text-sm font-bold cursor-pointer transition-colors ${
                        selected
                          ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                          : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <span className="block text-sm font-bold text-[#1A260E] mb-1.5">
                Category
              </span>
              <div className="flex flex-wrap gap-2">
                {PLANNER_CATEGORIES.map((cat) => {
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={selected}
                      className={`rounded-full px-3.5 min-h-[40px] text-xs font-bold cursor-pointer transition-colors ${
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

            {/* Notes */}
            <div>
              <label
                htmlFor="planner-task-notes"
                className="block text-sm font-bold text-[#1A260E] mb-1.5"
              >
                Notes
              </label>
              <textarea
                id="planner-task-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional context, links, or checklist notes..."
                className="zest-input w-full rounded-2xl p-3.5 text-sm font-medium resize-none"
              />
            </div>

            {/* Also add to Google Calendar toggle */}
            {scheduled && !editingTask?.googleEventId && (
              <div className="rounded-2xl bg-[#E7F2DF]/70 border border-[#D8E0D1] p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToGoogleCalendar}
                    onChange={(e) => {
                      setSyncToGoogleCalendar(e.target.checked);
                      setAwaitingGoogleConfirm(false);
                    }}
                    className="mt-0.5 w-4 h-4 accent-[#4B7C00] cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1A260E]">
                      <Calendar className="w-4 h-4 text-[#4B7C00]" aria-hidden="true" />
                      Also add to Google Calendar
                    </span>
                    <p className="text-xs text-[#586251] mt-0.5">
                      {googleConnected
                        ? 'Publishes this scheduled block to your primary Google Calendar.'
                        : 'You will be asked to authorize Google Calendar when saving.'}
                    </p>
                  </div>
                </label>

                {awaitingGoogleConfirm && (
                  <div
                    role="status"
                    className="mt-3 rounded-xl bg-[#FDFFFB] border border-[#9AD06D] p-3 flex items-start gap-2.5"
                  >
                    <CheckCircle2
                      className="w-4 h-4 text-[#4B7C00] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-semibold text-[#1A260E]">
                      Ready to create &ldquo;{title.trim()}&rdquo; on your primary Google Calendar ({dateKey}, {startTime}–{endTime}). Click &ldquo;Confirm &amp; Save&rdquo; below to proceed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {editingTask && onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingTask.id);
                    onClose();
                  }}
                  className="min-h-[46px] px-4 rounded-full bg-[#FFDAD6] text-[#93000A] font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
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
                  className="zest-btn-secondary rounded-full px-5 min-h-[46px] text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="zest-btn-primary rounded-full px-6 min-h-[46px] text-sm font-bold cursor-pointer disabled:opacity-60"
                >
                  {submitting
                    ? 'Saving...'
                    : awaitingGoogleConfirm
                      ? 'Confirm & Save'
                      : editingTask
                        ? 'Save Changes'
                        : 'Save Item'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
