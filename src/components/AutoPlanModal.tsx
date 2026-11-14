import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Habit } from '../types/habit';
import type { AiProposedBlock, PlannerTask, TimeBlock } from '../types/planner';
import { formatMinutesLabel, getCategoryStyles } from '../utils/planner';
import { aiFetch } from '../lib/apiKey';
import { ApiKeyNotice } from './ApiKeyNotice';

interface AutoPlanModalProps {
  isOpen: boolean;
  dateKey: string;
  habits: Habit[];
  completedHabitIds: string[];
  tasks: PlannerTask[];
  existingBlocks: TimeBlock[];
  onClose: () => void;
  onApplySchedule: (blocks: AiProposedBlock[]) => void;
}

export function AutoPlanModal({
  isOpen,
  dateKey,
  habits,
  completedHabitIds,
  tasks,
  existingBlocks,
  onClose,
  onApplySchedule,
}: AutoPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryRationale, setSummaryRationale] = useState('');
  const [proposedBlocks, setProposedBlocks] = useState<AiProposedBlock[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const runAutoPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const completedSet = new Set(completedHabitIds);
      const scheduledHabitIds = new Set(
        existingBlocks.map((b) => b.habitId).filter(Boolean),
      );
      const scheduledTaskIds = new Set(
        existingBlocks.map((b) => b.taskId).filter(Boolean),
      );

      const pendingHabits = habits
        .filter((h) => !h.archived && !completedSet.has(h.id) && !scheduledHabitIds.has(h.id))
        .map((h) => ({
          id: h.id,
          title: h.title,
          category: h.category,
          timeOfDay: h.timeOfDay,
          durationMinutes: h.durationMinutes,
        }));

      const unscheduledTasks = tasks
        .filter(
          (t) =>
            !t.completed &&
            t.dateKey === dateKey &&
            t.startMinutes === null &&
            !scheduledTaskIds.has(t.id),
        )
        .map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          priority: t.priority,
          durationMinutes: t.durationMinutes,
          notes: t.notes,
        }));

      const fixedBlocks = existingBlocks.map((b) => ({
        title: b.title,
        startMinutes: b.startMinutes,
        endMinutes: b.endMinutes,
        category: b.category,
        source: b.source,
      }));

      const res = await aiFetch('/api/ai/auto-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateKey,
          pendingHabits,
          unscheduledTasks,
          fixedBlocks,
        }),
      });

      const data = (await res.json()) as {
        summaryRationale?: string;
        blocks?: AiProposedBlock[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Could not generate your AI daily plan.');
      }

      const nextBlocks = Array.isArray(data.blocks) ? data.blocks : [];
      setSummaryRationale(data.summaryRationale || '');
      setProposedBlocks(nextBlocks);
      setSelectedIndices(new Set(nextBlocks.map((_, idx) => idx)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void runAutoPlan();
  }, [isOpen, dateKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleBlockIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleApply = () => {
    const chosen = proposedBlocks.filter((_, idx) => selectedIndices.has(idx));
    onApplySchedule(chosen);
    onClose();
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
        aria-labelledby="auto-plan-modal-title"
        className="zest-modal-in w-full sm:max-w-xl bg-[#FDFFFB] border-2 border-[#D8E0D1] rounded-t-3xl sm:rounded-3xl shadow-[0px_12px_36px_rgba(26,38,14,0.18)] max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div
          className="sm:hidden w-10 h-1.5 bg-[#D8E0D1] rounded-full mx-auto mt-3 shrink-0"
          aria-hidden="true"
        />

        <div className="p-6 pb-4 border-b border-[#D8E0D1]/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E7F2DF] text-[#4B7C00] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="auto-plan-modal-title"
                className="font-display font-bold text-xl sm:text-2xl text-[#1A260E]"
              >
                AI Daily Schedule Plan
              </h2>
              <p className="text-xs font-semibold text-[#586251] tabular-nums">
                Smart time blocks for {dateKey}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI planner modal"
            className="w-10 h-10 rounded-full bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <ApiKeyNotice />
          {loading ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E7F2DF] text-[#4B7C00] flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="font-display font-bold text-lg text-[#1A260E]">
                Balancing your rituals &amp; priorities...
              </p>
              <p className="text-sm text-[#586251] max-w-sm mx-auto">
                Finding open focus windows around your fixed events without overload.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-[#FFDAD6]/60 border border-[#BA1A1A]/30 p-4 text-center space-y-3">
              <p className="text-sm font-semibold text-[#93000A]">{error}</p>
              <button
                type="button"
                onClick={() => void runAutoPlan()}
                className="zest-btn-secondary rounded-full px-5 min-h-[40px] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Try Again
              </button>
            </div>
          ) : (
            <div data-testid="autoplan-ready" className="space-y-4">
              {summaryRationale && (
                <div className="rounded-2xl bg-[#E7F2DF] border border-[#C6DAB7] p-4">
                  <p className="text-sm font-medium text-[#1A260E] leading-relaxed">
                    {summaryRationale}
                  </p>
                </div>
              )}

              {proposedBlocks.length > 0 ? (
                <div className="space-y-2.5">
                  {proposedBlocks.map((block, idx) => {
                    const styles = getCategoryStyles(block.category);
                    const selected = selectedIndices.has(idx);
                    return (
                      <button
                        key={`${block.title}-${block.startMinutes}-${idx}`}
                        type="button"
                        onClick={() => toggleBlockIndex(idx)}
                        className={`w-full text-left rounded-2xl border p-3.5 transition-all cursor-pointer flex items-start gap-3 ${
                          selected
                            ? `${styles.bg} ${styles.border}`
                            : 'bg-[#F8FBF5] border-[#D8E0D1] opacity-60'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            selected
                              ? 'bg-[#4B7C00] border-[#4B7C00] text-white'
                              : 'bg-white border-[#B9C5AE]'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-display font-bold text-[15px] text-[#1A260E]">
                              {block.title}
                            </span>
                            <span className="text-xs font-bold tabular-nums text-[#3C6300] whitespace-nowrap">
                              {formatMinutesLabel(block.startMinutes)} –{' '}
                              {formatMinutesLabel(block.endMinutes)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`w-2 h-2 rounded-full ${styles.dot}`}
                              aria-hidden="true"
                            />
                            <span className="text-[11px] font-bold text-[#586251]">
                              {block.category} · {block.habitId ? 'Daily Ritual' : 'Task'}
                            </span>
                          </div>
                          <p className="text-xs text-[#586251] mt-1">{block.rationale}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#F8FBF5] border border-[#D8E0D1] p-6 text-center">
                  <p className="text-sm font-semibold text-[#586251]">
                    Everything pending for {dateKey} is already placed on your timeline.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#D8E0D1]/70 bg-[#FDFFFB] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAutoPlan()}
            className="zest-btn-secondary rounded-full px-4 min-h-[44px] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Regenerate
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 min-h-[44px] bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] text-sm font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || selectedIndices.size === 0}
              onClick={handleApply}
              className="zest-btn-primary rounded-full px-6 min-h-[44px] text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              Apply Schedule ({selectedIndices.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
