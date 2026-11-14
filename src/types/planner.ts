export type PlannerCategory =
  | 'Wellness'
  | 'Mindfulness'
  | 'Movement'
  | 'Focus'
  | 'General';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type PlannerSource = 'zest' | 'google';

export interface PlannerTask {
  id: string;
  title: string;
  dateKey: string;
  startMinutes: number | null;
  endMinutes: number | null;
  durationMinutes: number;
  priority: TaskPriority;
  category: PlannerCategory;
  notes: string;
  completed: boolean;
  isEvent: boolean;
  source: PlannerSource;
  googleEventId?: string | null;
  createdAt: string;
}

export interface PlannerTaskInput {
  title: string;
  dateKey: string;
  scheduled: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  priority: TaskPriority;
  category: PlannerCategory;
  notes: string;
  syncToGoogleCalendar?: boolean;
}

export interface TimeBlock {
  id: string;
  dateKey: string;
  title: string;
  category: PlannerCategory;
  startMinutes: number;
  endMinutes: number;
  habitId?: string | null;
  taskId?: string | null;
  source: PlannerSource;
  googleEventId?: string | null;
}

export interface CalendarSyncState {
  connected: boolean;
  lastSyncedAt: string | null;
  syncedCount: number;
  calendarEmail: string | null;
}

export interface AiProposedBlock {
  title: string;
  category: PlannerCategory;
  startMinutes: number;
  endMinutes: number;
  habitId?: string | null;
  taskId?: string | null;
  rationale: string;
}

export interface PlannerValidationResult {
  valid: boolean;
  errors: {
    title?: string;
    dateKey?: string;
    time?: string;
    durationMinutes?: string;
  };
}
