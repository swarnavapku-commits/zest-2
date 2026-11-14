import {
  Calendar,
  Check,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Habit } from '../types/habit';
import type {
  PlannerCategory,
  PlannerTask,
  TimeBlock,
} from '../types/planner';
import {
  clampBlockRange,
  formatMinutesLabel,
  getCategoryStyles,
  snapToQuarterHour,
  TIMELINE_END_HOUR,
  TIMELINE_END_MINUTES,
  TIMELINE_START_HOUR,
  TIMELINE_START_MINUTES,
} from '../utils/planner';

const HOUR_HEIGHT = 64;
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 17 hours (6 AM - 11 PM)
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

interface DragPayload {
  kind: 'task' | 'habit' | 'block';
  id: string;
  title: string;
  category: PlannerCategory;
  durationMinutes: number;
}

interface PositionedBlock {
  block: TimeBlock;
  lane: number;
  laneCount: number;
}

function assignOverlapLanes(blocks: TimeBlock[]): PositionedBlock[] {
  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);
  const result: PositionedBlock[] = [];
  let cluster: TimeBlock[] = [];
  let clusterEnd = -1;

  const flushCluster = (items: TimeBlock[]) => {
    if (items.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: Array<{ block: TimeBlock; lane: number }> = [];
    for (const blk of items) {
      let lane = laneEnds.findIndex((endMin) => endMin <= blk.startMinutes);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(blk.endMinutes);
      } else {
        laneEnds[lane] = blk.endMinutes;
      }
      assigned.push({ block: blk, lane });
    }
    const laneCount = Math.max(1, laneEnds.length);
    for (const entry of assigned) {
      result.push({ block: entry.block, lane: entry.lane, laneCount });
    }
  };

  for (const blk of sorted) {
    if (cluster.length === 0 || blk.startMinutes < clusterEnd) {
      cluster.push(blk);
      clusterEnd = Math.max(clusterEnd, blk.endMinutes);
    } else {
      flushCluster(cluster);
      cluster = [blk];
      clusterEnd = blk.endMinutes;
    }
  }
  flushCluster(cluster);
  return result;
}

interface TimeBlockTimelineProps {
  dateKey: string;
  layout?: 'split' | 'stacked';
  habits: Habit[];
  completedHabitIds: string[];
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
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
  onToggleTask: (taskId: string) => void;
  onToggleHabit: (habitId: string) => void;
  onEditTask: (task: PlannerTask) => void;
  onOpenNewTaskAt?: (startMinutes: number) => void;
}

export function TimeBlockTimeline({
  dateKey,
  layout = 'split',
  habits,
  completedHabitIds,
  tasks,
  timeBlocks,
  onPlaceItem,
  onMoveBlock,
  onResizeBlock,
  onRemoveBlock,
  onToggleTask,
  onToggleHabit,
  onEditTask,
  onOpenNewTaskAt,
}: TimeBlockTimelineProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [dropPreviewMinutes, setDropPreviewMinutes] = useState<number | null>(null);
  const [resizingState, setResizingState] = useState<{
    blockId: string;
    endMinutes: number;
  } | null>(null);

  const dayBlocks = useMemo(
    () =>
      timeBlocks
        .filter((b) => b.dateKey === dateKey)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [timeBlocks, dateKey],
  );

  const positionedBlocks = useMemo(
    () => assignOverlapLanes(dayBlocks),
    [dayBlocks],
  );

  const completedHabitSet = useMemo(
    () => new Set(completedHabitIds),
    [completedHabitIds],
  );

  const scheduledHabitIds = useMemo(
    () => new Set(dayBlocks.map((b) => b.habitId).filter(Boolean) as string[]),
    [dayBlocks],
  );

  const scheduledTaskIds = useMemo(
    () => new Set(dayBlocks.map((b) => b.taskId).filter(Boolean) as string[]),
    [dayBlocks],
  );

  const taskMap = useMemo(() => {
    const m = new Map<string, PlannerTask>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  const unscheduledTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !t.completed &&
          t.dateKey === dateKey &&
          t.startMinutes === null &&
          !scheduledTaskIds.has(t.id),
      ),
    [tasks, dateKey, scheduledTaskIds],
  );

  const unscheduledHabits = useMemo(
    () =>
      habits.filter((h) => !h.archived && !scheduledHabitIds.has(h.id)),
    [habits, scheduledHabitIds],
  );

  const findNextAvailableSlot = (duration: number): { startMinutes: number; endMinutes: number } => {
    const safeDur = Math.max(15, snapToQuarterHour(duration));
    const occupied = dayBlocks.map((b) => ({
      start: b.startMinutes,
      end: b.endMinutes,
    }));
    for (let s = 9 * 60; s <= TIMELINE_END_MINUTES - safeDur; s += 30) {
      const e = s + safeDur;
      if (!occupied.some((o) => s < o.end && e > o.start)) {
        return { startMinutes: s, endMinutes: e };
      }
    }
    return clampBlockRange(9 * 60, 9 * 60 + safeDur);
  };

  const getMinutesFromClientY = (clientY: number): number => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return 9 * 60;
    const relY = Math.max(0, Math.min(GRID_HEIGHT - 15, clientY - rect.top));
    const rawMins = TIMELINE_START_MINUTES + (relY / HOUR_HEIGHT) * 60;
    return snapToQuarterHour(rawMins);
  };

  const handleDragStartItem = (e: DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleGridDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropPreviewMinutes(getMinutesFromClientY(e.clientY));
  };

  const handleGridDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropMinutes = getMinutesFromClientY(e.clientY);
    setDropPreviewMinutes(null);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as DragPayload;
      const range = clampBlockRange(dropMinutes, dropMinutes + (payload.durationMinutes || 30));
      if (payload.kind === 'block') {
        onMoveBlock(payload.id, range.startMinutes, range.endMinutes);
      } else {
        onPlaceItem({
          kind: payload.kind,
          id: payload.id,
          title: payload.title,
          category: payload.category,
          dateKey,
          startMinutes: range.startMinutes,
          endMinutes: range.endMinutes,
        });
      }
    } catch {
      // Ignore malformed drop payload
    }
  };

  const handleStartResize = (
    e: ReactPointerEvent<HTMLDivElement>,
    block: TimeBlock,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const initialEnd = block.endMinutes;
    let latestEnd = initialEnd;

    setResizingState({ blockId: block.id, endMinutes: initialEnd });

    const onMove = (moveEvt: PointerEvent) => {
      const deltaY = moveEvt.clientY - startY;
      const deltaMinutes = snapToQuarterHour((deltaY / HOUR_HEIGHT) * 60);
      const nextEnd = Math.max(
        block.startMinutes + 15,
        Math.min(TIMELINE_END_MINUTES, initialEnd + deltaMinutes),
      );
      latestEnd = nextEnd;
      setResizingState({ blockId: block.id, endMinutes: nextEnd });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setResizingState(null);
      if (latestEnd !== block.endMinutes) {
        onResizeBlock(block.id, latestEnd);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const hours = Array.from(
    { length: TOTAL_HOURS },
    (_, idx) => TIMELINE_START_HOUR + idx,
  );

  const trayPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-lg text-[#1A260E]">
            Unscheduled Queue
          </h3>
          <p className="text-xs text-[#586251]">
            Drag onto the timeline or click + Place.
          </p>
        </div>
        {onOpenNewTaskAt && (
          <button
            type="button"
            onClick={() => onOpenNewTaskAt(10 * 60)}
            className="rounded-full px-3 min-h-[34px] bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] text-xs font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add
          </button>
        )}
      </div>

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#586251]">
            Tasks ({unscheduledTasks.length})
          </p>
          <div className="space-y-2">
            {unscheduledTasks.map((task) => {
              const styles = getCategoryStyles(task.category);
              return (
                <div
                  key={task.id}
                  draggable
                  data-testid={`draggable-task-${task.id}`}
                  onDragStart={(e) =>
                    handleDragStartItem(e, {
                      kind: 'task',
                      id: task.id,
                      title: task.title,
                      category: task.category,
                      durationMinutes: task.durationMinutes,
                    })
                  }
                  className="rounded-2xl bg-[#FDFFFB] border border-[#D8E0D1] hover:border-[#9AD06D] p-2.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical
                      className="w-4 h-4 text-[#85917A] shrink-0"
                      aria-hidden="true"
                    />
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles.dot}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1A260E] truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-[#586251] tabular-nums">
                        {task.priority} · {task.durationMinutes}m
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const slot = findNextAvailableSlot(task.durationMinutes);
                      onPlaceItem({
                        kind: 'task',
                        id: task.id,
                        title: task.title,
                        category: task.category,
                        dateKey,
                        startMinutes: slot.startMinutes,
                        endMinutes: slot.endMinutes,
                      });
                    }}
                    className="rounded-full px-2.5 min-h-[28px] bg-[#E7F2DF] hover:bg-[#4B7C00] hover:text-white text-[#1A260E] text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors"
                  >
                    + Place
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled Daily Rituals */}
      {unscheduledHabits.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#586251]">
            Daily Rituals ({unscheduledHabits.length})
          </p>
          <div className="space-y-2">
            {unscheduledHabits.map((habit) => {
              const cat = habit.category as PlannerCategory;
              const styles = getCategoryStyles(cat);
              const done = completedHabitSet.has(habit.id);
              return (
                <div
                  key={habit.id}
                  draggable
                  data-testid={`draggable-habit-${habit.id}`}
                  onDragStart={(e) =>
                    handleDragStartItem(e, {
                      kind: 'habit',
                      id: habit.id,
                      title: habit.title,
                      category: cat,
                      durationMinutes: habit.durationMinutes,
                    })
                  }
                  className={`rounded-2xl bg-[#FDFFFB] border border-[#D8E0D1] hover:border-[#9AD06D] p-2.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-colors ${
                    done ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical
                      className="w-4 h-4 text-[#85917A] shrink-0"
                      aria-hidden="true"
                    />
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles.dot}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1A260E] truncate">
                        {habit.title}
                      </p>
                      <p className="text-[11px] text-[#586251] tabular-nums">
                        {habit.timeOfDay} · {habit.durationMinutes}m
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const slot = findNextAvailableSlot(habit.durationMinutes);
                      onPlaceItem({
                        kind: 'habit',
                        id: habit.id,
                        title: habit.title,
                        category: cat,
                        dateKey,
                        startMinutes: slot.startMinutes,
                        endMinutes: slot.endMinutes,
                      });
                    }}
                    className="rounded-full px-2.5 min-h-[28px] bg-[#E7F2DF] hover:bg-[#4B7C00] hover:text-white text-[#1A260E] text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors"
                  >
                    + Place
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unscheduledTasks.length === 0 && unscheduledHabits.length === 0 && (
        <div className="rounded-2xl bg-[#E7F2DF]/60 border border-[#D8E0D1] p-4 text-center">
          <Sparkles className="w-4 h-4 text-[#4B7C00] mx-auto mb-1" aria-hidden="true" />
          <p className="text-xs font-semibold text-[#586251]">
            All tasks and daily rituals for this day are placed on your timeline.
          </p>
        </div>
      )}
    </div>
  );

  const timelineGrid = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-lg text-[#1A260E]">
            Daily Time Blocks
          </h3>
          <p className="text-xs text-[#586251]">
            6:00 AM – 11:00 PM · Drag bottom edge to resize in 15m steps.
          </p>
        </div>
        <span className="text-xs font-bold text-[#4B7C00] tabular-nums whitespace-nowrap">
          {dayBlocks.length} {dayBlocks.length === 1 ? 'block' : 'blocks'}
        </span>
      </div>

      <div className="rounded-2xl border border-[#D8E0D1] bg-[#FDFFFB] max-h-[600px] overflow-y-auto">
        <div
          className="relative flex select-none"
          style={{ height: `${GRID_HEIGHT}px` }}
        >
          {/* Left Hour Labels */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-[#D8E0D1]/80 bg-[#F8FBF5]">
            {hours.map((hour) => {
              const label = formatMinutesLabel(hour * 60).replace(':00 ', ' ');
              return (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="pr-2 pt-1 text-right text-[11px] font-bold text-[#586251] tabular-nums border-b border-[#D8E0D1]/50"
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Interactive Drop Grid */}
          <div
            ref={gridRef}
            data-testid="timeline-grid"
            onDragOver={handleGridDragOver}
            onDragLeave={() => setDropPreviewMinutes(null)}
            onDrop={handleGridDrop}
            className="relative flex-1 min-w-0"
          >
            {/* Hour Slot Rows */}
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="group relative border-b border-[#D8E0D1]/55 hover:bg-[#F2F9ED]/50 transition-colors"
              >
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#D8E0D1]/40 pointer-events-none" />
                {onOpenNewTaskAt && (
                  <button
                    type="button"
                    onClick={() => onOpenNewTaskAt(hour * 60)}
                    aria-label={`Add task at ${formatMinutesLabel(hour * 60)}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute right-2 top-1.5 rounded-full px-2 py-0.5 bg-[#E7F2DF] text-[#3C6300] text-[10px] font-bold cursor-pointer transition-opacity"
                  >
                    + Add
                  </button>
                )}
              </div>
            ))}

            {/* Drop Slot Preview Indicator */}
            {dropPreviewMinutes !== null && (
              <div
                aria-hidden="true"
                className="absolute left-1.5 right-1.5 rounded-xl border-2 border-dashed border-[#4B7C00] bg-[#D7F3C2]/45 pointer-events-none z-20 flex items-center px-3"
                style={{
                  top: `${((dropPreviewMinutes - TIMELINE_START_MINUTES) / 60) * HOUR_HEIGHT}px`,
                  height: `${(30 / 60) * HOUR_HEIGHT}px`,
                }}
              >
                <span className="text-[11px] font-bold text-[#1A260E] tabular-nums">
                  Drop at {formatMinutesLabel(dropPreviewMinutes)}
                </span>
              </div>
            )}

            {/* Scheduled Time Blocks */}
            {positionedBlocks.map(({ block, lane, laneCount }) => {
              const isResizing = resizingState?.blockId === block.id;
              const effectiveEnd = isResizing
                ? resizingState.endMinutes
                : block.endMinutes;
              const duration = Math.max(15, effectiveEnd - block.startMinutes);
              const topPx =
                ((block.startMinutes - TIMELINE_START_MINUTES) / 60) * HOUR_HEIGHT;
              const heightPx = Math.max(24, (duration / 60) * HOUR_HEIGHT);
              const styles = getCategoryStyles(block.category);

              const linkedTask = block.taskId ? taskMap.get(block.taskId) : undefined;
              const isCompleted = linkedTask
                ? linkedTask.completed
                : block.habitId
                  ? completedHabitSet.has(block.habitId)
                  : false;

              const leftPct = (lane / laneCount) * 100;
              const widthPct = 100 / laneCount;

              return (
                <div
                  key={block.id}
                  data-testid={`time-block-${block.id}`}
                  draggable={!isResizing}
                  onDragStart={(e) => {
                    if (isResizing) {
                      e.preventDefault();
                      return;
                    }
                    handleDragStartItem(e, {
                      kind: 'block',
                      id: block.id,
                      title: block.title,
                      category: block.category,
                      durationMinutes: duration,
                    });
                  }}
                  style={{
                    top: `${topPx + 1}px`,
                    height: `${heightPx - 2}px`,
                    left: `calc(${leftPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                  }}
                  className={`group/block absolute z-10 rounded-xl border ${styles.bg} ${styles.border} px-2.5 pt-1 pb-2 shadow-[0_2px_6px_rgba(26,38,14,0.06)] flex flex-col justify-between overflow-hidden select-none ${
                    isCompleted ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 min-w-0">
                    <div className="flex items-start gap-1.5 min-w-0">
                      {(block.taskId || block.habitId) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (block.taskId) onToggleTask(block.taskId);
                            else if (block.habitId) onToggleHabit(block.habitId);
                          }}
                          aria-label={`Mark ${block.title} as ${isCompleted ? 'pending' : 'completed'}`}
                          className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                            isCompleted
                              ? 'bg-[#4B7C00] border-[#4B7C00] text-white'
                              : 'bg-white/90 border-[#93A483]'
                          }`}
                        >
                          {isCompleted && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>
                      )}

                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (linkedTask) onEditTask(linkedTask);
                          }}
                          className={`text-left font-bold text-xs leading-tight ${styles.text} truncate block max-w-full ${
                            isCompleted ? 'line-through' : ''
                          } ${linkedTask ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
                        >
                          {block.title}
                        </button>
                        {heightPx >= 36 && (
                          <p className="text-[10px] font-semibold text-[#586251] tabular-nums leading-tight mt-0.5">
                            {formatMinutesLabel(block.startMinutes)} –{' '}
                            {formatMinutesLabel(effectiveEnd)} ({duration}m)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {block.source === 'google' && (
                        <span
                          title="Synced from Google Calendar"
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#395CA7] whitespace-nowrap"
                        >
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          <span className="hidden sm:inline">Google</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveBlock(block.id);
                        }}
                        aria-label={`Remove ${block.title} from timeline`}
                        className="opacity-75 sm:opacity-0 sm:group-hover/block:opacity-100 focus:opacity-100 w-5 h-5 rounded-md hover:bg-black/10 text-[#586251] flex items-center justify-center cursor-pointer transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Vertical Resize Grip */}
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label={`Resize ${block.title} duration`}
                    data-testid={`resize-block-${block.id}`}
                    onPointerDown={(e) => handleStartResize(e, block)}
                    className="absolute inset-x-0 bottom-0 h-2.5 cursor-ns-resize touch-none flex items-end justify-center pb-0.5 hover:bg-black/5"
                  >
                    <span className="w-6 h-0.5 rounded-full bg-[#586251]/40" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  if (layout === 'stacked') {
    return (
      <section
        aria-label="Daily time-blocking planner"
        className="zest-card rounded-3xl p-5 sm:p-6 space-y-5"
      >
        {trayPanel}
        <div className="border-t border-[#D8E0D1]/80 pt-5">{timelineGrid}</div>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <aside className="lg:col-span-4 zest-card rounded-3xl p-5">
        {trayPanel}
      </aside>
      <section
        aria-label="Daily interactive timeline"
        className="lg:col-span-8 zest-card rounded-3xl p-5"
      >
        {timelineGrid}
      </section>
    </div>
  );
}
