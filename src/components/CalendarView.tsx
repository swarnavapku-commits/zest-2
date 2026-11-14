import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DayCompletionMap, Habit } from '../types/habit';
import type {
  CalendarSyncState,
  PlannerCategory,
  PlannerTask,
  TimeBlock,
} from '../types/planner';
import { addDays, formatDateKey } from '../utils/habits';
import {
  formatMinutesLabel,
  getCategoryStyles,
  getMonthCalendarGrid,
  getWeekDatesForKey,
} from '../utils/planner';
import { TimeBlockTimeline } from './TimeBlockTimeline';

export type CalendarSubView = 'month' | 'week' | 'day';

interface CalendarViewProps {
  referenceDate: Date;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  habits: Habit[];
  completions: DayCompletionMap;
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  syncState: CalendarSyncState;
  syncingGoogle: boolean;
  onSyncGoogleCalendar: () => void;
  onOpenAutoPlan: () => void;
  onOpenNewTaskModal: (defaultStartMinutes?: number | null) => void;
  onEditTask: (task: PlannerTask) => void;
  onToggleTask: (taskId: string) => void;
  onToggleHabit: (habitId: string) => void;
  onPlaceItem: (payload: {
    kind: 'task' | 'habit';
    id: string;
    title: string;
    category: PlannerCategory;
    dateKey: string;
    startMinutes: number;
    endMinutes: number;
  }) => void;
  onMoveBlock: (blockId: string, startMinutes: number, endMinutes: number) => void;
  onResizeBlock: (blockId: string, endMinutes: number) => void;
  onRemoveBlock: (blockId: string) => void;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarView({
  referenceDate,
  selectedDateKey,
  onSelectDate,
  habits,
  completions,
  tasks,
  timeBlocks,
  syncState,
  syncingGoogle,
  onSyncGoogleCalendar,
  onOpenAutoPlan,
  onOpenNewTaskModal,
  onEditTask,
  onToggleTask,
  onToggleHabit,
  onPlaceItem,
  onMoveBlock,
  onResizeBlock,
  onRemoveBlock,
}: CalendarViewProps) {
  const [subView, setSubView] = useState<CalendarSubView>('day');

  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const todayKey = formatDateKey(referenceDate);

  const monthGrid = useMemo(
    () =>
      getMonthCalendarGrid(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth(),
      ),
    [selectedDateObj],
  );

  const weekDates = useMemo(
    () => getWeekDatesForKey(selectedDateKey),
    [selectedDateKey],
  );

  const blocksByDate = useMemo(() => {
    const map = new Map<string, TimeBlock[]>();
    for (const blk of timeBlocks) {
      const list = map.get(blk.dateKey) ?? [];
      list.push(blk);
      map.set(blk.dateKey, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startMinutes - b.startMinutes);
    }
    return map;
  }, [timeBlocks]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    for (const t of tasks) {
      const list = map.get(t.dateKey) ?? [];
      list.push(t);
      map.set(t.dateKey, list);
    }
    return map;
  }, [tasks]);

  const handleNavigatePeriod = (dir: -1 | 1) => {
    if (subView === 'month') {
      const next = new Date(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth() + dir,
        1,
      );
      onSelectDate(formatDateKey(next));
    } else if (subView === 'week') {
      onSelectDate(formatDateKey(addDays(selectedDateObj, dir * 7)));
    } else {
      onSelectDate(formatDateKey(addDays(selectedDateObj, dir)));
    }
  };

  const periodTitle = useMemo(() => {
    if (subView === 'month') {
      return selectedDateObj.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
    if (subView === 'week') {
      const first = weekDates[0];
      const last = weekDates[6];
      const [fy, fm, fd] = first.dateKey.split('-').map(Number);
      const [ly, lm, ld] = last.dateKey.split('-').map(Number);
      const fStr = new Date(fy, fm - 1, fd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const lStr = new Date(ly, lm - 1, ld).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `${fStr} – ${lStr}`;
    }
    return selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [subView, selectedDateObj, weekDates]);

  return (
    <div className="space-y-6">
      {/* Header & Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-[32px] sm:text-[38px] leading-[1.12] tracking-[-0.025em] text-[#1A260E]">
            Calendar &amp; Time Planner
          </h1>
          <p className="text-[15px] text-[#586251] mt-1">
            Plan your month, organize weekly sprints, and time-block each day.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSyncGoogleCalendar}
            disabled={syncingGoogle}
            className="rounded-full px-4 min-h-[42px] bg-[#FDFFFB] border-2 border-[#D8E0D1] hover:bg-[#E7F2DF] text-[#1A260E] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {syncingGoogle ? (
              <RefreshCw className="w-4 h-4 text-[#4B7C00] animate-spin" aria-hidden="true" />
            ) : (
              <Calendar className="w-4 h-4 text-[#4B7C00]" aria-hidden="true" />
            )}
            <span>
              {syncingGoogle ? 'Syncing...' : 'Sync Google Calendar'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAutoPlan}
            className="zest-btn-secondary rounded-full px-4 min-h-[42px] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#4B7C00]" aria-hidden="true" />
            <span>Auto-Plan My Day</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewTaskModal(10 * 60)}
            className="zest-btn-primary rounded-full px-4 sm:px-5 min-h-[42px] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
            <span>New Task / Event</span>
          </button>
        </div>
      </div>

      {/* Period Navigation + View Switcher + Google Sync Summary */}
      <div className="zest-card rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleNavigatePeriod(-1)}
            aria-label="Previous period"
            className="w-10 h-10 rounded-full bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onSelectDate(todayKey)}
            className="rounded-full px-3.5 min-h-[38px] bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => handleNavigatePeriod(1)}
            aria-label="Next period"
            className="w-10 h-10 rounded-full bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>

          <h2 className="font-display font-bold text-lg sm:text-xl text-[#1A260E] ml-1 tabular-nums">
            {periodTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
          {syncState.connected && syncState.lastSyncedAt && (
            <span className="text-xs font-semibold text-[#586251] whitespace-nowrap">
              Google synced ({syncState.syncedCount})
            </span>
          )}

          <div
            role="tablist"
            aria-label="Calendar view mode"
            className="inline-flex rounded-full bg-[#E7F2DF] p-1 gap-1"
          >
            {(['month', 'week', 'day'] as CalendarSubView[]).map((mode) => {
              const active = subView === mode;
              const label =
                mode === 'month' ? 'Month' : mode === 'week' ? 'Week' : 'Day';
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSubView(mode)}
                  className={`rounded-full px-4 min-h-[36px] text-xs font-bold capitalize cursor-pointer transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#4B7C00] text-white shadow-[0px_2px_0px_#3C6300]'
                      : 'text-[#586251] hover:text-[#1A260E]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MONTHLY VIEW */}
      {subView === 'month' && (
        <section
          aria-label="Monthly calendar grid"
          className="zest-card rounded-3xl p-4 sm:p-6 overflow-x-auto"
        >
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAY_HEADERS.map((wd) => (
                <div
                  key={wd}
                  className="text-center text-xs font-bold uppercase tracking-wider text-[#586251] py-1"
                >
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthGrid.map((cell) => {
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDateKey;
                const dayBlocks = blocksByDate.get(cell.dateKey) ?? [];
                const dayTasks = tasksByDate.get(cell.dateKey) ?? [];
                const completedCount = (completions[cell.dateKey] ?? []).length;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => {
                      onSelectDate(cell.dateKey);
                      setSubView('day');
                    }}
                    className={`min-h-[104px] rounded-2xl border p-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E7F2DF] border-[#4B7C00] ring-2 ring-[#4B7C00]/25'
                        : cell.inCurrentMonth
                          ? 'bg-[#FDFFFB] border-[#D8E0D1] hover:border-[#9AD06D]'
                          : 'bg-[#F6FAF2] border-[#E5ECE0] opacity-55'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold tabular-nums ${
                          isToday
                            ? 'bg-[#4B7C00] text-white'
                            : 'text-[#1A260E]'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {completedCount > 0 && (
                        <span className="text-[10px] font-bold text-[#4B7C00] tabular-nums">
                          {completedCount}✓
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1.5 w-full">
                      {dayBlocks.slice(0, 2).map((b) => {
                        const st = getCategoryStyles(b.category);
                        return (
                          <div
                            key={b.id}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold truncate ${st.bg} ${st.text}`}
                          >
                            {b.title}
                          </div>
                        );
                      })}
                      {dayBlocks.length === 0 &&
                        dayTasks.slice(0, 2).map((t) => {
                          const st = getCategoryStyles(t.category);
                          return (
                            <div
                              key={t.id}
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold truncate ${st.bg} ${st.text}`}
                            >
                              {t.title}
                            </div>
                          );
                        })}
                      {dayBlocks.length + dayTasks.length > 2 && (
                        <p className="text-[10px] font-bold text-[#586251] px-1 tabular-nums">
                          +{dayBlocks.length + dayTasks.length - 2} more
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* WEEKLY VIEW */}
      {subView === 'week' && (
        <section
          aria-label="Weekly planner columns"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3"
        >
          {weekDates.map((wd) => {
            const isToday = wd.dateKey === todayKey;
            const isSelected = wd.dateKey === selectedDateKey;
            const dayBlocks = blocksByDate.get(wd.dateKey) ?? [];
            const dayUnscheduled = (tasksByDate.get(wd.dateKey) ?? []).filter(
              (t) => t.startMinutes === null && !t.completed,
            );

            return (
              <div
                key={wd.dateKey}
                className={`zest-card rounded-3xl p-3.5 flex flex-col justify-between min-h-[260px] ${
                  isSelected ? 'border-[#4B7C00] bg-[#FAFEF6]' : ''
                }`}
              >
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDate(wd.dateKey);
                      setSubView('day');
                    }}
                    className="w-full flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#D8E0D1]/80 cursor-pointer text-left"
                  >
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#586251] block">
                        {wd.dayShort}
                      </span>
                      <span
                        className={`font-display font-extrabold text-lg tabular-nums ${
                          isToday ? 'text-[#4B7C00]' : 'text-[#1A260E]'
                        }`}
                      >
                        {wd.dayNumber}
                      </span>
                    </div>
                    {isToday && (
                      <span className="rounded-full bg-[#4B7C00] text-white px-2 py-0.5 text-[10px] font-bold">
                        Today
                      </span>
                    )}
                  </button>

                  <div className="space-y-2">
                    {dayBlocks.length > 0 ? (
                      dayBlocks.map((b) => {
                        const st = getCategoryStyles(b.category);
                        const linkedTask = tasks.find((t) => t.id === b.taskId);
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              if (linkedTask) onEditTask(linkedTask);
                              else {
                                onSelectDate(wd.dateKey);
                                setSubView('day');
                              }
                            }}
                            className={`rounded-xl border ${st.bg} ${st.border} p-2 cursor-pointer`}
                          >
                            <p className={`text-xs font-bold ${st.text} leading-snug`}>
                              {b.title}
                            </p>
                            <p className="text-[10px] font-semibold text-[#586251] tabular-nums mt-0.5">
                              {formatMinutesLabel(b.startMinutes)}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-[#85917A] py-4 text-center">
                        Open day
                      </p>
                    )}

                    {dayUnscheduled.length > 0 && (
                      <p className="text-[11px] font-semibold text-[#586251] pt-1">
                        +{dayUnscheduled.length} unscheduled
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectDate(wd.dateKey);
                    onOpenNewTaskModal(10 * 60);
                  }}
                  className="mt-3 w-full rounded-xl py-1.5 bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add
                </button>
              </div>
            );
          })}
        </section>
      )}

      {/* DAILY VIEW */}
      {subView === 'day' && (
        <TimeBlockTimeline
          dateKey={selectedDateKey}
          layout="split"
          habits={habits}
          completedHabitIds={completions[selectedDateKey] ?? []}
          tasks={tasks}
          timeBlocks={timeBlocks}
          onPlaceItem={onPlaceItem}
          onMoveBlock={onMoveBlock}
          onResizeBlock={onResizeBlock}
          onRemoveBlock={onRemoveBlock}
          onToggleTask={onToggleTask}
          onToggleHabit={onToggleHabit}
          onEditTask={onEditTask}
          onOpenNewTaskAt={(startMin) => onOpenNewTaskModal(startMin)}
        />
      )}
    </div>
  );
}
