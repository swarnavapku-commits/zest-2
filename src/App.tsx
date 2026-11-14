import { useEffect, useMemo, useRef, useState } from 'react';
import { AutoPlanModal } from './components/AutoPlanModal';
import { CalendarView } from './components/CalendarView';
import { HabitModal } from './components/HabitModal';
import { InsightsView } from './components/InsightsView';
import { RecapModal } from './components/RecapModal';
import { RewardsView } from './components/RewardsView';
import { RoutinesView } from './components/RoutinesView';
import { SettingsModal } from './components/SettingsModal';
import { Sanctuary3DView } from './components/Sanctuary3DView';
import { StudioView } from './components/StudioView';
import type { JournalEntryItem } from './components/studio/VoiceJournalPanel';
import { TaskEventModal } from './components/TaskEventModal';
import { TodayView } from './components/TodayView';
import { TopBar, type AppTab } from './components/TopBar';
import { useAuth } from './contexts/AuthContext';
import { OPEN_SETTINGS_EVENT } from './lib/apiKey';
import {
  deleteHabitFromFirestore,
  deletePlannerTaskFromFirestore,
  deleteTimeBlockFromFirestore,
  loadHabitStateFromFirestore,
  loadPlannerStateFromFirestore,
  saveJournalEntryToFirestore,
  syncHabitStateToFirestore,
  syncPlannerStateToFirestore,
} from './lib/firebase';
import {
  createGoogleCalendarEvent,
  fetchUpcomingGoogleEvents,
  GoogleCalendarAuthError,
} from './lib/googleCalendar';
import type {
  DayCompletionMap,
  Habit,
  HabitFormInput,
  RoutineTemplate,
} from './types/habit';
import type {
  AiProposedBlock,
  CalendarSyncState,
  PlannerCategory,
  PlannerTask,
  PlannerTaskInput,
  TimeBlock,
} from './types/planner';
import {
  calculateDailyProgress,
  calculateLevelInfo,
  calculateStreak,
  calculateTotalXp,
  createInitialSeedData,
  formatDateKey,
  getUnlockedBadges,
  getWeeklySummary,
} from './utils/habits';
import {
  clampBlockRange,
  createInitialPlannerSeed,
  parseTimeStringToMinutes,
} from './utils/planner';

const STORAGE_KEY = 'zest_habit_state_v1';
const PLANNER_STORAGE_KEY = 'zest_planner_state_v1';
const JOURNAL_STORAGE_KEY = 'zest_journal_entries_v1';

interface StoredHabitState {
  habits: Habit[];
  completions: DayCompletionMap;
}

interface StoredPlannerState {
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  syncState: CalendarSyncState;
}

function loadStoredState(referenceDate: Date): StoredHabitState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredHabitState;
      if (
        Array.isArray(parsed.habits) &&
        parsed.completions &&
        typeof parsed.completions === 'object'
      ) {
        return parsed;
      }
    }
  } catch {
    // Fallback to deterministic seed data
  }
  return createInitialSeedData(referenceDate);
}

function loadStoredPlannerState(referenceDate: Date): StoredPlannerState {
  try {
    const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredPlannerState;
      if (Array.isArray(parsed.tasks) && Array.isArray(parsed.timeBlocks)) {
        return {
          tasks: parsed.tasks,
          timeBlocks: parsed.timeBlocks,
          syncState: parsed.syncState ?? {
            connected: false,
            lastSyncedAt: null,
            syncedCount: 0,
            calendarEmail: null,
          },
        };
      }
    }
  } catch {
    // Fallback to deterministic planner seed
  }
  const seed = createInitialPlannerSeed(referenceDate);
  return {
    ...seed,
    syncState: {
      connected: false,
      lastSyncedAt: null,
      syncedCount: 0,
      calendarEmail: null,
    },
  };
}

function loadStoredJournals(): JournalEntryItem[] {
  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as JournalEntryItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export default function App() {
  const {
    user,
    signingIn,
    googleAccessToken,
    signInWithGoogle,
    connectGoogleCalendar,
    clearGoogleAccessToken,
    logout,
  } = useAuth();

  const [referenceDate] = useState<Date>(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    formatDateKey(new Date()),
  );
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  const [state, setState] = useState<StoredHabitState>(() =>
    loadStoredState(referenceDate),
  );
  const [plannerState, setPlannerState] = useState<StoredPlannerState>(() =>
    loadStoredPlannerState(referenceDate),
  );
  const [journals, setJournals] = useState<JournalEntryItem[]>(() =>
    loadStoredJournals(),
  );

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalDefaultStart, setTaskModalDefaultStart] = useState<number | null>(
    10 * 60,
  );
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [autoPlanModalOpen, setAutoPlanModalOpen] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [recapModalOpen, setRecapModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hydratedUidRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const plannerStateRef = useRef(plannerState);
  plannerStateRef.current = plannerState;

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PLANNER_STORAGE_KEY,
        JSON.stringify(plannerState),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [plannerState]);

  useEffect(() => {
    try {
      window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journals));
    } catch {
      // Ignore storage quota errors
    }
  }, [journals]);

  const persistCloudState = (nextState: StoredHabitState) => {
    if (!user) return;
    void syncHabitStateToFirestore(
      user.uid,
      nextState.habits,
      nextState.completions,
    ).catch((err) => console.error('Firestore sync error:', err));
  };

  const persistPlannerCloudState = (nextPlanner: StoredPlannerState) => {
    if (!user) return;
    void syncPlannerStateToFirestore(
      user.uid,
      nextPlanner.tasks,
      nextPlanner.timeBlocks,
      nextPlanner.syncState,
    ).catch((err) => console.error('Firestore planner sync error:', err));
  };

  // Hydrate from Firestore + Cloud SQL when signed in
  useEffect(() => {
    if (!user) {
      hydratedUidRef.current = null;
      return;
    }
    if (hydratedUidRef.current === user.uid) return;
    hydratedUidRef.current = user.uid;

    let cancelled = false;
    (async () => {
      try {
        const [fsData, fsPlanner] = await Promise.all([
          loadHabitStateFromFirestore(user.uid).catch(() => null),
          loadPlannerStateFromFirestore(user.uid).catch(() => null),
        ]);

        if (cancelled) return;

        const remoteHabits =
          fsData && fsData.habits.length > 0 ? fsData.habits : null;

        const remoteCompletions =
          fsData && Object.keys(fsData.completions).length > 0
            ? fsData.completions
            : null;

        if (remoteHabits) {
          setState({
            habits: remoteHabits,
            completions: remoteCompletions ?? {},
          });
        } else {
          const current = stateRef.current;
          await syncHabitStateToFirestore(
            user.uid,
            current.habits,
            current.completions,
          ).catch(() => {});
        }

        const remoteTasks =
          fsPlanner && fsPlanner.tasks.length > 0 ? fsPlanner.tasks : null;

        const remoteBlocks =
          fsPlanner && fsPlanner.timeBlocks.length > 0 ? fsPlanner.timeBlocks : null;

        const remoteSyncState = fsPlanner?.syncState ?? null;

        if (remoteTasks || remoteBlocks) {
          setPlannerState({
            tasks: remoteTasks ?? [],
            timeBlocks: remoteBlocks ?? [],
            syncState: remoteSyncState ?? plannerStateRef.current.syncState,
          });
        } else {
          const currentPlanner = plannerStateRef.current;
          await syncPlannerStateToFirestore(
            user.uid,
            currentPlanner.tasks,
            currentPlanner.timeBlocks,
            currentPlanner.syncState,
          ).catch(() => {});
        }

        const remoteJournals =
          fsData && fsData.journals.length > 0 ? fsData.journals : null;

        if (remoteJournals) {
          setJournals(remoteJournals);
        }
      } catch (err) {
        console.error('Cloud hydration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const dailyProgress = useMemo(
    () =>
      calculateDailyProgress(
        state.habits,
        state.completions[selectedDateKey] ?? [],
      ),
    [state.habits, state.completions, selectedDateKey],
  );

  const totalXp = useMemo(
    () => calculateTotalXp(state.habits, state.completions),
    [state.habits, state.completions],
  );

  const levelInfo = useMemo(() => calculateLevelInfo(totalXp), [totalXp]);

  const weeklySummary = useMemo(
    () => getWeeklySummary(state.habits, state.completions, referenceDate),
    [state.habits, state.completions, referenceDate],
  );

  const badges = useMemo(
    () =>
      getUnlockedBadges(state.habits, state.completions, totalXp, referenceDate),
    [state.habits, state.completions, totalXp, referenceDate],
  );

  const bestStreak = useMemo(() => {
    const active = state.habits.filter((h) => !h.archived);
    return active.reduce(
      (max, h) =>
        Math.max(max, calculateStreak(h.id, state.completions, referenceDate)),
      0,
    );
  }, [state.habits, state.completions, referenceDate]);

  const handleToggleHabit = (habitId: string) => {
    const targetHabit = state.habits.find((h) => h.id === habitId);
    const existing = state.completions[selectedDateKey] ?? [];
    const willComplete = !existing.includes(habitId);

    const prevIds = state.completions[selectedDateKey] ?? [];
    const has = prevIds.includes(habitId);
    const nextIds = has
      ? prevIds.filter((id) => id !== habitId)
      : [...prevIds, habitId];
    const nextState: StoredHabitState = {
      ...state,
      completions: {
        ...state.completions,
        [selectedDateKey]: nextIds,
      },
    };
    setState(nextState);
    persistCloudState(nextState);

    if (targetHabit) {
      setToastMessage(
        willComplete
          ? `Completed "${targetHabit.title}" (+${targetHabit.xpReward} XP)`
          : `Marked "${targetHabit.title}" as pending`,
      );
    }
  };

  const handleSaveHabit = (input: HabitFormInput, existingId?: string) => {
    let nextState: StoredHabitState;
    if (existingId) {
      nextState = {
        ...state,
        habits: state.habits.map((h) =>
          h.id === existingId ? { ...h, ...input } : h,
        ),
      };
    } else {
      const newHabit: Habit = {
        id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        ...input,
        createdAt: formatDateKey(referenceDate),
      };
      nextState = {
        ...state,
        habits: [...state.habits, newHabit],
      };
    }
    setState(nextState);
    persistCloudState(nextState);
    setToastMessage(
      existingId
        ? `Updated "${input.title}"`
        : `Added "${input.title}" to your rituals`,
    );
  };

  const handleAddTemplate = (template: RoutineTemplate) => {
    const alreadyExists = state.habits.some(
      (h) =>
        h.title.trim().toLowerCase() === template.title.trim().toLowerCase(),
    );
    if (!alreadyExists) {
      const newHabit: Habit = {
        id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: template.title,
        category: template.category,
        timeOfDay: template.timeOfDay,
        durationMinutes: template.durationMinutes,
        cadence: template.cadence,
        xpReward: template.xpReward,
        icon: template.icon,
        createdAt: formatDateKey(referenceDate),
      };
      const nextState: StoredHabitState = {
        ...state,
        habits: [...state.habits, newHabit],
      };
      setState(nextState);
      persistCloudState(nextState);
    }
    setToastMessage(`Added "${template.title}" to Today`);
  };

  const handleToggleArchive = (habitId: string) => {
    const target = state.habits.find((h) => h.id === habitId);
    const nextState: StoredHabitState = {
      ...state,
      habits: state.habits.map((h) =>
        h.id === habitId ? { ...h, archived: !h.archived } : h,
      ),
    };
    setState(nextState);
    persistCloudState(nextState);
    if (target) {
      setToastMessage(
        target.archived
          ? `Restored "${target.title}"`
          : `Paused "${target.title}"`,
      );
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    const target = state.habits.find((h) => h.id === habitId);
    const nextCompletions: DayCompletionMap = {};
    for (const [dateKey, ids] of Object.entries(state.completions)) {
      nextCompletions[dateKey] = ids.filter((id) => id !== habitId);
    }
    const nextState: StoredHabitState = {
      habits: state.habits.filter((h) => h.id !== habitId),
      completions: nextCompletions,
    };
    setState(nextState);

    const removedBlocks = plannerState.timeBlocks.filter((b) => b.habitId === habitId);
    if (removedBlocks.length > 0) {
      const nextPlanner: StoredPlannerState = {
        ...plannerState,
        timeBlocks: plannerState.timeBlocks.filter((b) => b.habitId !== habitId),
      };
      setPlannerState(nextPlanner);
      if (user) {
        for (const blk of removedBlocks) {
          void deleteTimeBlockFromFirestore(user.uid, blk.id).catch(() => {});
        }
        persistPlannerCloudState(nextPlanner);
      }
    }

    if (user) {
      void deleteHabitFromFirestore(user.uid, habitId).catch((err) =>
        console.error('Firestore delete error:', err),
      );
      persistCloudState(nextState);
    }
    if (target) {
      setToastMessage(`Removed "${target.title}"`);
    }
  };

  const handleSaveTask = async (input: PlannerTaskInput, existingId?: string) => {
    const startMin = input.scheduled
      ? parseTimeStringToMinutes(input.startTime)
      : null;
    const endMin = input.scheduled
      ? parseTimeStringToMinutes(input.endTime)
      : null;
    const computedDuration =
      input.scheduled && startMin !== null && endMin !== null
        ? Math.max(15, endMin - startMin)
        : Math.max(15, input.durationMinutes);

    let googleEventId =
      existingId
        ? plannerState.tasks.find((t) => t.id === existingId)?.googleEventId ?? null
        : null;

    let updatedSyncState = plannerState.syncState;

    if (
      input.syncToGoogleCalendar &&
      input.scheduled &&
      startMin !== null &&
      endMin !== null &&
      !googleEventId
    ) {
      try {
        let oauthToken = googleAccessToken;
        if (!oauthToken) {
          oauthToken = await connectGoogleCalendar();
        }
        if (oauthToken) {
          const created = await createGoogleCalendarEvent(oauthToken, {
            title: input.title,
            dateKey: input.dateKey,
            startMinutes: startMin,
            endMinutes: endMin,
            notes: input.notes,
          });
          googleEventId = created.googleEventId;
          updatedSyncState = {
            ...updatedSyncState,
            connected: true,
            lastSyncedAt: new Date().toISOString(),
            syncedCount: updatedSyncState.syncedCount + 1,
          };
          setToastMessage(`Added "${input.title}" to Zest & Google Calendar`);
        } else {
          setToastMessage(`Saved "${input.title}" locally (Google authorization canceled)`);
        }
      } catch (err) {
        if (err instanceof GoogleCalendarAuthError && err.requiresReconnect) {
          clearGoogleAccessToken();
        }
        setToastMessage(
          `Saved "${input.title}" in Zest (Google Calendar: ${
            err instanceof Error ? err.message : 'sync skipped'
          })`,
        );
      }
    } else {
      setToastMessage(
        existingId ? `Updated "${input.title}"` : `Added "${input.title}"`,
      );
    }

    const taskId =
      existingId ??
      `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const existingTask = existingId
      ? plannerState.tasks.find((t) => t.id === existingId)
      : undefined;

    const savedTask: PlannerTask = {
      id: taskId,
      title: input.title,
      dateKey: input.dateKey,
      startMinutes: startMin,
      endMinutes: endMin,
      durationMinutes: computedDuration,
      priority: input.priority,
      category: input.category,
      notes: input.notes,
      completed: existingTask?.completed ?? false,
      isEvent: Boolean(input.scheduled),
      source: existingTask?.source ?? 'zest',
      googleEventId,
      createdAt: existingTask?.createdAt ?? formatDateKey(referenceDate),
    };

    const nextTasks = existingId
      ? plannerState.tasks.map((t) => (t.id === existingId ? savedTask : t))
      : [...plannerState.tasks, savedTask];

    let nextBlocks = [...plannerState.timeBlocks];
    const existingBlockIndex = nextBlocks.findIndex((b) => b.taskId === taskId);

    if (input.scheduled && startMin !== null && endMin !== null) {
      const nextBlock: TimeBlock = {
        id:
          existingBlockIndex >= 0
            ? nextBlocks[existingBlockIndex].id
            : `tb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        dateKey: input.dateKey,
        title: input.title,
        category: input.category,
        startMinutes: startMin,
        endMinutes: endMin,
        habitId: null,
        taskId,
        source: existingTask?.source ?? 'zest',
        googleEventId,
      };
      if (existingBlockIndex >= 0) {
        nextBlocks[existingBlockIndex] = nextBlock;
      } else {
        nextBlocks.push(nextBlock);
      }
    } else if (existingBlockIndex >= 0) {
      const removedBlockId = nextBlocks[existingBlockIndex].id;
      nextBlocks = nextBlocks.filter((b) => b.id !== removedBlockId);
      if (user) {
        void deleteTimeBlockFromFirestore(user.uid, removedBlockId).catch(() => {});
      }
    }

    const nextPlanner: StoredPlannerState = {
      tasks: nextTasks,
      timeBlocks: nextBlocks,
      syncState: updatedSyncState,
    };
    setPlannerState(nextPlanner);
    persistPlannerCloudState(nextPlanner);
    setSelectedDateKey(input.dateKey);
  };

  const handleDeleteTask = (taskId: string) => {
    const target = plannerState.tasks.find((t) => t.id === taskId);
    const removedBlocks = plannerState.timeBlocks.filter((b) => b.taskId === taskId);
    const nextPlanner: StoredPlannerState = {
      ...plannerState,
      tasks: plannerState.tasks.filter((t) => t.id !== taskId),
      timeBlocks: plannerState.timeBlocks.filter((b) => b.taskId !== taskId),
    };
    setPlannerState(nextPlanner);
    if (user) {
      void deletePlannerTaskFromFirestore(user.uid, taskId).catch(() => {});
      for (const blk of removedBlocks) {
        void deleteTimeBlockFromFirestore(user.uid, blk.id).catch(() => {});
      }
      persistPlannerCloudState(nextPlanner);
    }
    if (target) {
      setToastMessage(`Removed "${target.title}"`);
    }
  };

  const handleToggleTask = (taskId: string) => {
    const nextTasks = plannerState.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    const nextPlanner: StoredPlannerState = {
      ...plannerState,
      tasks: nextTasks,
    };
    setPlannerState(nextPlanner);
    persistPlannerCloudState(nextPlanner);
  };

  const handlePlaceItem = (payload: {
    kind: 'task' | 'habit';
    id: string;
    title: string;
    category: PlannerCategory;
    dateKey: string;
    startMinutes: number;
    endMinutes: number;
  }) => {
    const range = clampBlockRange(payload.startMinutes, payload.endMinutes);
    const newBlock: TimeBlock = {
      id: `tb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      dateKey: payload.dateKey,
      title: payload.title,
      category: payload.category,
      startMinutes: range.startMinutes,
      endMinutes: range.endMinutes,
      habitId: payload.kind === 'habit' ? payload.id : null,
      taskId: payload.kind === 'task' ? payload.id : null,
      source: 'zest',
      googleEventId: null,
    };

    const nextTasks =
      payload.kind === 'task'
        ? plannerState.tasks.map((t) =>
            t.id === payload.id
              ? {
                  ...t,
                  dateKey: payload.dateKey,
                  startMinutes: range.startMinutes,
                  endMinutes: range.endMinutes,
                  durationMinutes: range.endMinutes - range.startMinutes,
                  isEvent: true,
                }
              : t,
          )
        : plannerState.tasks;

    const nextPlanner: StoredPlannerState = {
      ...plannerState,
      tasks: nextTasks,
      timeBlocks: [...plannerState.timeBlocks, newBlock],
    };
    setPlannerState(nextPlanner);
    persistPlannerCloudState(nextPlanner);
    setToastMessage(`Scheduled "${payload.title}"`);
  };

  const handleMoveBlock = (
    blockId: string,
    startMinutes: number,
    endMinutes: number,
  ) => {
    const range = clampBlockRange(startMinutes, endMinutes);
    const targetBlock = plannerState.timeBlocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const nextBlocks = plannerState.timeBlocks.map((b) =>
      b.id === blockId
        ? { ...b, startMinutes: range.startMinutes, endMinutes: range.endMinutes }
        : b,
    );
    const nextTasks = targetBlock.taskId
      ? plannerState.tasks.map((t) =>
          t.id === targetBlock.taskId
            ? {
                ...t,
                startMinutes: range.startMinutes,
                endMinutes: range.endMinutes,
                durationMinutes: range.endMinutes - range.startMinutes,
              }
            : t,
        )
      : plannerState.tasks;

    const nextPlanner: StoredPlannerState = {
      ...plannerState,
      tasks: nextTasks,
      timeBlocks: nextBlocks,
    };
    setPlannerState(nextPlanner);
    persistPlannerCloudState(nextPlanner);
  };

  const handleResizeBlock = (blockId: string, endMinutes: number) => {
    const targetBlock = plannerState.timeBlocks.find((b) => b.id === blockId);
    if (!targetBlock) return;
    const range = clampBlockRange(targetBlock.startMinutes, endMinutes);

    const nextBlocks = plannerState.timeBlocks.map((b) =>
      b.id === blockId ? { ...b, endMinutes: range.endMinutes } : b,
    );
    const nextTasks = targetBlock.taskId
      ? plannerState.tasks.map((t) =>
          t.id === targetBlock.taskId
            ? {
                ...t,
                endMinutes: range.endMinutes,
                durationMinutes: range.endMinutes - targetBlock.startMinutes,
              }
            : t,
        )
      : plannerState.tasks;

    const nextPlanner: StoredPlannerState = {
      ...plannerState,
      tasks: nextTasks,
      timeBlocks: nextBlocks,
    };
    setPlannerState(nextPlanner);
    persistPlannerCloudState(nextPlanner);
    setToastMessage(
      `Resized "${targetBlock.title}" to ${range.endMinutes - targetBlock.startMinutes}m`,
    );
  };

  const handleRemoveBlock = (blockId: string) => {
    const targetBlock = plannerState.timeBlocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    const nextBlocks = plannerState.timeBlocks.filter((b) => b.id !== blockId);
    const nextTasks = targetBlock.taskId
      ? plannerState.tasks.map((t) =>
          t.id === targetBlock.taskId
            ? { ...t, startMinutes: null, endMinutes: null, isEvent: false }
            : t,
        )
      : plannerState.tasks;

    const nextPlanner: StoredPlannerState = {
      ...plannerState,
      tasks: nextTasks,
      timeBlocks: nextBlocks,
    };
    setPlannerState(nextPlanner);
    if (user) {
      void deleteTimeBlockFromFirestore(user.uid, blockId).catch(() => {});
      persistPlannerCloudState(nextPlanner);
    }
    setToastMessage(`Unscheduled "${targetBlock.title}"`);
  };

  const handleApplyAutoPlan = (proposed: AiProposedBlock[]) => {
    if (proposed.length === 0) return;

    const newBlocks: TimeBlock[] = proposed.map((p, idx) => ({
      id: `tb-ai-${Date.now().toString(36)}-${idx}`,
      dateKey: selectedDateKey,
      title: p.title,
      category: p.category,
      startMinutes: p.startMinutes,
      endMinutes: p.endMinutes,
      habitId: p.habitId ?? null,
      taskId: p.taskId ?? null,
      source: 'zest',
      googleEventId: null,
    }));

    const taskUpdates = new Map<string, AiProposedBlock>();
    for (const p of proposed) {
      if (p.taskId) taskUpdates.set(p.taskId, p);
    }

    const nextTasks = plannerState.tasks.map((t) => {
      const match = taskUpdates.get(t.id);
      if (!match) return t;
      return {
        ...t,
        dateKey: selectedDateKey,
        startMinutes: match.startMinutes,
        endMinutes: match.endMinutes,
        durationMinutes: match.endMinutes - match.startMinutes,
        isEvent: true,
      };
    });

    const nextPlanner: StoredPlannerState = {
      ...plannerState,
      tasks: nextTasks,
      timeBlocks: [...plannerState.timeBlocks, ...newBlocks],
    };
    setPlannerState(nextPlanner);
    persistPlannerCloudState(nextPlanner);
    setToastMessage(
      `Applied ${newBlocks.length} AI time ${newBlocks.length === 1 ? 'block' : 'blocks'} to ${selectedDateKey}`,
    );
  };

  const handleSyncGoogleCalendar = async () => {
    setSyncingGoogle(true);
    try {
      let token = googleAccessToken;
      if (!token) {
        token = await connectGoogleCalendar();
      }
      if (!token) {
        setToastMessage('Google Calendar sign-in was not completed.');
        return;
      }

      let fetched;
      try {
        fetched = await fetchUpcomingGoogleEvents(token, referenceDate, 14);
      } catch (err) {
        if (err instanceof GoogleCalendarAuthError && err.requiresReconnect) {
          clearGoogleAccessToken();
          const refreshedToken = await connectGoogleCalendar();
          if (!refreshedToken) {
            setToastMessage('Please reconnect Google Calendar to refresh permissions.');
            return;
          }
          fetched = await fetchUpcomingGoogleEvents(
            refreshedToken,
            referenceDate,
            14,
          );
        } else {
          throw err;
        }
      }

      const oldGoogleTaskIds = plannerState.tasks
        .filter((t) => t.source === 'google')
        .map((t) => t.id);
      const oldGoogleBlockIds = plannerState.timeBlocks
        .filter((b) => b.source === 'google')
        .map((b) => b.id);

      const zestTasks = plannerState.tasks.filter((t) => t.source !== 'google');
      const zestBlocks = plannerState.timeBlocks.filter((b) => b.source !== 'google');

      const nextSyncState: CalendarSyncState = {
        connected: true,
        lastSyncedAt: new Date().toISOString(),
        syncedCount: fetched.timeBlocks.length,
        calendarEmail: fetched.calendarEmail || user?.email || null,
      };

      const nextPlanner: StoredPlannerState = {
        tasks: [...zestTasks, ...fetched.tasks],
        timeBlocks: [...zestBlocks, ...fetched.timeBlocks],
        syncState: nextSyncState,
      };

      setPlannerState(nextPlanner);
      if (user) {
        for (const id of oldGoogleTaskIds) {
          if (!fetched.tasks.some((t) => t.id === id)) {
            void deletePlannerTaskFromFirestore(user.uid, id).catch(() => {});
          }
        }
        for (const id of oldGoogleBlockIds) {
          if (!fetched.timeBlocks.some((b) => b.id === id)) {
            void deleteTimeBlockFromFirestore(user.uid, id).catch(() => {});
          }
        }
        persistPlannerCloudState(nextPlanner);
      }

      setToastMessage(
        `Synced ${fetched.timeBlocks.length} upcoming Google Calendar ${
          fetched.timeBlocks.length === 1 ? 'event' : 'events'
        }`,
      );
    } catch (err) {
      setToastMessage(
        err instanceof Error
          ? err.message
          : 'Unable to sync Google Calendar right now.',
      );
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleSaveJournal = async (
    transcript: string,
    source: 'voice' | 'text',
  ) => {
    const dateKey = formatDateKey(referenceDate);
    if (user) {
      const savedFs = await saveJournalEntryToFirestore({
        uid: user.uid,
        dateKey,
        transcript,
        source,
      });
      setJournals((prev) => [savedFs, ...prev]);
    } else {
      const localEntry: JournalEntryItem = {
        id: `j-${Date.now().toString(36)}`,
        dateKey,
        transcript,
        source,
        createdAt: new Date().toISOString(),
      };
      setJournals((prev) => [localEntry, ...prev]);
    }
    setToastMessage('Saved wellness reflection');
  };

  const openCreateModal = () => {
    setEditingHabit(null);
    setHabitModalOpen(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitModalOpen(true);
  };

  const openNewTaskModal = (defaultStartMinutes: number | null = 10 * 60) => {
    setEditingTask(null);
    setTaskModalDefaultStart(defaultStartMinutes);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: PlannerTask) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F2F9ED] text-[#1A260E] pb-24 md:pb-12">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewHabit={openCreateModal}
        onOpenSettings={() => setSettingsOpen(true)}
        userDisplayName={user?.displayName}
        userEmail={user?.email}
        signingIn={signingIn}
        onSignIn={() => {
          void signInWithGoogle().then((u) => {
            if (u) setToastMessage(`Signed in as ${u.displayName || u.email}`);
          });
        }}
        onSignOut={() => {
          void logout().then(() => setToastMessage('Signed out of Zest'));
        }}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onNotify={setToastMessage}
      />

      <main className="zest-container pt-6 sm:pt-8">
        <div key={activeTab} className="zest-view-enter">
          {activeTab === 'today' && (
            <TodayView
              referenceDate={referenceDate}
              selectedDateKey={selectedDateKey}
              onSelectDate={setSelectedDateKey}
              habits={state.habits}
              completions={state.completions}
              dailyProgress={dailyProgress}
              levelInfo={levelInfo}
              weeklyCompletionRate={weeklySummary.averageCompletionRate}
              onToggleHabit={handleToggleHabit}
              onEditHabit={openEditModal}
              onOpenNewHabit={openCreateModal}
              onOpenRecap={() => setRecapModalOpen(true)}
              tasks={plannerState.tasks}
              timeBlocks={plannerState.timeBlocks}
              onOpenAutoPlan={() => setAutoPlanModalOpen(true)}
              onOpenNewTaskModal={openNewTaskModal}
              onEditTask={openEditTaskModal}
              onToggleTask={handleToggleTask}
              onPlaceItem={handlePlaceItem}
              onMoveBlock={handleMoveBlock}
              onResizeBlock={handleResizeBlock}
              onRemoveBlock={handleRemoveBlock}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              referenceDate={referenceDate}
              selectedDateKey={selectedDateKey}
              onSelectDate={setSelectedDateKey}
              habits={state.habits}
              completions={state.completions}
              tasks={plannerState.tasks}
              timeBlocks={plannerState.timeBlocks}
              syncState={plannerState.syncState}
              syncingGoogle={syncingGoogle}
              onSyncGoogleCalendar={() => void handleSyncGoogleCalendar()}
              onOpenAutoPlan={() => setAutoPlanModalOpen(true)}
              onOpenNewTaskModal={openNewTaskModal}
              onEditTask={openEditTaskModal}
              onToggleTask={handleToggleTask}
              onToggleHabit={handleToggleHabit}
              onPlaceItem={handlePlaceItem}
              onMoveBlock={handleMoveBlock}
              onResizeBlock={handleResizeBlock}
              onRemoveBlock={handleRemoveBlock}
            />
          )}

          {activeTab === 'routines' && (
            <RoutinesView
              habits={state.habits}
              onAddTemplate={handleAddTemplate}
              onEditHabit={openEditModal}
              onToggleArchive={handleToggleArchive}
              onDeleteHabit={handleDeleteHabit}
              onOpenNewHabit={openCreateModal}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsView
              referenceDate={referenceDate}
              habits={state.habits}
              completions={state.completions}
              onOpenRecap={() => setRecapModalOpen(true)}
            />
          )}

          {activeTab === 'rewards' && (
            <RewardsView levelInfo={levelInfo} badges={badges} />
          )}

          {activeTab === 'sanctuary' && (
            <Sanctuary3DView
              levelInfo={levelInfo}
              dailyPercentage={dailyProgress.percentage}
              completedCount={dailyProgress.completedCount}
              totalCount={dailyProgress.totalCount}
              bestStreak={bestStreak}
            />
          )}

          {activeTab === 'studio' && (
            <StudioView
              todayKey={formatDateKey(referenceDate)}
              levelInfo={levelInfo}
              habits={state.habits}
              completedTodayCount={dailyProgress.completedCount}
              totalTodayCount={dailyProgress.totalCount}
              bestStreak={bestStreak}
              journals={journals}
              onSaveJournal={handleSaveJournal}
            />
          )}
        </div>
      </main>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="zest-modal-in fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full bg-[#1C3400] text-[#F9FFEA] px-5 py-2.5 text-sm font-semibold shadow-[0px_8px_24px_rgba(26,38,14,0.2)] whitespace-nowrap max-w-[90vw] truncate"
        >
          {toastMessage}
        </div>
      )}

      <HabitModal
        isOpen={habitModalOpen}
        editingHabit={editingHabit}
        onClose={() => {
          setHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
      />

      <TaskEventModal
        isOpen={taskModalOpen}
        defaultDateKey={selectedDateKey}
        defaultStartMinutes={taskModalDefaultStart}
        editingTask={editingTask}
        googleConnected={Boolean(googleAccessToken || plannerState.syncState.connected)}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <AutoPlanModal
        isOpen={autoPlanModalOpen}
        dateKey={selectedDateKey}
        habits={state.habits}
        completedHabitIds={state.completions[selectedDateKey] ?? []}
        tasks={plannerState.tasks}
        existingBlocks={plannerState.timeBlocks.filter(
          (b) => b.dateKey === selectedDateKey,
        )}
        onClose={() => setAutoPlanModalOpen(false)}
        onApplySchedule={handleApplyAutoPlan}
      />

      <RecapModal
        isOpen={recapModalOpen}
        onClose={() => setRecapModalOpen(false)}
        levelInfo={levelInfo}
        weeklyAverageRate={weeklySummary.averageCompletionRate}
        weeklyXp={weeklySummary.totalWeeklyXp}
        perfectDaysCount={weeklySummary.perfectDaysCount}
        bestStreak={bestStreak}
      />
    </div>
  );
}
