import type {
  PlannerCategory,
  PlannerTask,
  PlannerTaskInput,
  PlannerValidationResult,
  TaskPriority,
  TimeBlock,
} from '../types/planner';
import { addDays, formatDateKey } from './habits';

export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 23;
export const TIMELINE_START_MINUTES = TIMELINE_START_HOUR * 60; // 360 (6:00 AM)
export const TIMELINE_END_MINUTES = TIMELINE_END_HOUR * 60; // 1380 (11:00 PM)

export const PLANNER_CATEGORIES: PlannerCategory[] = [
  'Wellness',
  'Mindfulness',
  'Movement',
  'Focus',
  'General',
];

export const TASK_PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

export function parseTimeStringToMinutes(timeStr: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToTimeInput(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, Math.round(minutes)));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatMinutesLabel(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h24 >= 12 && h24 < 24 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function snapToQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

export function clampBlockRange(
  startMinutes: number,
  endMinutes: number,
): { startMinutes: number; endMinutes: number } {
  const snappedStart = snapToQuarterHour(startMinutes);
  const start = Math.max(
    TIMELINE_START_MINUTES,
    Math.min(TIMELINE_END_MINUTES - 15, snappedStart),
  );
  const duration = Math.max(15, snapToQuarterHour(endMinutes - startMinutes));
  const end = Math.min(TIMELINE_END_MINUTES, start + duration);
  return {
    startMinutes: Math.min(start, end - 15),
    endMinutes: Math.max(end, start + 15),
  };
}

export function validatePlannerTaskInput(
  input: PlannerTaskInput,
): PlannerValidationResult {
  const errors: PlannerValidationResult['errors'] = {};
  const trimmedTitle = input.title.trim();

  if (!trimmedTitle) {
    errors.title = 'Please enter a task or event title.';
  } else if (trimmedTitle.length < 2) {
    errors.title = 'Title must be at least 2 characters.';
  } else if (trimmedTitle.length > 80) {
    errors.title = 'Title must be 80 characters or fewer.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) {
    errors.dateKey = 'Please choose a valid date.';
  }

  if (input.scheduled) {
    const start = parseTimeStringToMinutes(input.startTime);
    const end = parseTimeStringToMinutes(input.endTime);
    if (start === null || end === null) {
      errors.time = 'Please enter valid start and end times.';
    } else if (end <= start) {
      errors.time = 'End time must be after start time.';
    } else if (start < TIMELINE_START_MINUTES || end > TIMELINE_END_MINUTES) {
      errors.time = 'Schedule times must fall between 6:00 AM and 11:00 PM.';
    }
  } else if (
    !Number.isFinite(input.durationMinutes) ||
    input.durationMinutes < 15 ||
    input.durationMinutes > 480
  ) {
    errors.durationMinutes = 'Estimated duration must be 15 to 480 minutes.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getMonthCalendarGrid(
  year: number,
  monthZeroIndexed: number,
): Array<{
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}> {
  const firstOfMonth = new Date(year, monthZeroIndexed, 1);
  const dayOfWeek = firstOfMonth.getDay(); // 0 Sun .. 6 Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const gridStart = addDays(firstOfMonth, mondayOffset);

  return Array.from({ length: 42 }, (_, idx) => {
    const d = addDays(gridStart, idx);
    return {
      dateKey: formatDateKey(d),
      dayNumber: d.getDate(),
      inCurrentMonth: d.getMonth() === monthZeroIndexed,
    };
  });
}

export function getWeekDatesForKey(dateKey: string): Array<{
  dateKey: string;
  dayShort: string;
  dayNumber: number;
}> {
  const [y, m, d] = dateKey.split('-').map(Number);
  const anchor = new Date(y, m - 1, d);
  const dayOfWeek = anchor.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDays(anchor, mondayOffset);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return Array.from({ length: 7 }, (_, idx) => {
    const date = addDays(monday, idx);
    return {
      dateKey: formatDateKey(date),
      dayShort: labels[idx],
      dayNumber: date.getDate(),
    };
  });
}

export function getCategoryStyles(category: PlannerCategory): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  switch (category) {
    case 'Wellness':
      return {
        bg: 'bg-[#E3F5D3]',
        border: 'border-[#9AD06D]',
        text: 'text-[#1E3B04]',
        dot: 'bg-[#4B7C00]',
      };
    case 'Mindfulness':
      return {
        bg: 'bg-[#DFF3EE]',
        border: 'border-[#8AC7B8]',
        text: 'text-[#123D35]',
        dot: 'bg-[#217867]',
      };
    case 'Movement':
      return {
        bg: 'bg-[#FFF1D6]',
        border: 'border-[#E6B86A]',
        text: 'text-[#5C3900]',
        dot: 'bg-[#CC8400]',
      };
    case 'Focus':
      return {
        bg: 'bg-[#E5ECFA]',
        border: 'border-[#9FB6E8]',
        text: 'text-[#1D3566]',
        dot: 'bg-[#395CA7]',
      };
    case 'General':
    default:
      return {
        bg: 'bg-[#F2EFE5]',
        border: 'border-[#CBC5B1]',
        text: 'text-[#333227]',
        dot: 'bg-[#6A6754]',
      };
  }
}

export function createInitialPlannerSeed(referenceDate: Date = new Date()): {
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
} {
  const todayKey = formatDateKey(referenceDate);
  const tomorrowKey = formatDateKey(addDays(referenceDate, 1));

  const tasks: PlannerTask[] = [
    {
      id: 't-deep-sprint',
      title: 'Finalize Q4 product roadmap brief',
      dateKey: todayKey,
      startMinutes: 9 * 60,
      endMinutes: 10 * 60 + 30,
      durationMinutes: 90,
      priority: 'High',
      category: 'Focus',
      notes: 'Draft milestones and share review notes before noon.',
      completed: false,
      isEvent: true,
      source: 'zest',
      googleEventId: null,
      createdAt: todayKey,
    },
    {
      id: 't-inbox-zero',
      title: 'Clear priority client follow-ups',
      dateKey: todayKey,
      startMinutes: null,
      endMinutes: null,
      durationMinutes: 45,
      priority: 'High',
      category: 'Focus',
      notes: 'Unscheduled — drag onto timeline or let Auto-Plan place it.',
      completed: false,
      isEvent: false,
      source: 'zest',
      googleEventId: null,
      createdAt: todayKey,
    },
    {
      id: 't-grocery',
      title: 'Pick up fresh greens & herbal tea',
      dateKey: todayKey,
      startMinutes: null,
      endMinutes: null,
      durationMinutes: 30,
      priority: 'Medium',
      category: 'Wellness',
      notes: 'Matcha, spinach, lemon, ginger.',
      completed: false,
      isEvent: false,
      source: 'zest',
      googleEventId: null,
      createdAt: todayKey,
    },
    {
      id: 't-stretch-prep',
      title: 'Weekly desk ergonomics & reset',
      dateKey: tomorrowKey,
      startMinutes: 11 * 60,
      endMinutes: 11 * 60 + 45,
      durationMinutes: 45,
      priority: 'Low',
      category: 'Movement',
      notes: 'Quick posture reset and workspace tidy.',
      completed: false,
      isEvent: true,
      source: 'zest',
      googleEventId: null,
      createdAt: todayKey,
    },
  ];

  const timeBlocks: TimeBlock[] = [
    {
      id: 'tb-seed-focus',
      dateKey: todayKey,
      title: 'Finalize Q4 product roadmap brief',
      category: 'Focus',
      startMinutes: 9 * 60,
      endMinutes: 10 * 60 + 30,
      taskId: 't-deep-sprint',
      habitId: null,
      source: 'zest',
      googleEventId: null,
    },
    {
      id: 'tb-seed-walk',
      dateKey: todayKey,
      title: 'Midday Brisk Walk',
      category: 'Movement',
      startMinutes: 12 * 60 + 30,
      endMinutes: 13 * 60,
      habitId: 'h-walk',
      taskId: null,
      source: 'zest',
      googleEventId: null,
    },
  ];

  return { tasks, timeBlocks };
}
