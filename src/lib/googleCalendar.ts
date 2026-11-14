import type {
  PlannerCategory,
  PlannerTask,
  TimeBlock,
} from '../types/planner';
import { formatDateKey } from '../utils/habits';
import { TIMELINE_END_MINUTES, TIMELINE_START_MINUTES } from '../utils/planner';

interface GoogleCalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  organizer?: {
    email?: string;
  };
}

export class GoogleCalendarAuthError extends Error {
  requiresReconnect: boolean;
  constructor(message: string, requiresReconnect: boolean) {
    super(message);
    this.requiresReconnect = requiresReconnect;
  }
}

function inferCategoryFromSummary(summary: string): PlannerCategory {
  const lower = summary.toLowerCase();
  if (/(yoga|run|gym|walk|workout|pilates|swim|hike)/.test(lower)) {
    return 'Movement';
  }
  if (/(meditat|breath|journal|mindful|therapy|reflect)/.test(lower)) {
    return 'Mindfulness';
  }
  if (/(doctor|dentist|wellness|hydration|lunch|dinner|health)/.test(lower)) {
    return 'Wellness';
  }
  if (/(sync|standup|meeting|review|sprint|deep|focus|design|code|1:1)/.test(lower)) {
    return 'Focus';
  }
  return 'General';
}

function sanitizeGoogleId(rawId: string): string {
  return rawId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 96);
}

function toRfc3339Local(dateKey: string, minutes: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const dt = new Date(y, m - 1, d, hours, mins, 0, 0);
  const tzOffsetMin = -dt.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(tzOffsetMin);
  const offH = String(Math.floor(abs / 60)).padStart(2, '0');
  const offM = String(abs % 60).padStart(2, '0');
  const yyyy = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00${sign}${offH}:${offM}`;
}

export async function fetchUpcomingGoogleEvents(
  accessToken: string,
  startDate: Date,
  daysAhead: number = 14,
): Promise<{
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  calendarEmail: string | null;
}> {
  const timeMin = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    0,
    0,
    0,
  ).toISOString();

  const endDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + daysAhead,
    23,
    59,
    59,
  ).toISOString();

  const url = new URL(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
  );
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', endDate);
  url.searchParams.set('maxResults', '100');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new GoogleCalendarAuthError(
      'Google Calendar permission expired or was not granted. Please reconnect Google Calendar.',
      true,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message || 'Unable to fetch Google Calendar events.');
  }

  const data = (await res.json()) as {
    summary?: string;
    items?: GoogleCalendarEventItem[];
  };

  const tasks: PlannerTask[] = [];
  const timeBlocks: TimeBlock[] = [];
  const todayKey = formatDateKey(startDate);

  for (const ev of data.items ?? []) {
    if (!ev.id || ev.status === 'cancelled') continue;
    const title = (ev.summary || 'Google Calendar Event').trim().slice(0, 110);
    if (title.length < 2) continue;

    let dateKey = todayKey;
    let startMinutes = 9 * 60;
    let endMinutes = 9 * 60 + 30;

    if (ev.start?.dateTime && ev.end?.dateTime) {
      const startDt = new Date(ev.start.dateTime);
      const endDt = new Date(ev.end.dateTime);
      dateKey = formatDateKey(startDt);
      const rawStart = startDt.getHours() * 60 + startDt.getMinutes();
      const rawEnd = endDt.getHours() * 60 + endDt.getMinutes();
      startMinutes = Math.max(
        TIMELINE_START_MINUTES,
        Math.min(TIMELINE_END_MINUTES - 15, rawStart),
      );
      endMinutes = Math.max(
        startMinutes + 15,
        Math.min(TIMELINE_END_MINUTES, rawEnd > startMinutes ? rawEnd : startMinutes + 30),
      );
    } else if (ev.start?.date) {
      dateKey = ev.start.date.slice(0, 10);
      startMinutes = 8 * 60;
      endMinutes = 8 * 60 + 30;
    } else {
      continue;
    }

    const safeGid = sanitizeGoogleId(ev.id);
    const category = inferCategoryFromSummary(title);
    const taskId = `gcal-t-${safeGid}`.slice(0, 120);
    const blockId = `gcal-b-${safeGid}`.slice(0, 120);

    tasks.push({
      id: taskId,
      title,
      dateKey,
      startMinutes,
      endMinutes,
      durationMinutes: Math.max(15, Math.min(480, endMinutes - startMinutes)),
      priority: 'Medium',
      category,
      notes: (ev.description || '').slice(0, 900),
      completed: false,
      isEvent: true,
      source: 'google',
      googleEventId: ev.id.slice(0, 250),
      createdAt: todayKey,
    });

    timeBlocks.push({
      id: blockId,
      dateKey,
      title,
      category,
      startMinutes,
      endMinutes,
      habitId: null,
      taskId,
      source: 'google',
      googleEventId: ev.id.slice(0, 250),
    });
  }

  return {
    tasks,
    timeBlocks,
    calendarEmail: typeof data.summary === 'string' && data.summary.includes('@')
      ? data.summary.slice(0, 250)
      : null,
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  params: {
    title: string;
    dateKey: string;
    startMinutes: number;
    endMinutes: number;
    notes?: string;
  },
): Promise<{ googleEventId: string; htmlLink?: string }> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: params.title,
        description: params.notes || 'Created from Zest Daily Planner',
        start: {
          dateTime: toRfc3339Local(params.dateKey, params.startMinutes),
          timeZone,
        },
        end: {
          dateTime: toRfc3339Local(params.dateKey, params.endMinutes),
          timeZone,
        },
      }),
    },
  );

  if (res.status === 401 || res.status === 403) {
    throw new GoogleCalendarAuthError(
      'Google Calendar write permission is needed. Please authorize Google Calendar and retry.',
      true,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message || 'Unable to create Google Calendar event.');
  }

  const created = (await res.json()) as { id: string; htmlLink?: string };
  return {
    googleEventId: created.id,
    htmlLink: created.htmlLink,
  };
}
