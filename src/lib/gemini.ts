import { GoogleGenAI, Type } from '@google/genai';
import type { AiProposedBlock, PlannerCategory } from '../types/planner';

export type ChatModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-4-argon'
  | 'gemini-4-carbon'
  | 'gemini-3.1-flash-lite';

export type CoachPersona = 'coach' | 'mindfulness' | 'scientist';

export interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

export interface HabitContextSummary {
  level?: number;
  title?: string;
  completedToday?: number;
  totalToday?: number;
  bestStreak?: number;
  habitNames?: string[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export const MISSING_API_KEY_MESSAGE =
  'No Gemini API key found. Click the gear icon (Settings) and add your own API key to use AI features.';

export function getGenAIClient(apiKey?: string): GoogleGenAI {
  const key = (apiKey ?? '').trim();
  if (!key) {
    throw new Error(MISSING_API_KEY_MESSAGE);
  }
  return new GoogleGenAI({ apiKey: key });
}

export function formatGeminiError(error: unknown): {
  status: number;
  message: string;
  requiresPaidKey: boolean;
} {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (raw === MISSING_API_KEY_MESSAGE) {
    return { status: 401, requiresPaidKey: false, message: raw };
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return {
      status: 502,
      requiresPaidKey: false,
      message:
        'Could not reach Gemini. Check your internet connection and make sure your API key in Settings (gear icon) is valid.',
    };
  }

  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota')
  ) {
    return {
      status: 429,
      requiresPaidKey: true,
      message:
        'This model requires a billing-enabled Gemini API key or exceeded current quota. You can use a billing-enabled key in Settings (gear icon), or switch to Gemini 4 Hydrogen.',
    };
  }
  if (
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid')
  ) {
    return {
      status: 403,
      requiresPaidKey: true,
      message:
        'Access was denied for the current Gemini API key. Please check or replace your API key in Settings (gear icon).',
    };
  }
  if (
    lower.includes('unavailable') ||
    lower.includes('503') ||
    lower.includes('high demand') ||
    lower.includes('overloaded')
  ) {
    return {
      status: 503,
      requiresPaidKey: false,
      message:
        'Gemini is experiencing a brief demand spike right now. Please try sending your message again in a moment, or switch to Gemini 3.1 Flash Lite.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      requiresPaidKey: false,
      message: 'The requested Gemini model endpoint was not found.',
    };
  }

  let cleanMessage = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    cleanMessage = parsed?.error?.message || parsed?.message || raw;
  } catch {
    // Keep plain string message
  }

  return {
    status: 500,
    requiresPaidKey: false,
    message: cleanMessage || 'Unexpected error communicating with Gemini API.',
  };
}

function buildSystemInstruction(
  persona: CoachPersona,
  habitContext?: HabitContextSummary,
): string {
  const personaLines: Record<CoachPersona, string> = {
    coach:
      'You are Zest Habit Coach — warm, energetic, practical, and encouraging. Give crisp, actionable next steps, habit stacking ideas, and streak-recovery advice.',
    mindfulness:
      'You are Zest Mindfulness Guide — calm, grounding, and compassionate. Offer breathwork cues, gentle evening reflection prompts, and stress-regulation habits.',
    scientist:
      'You are Zest Wellness Researcher — evidence-oriented and clear. Explain behavioral psychology, circadian science, and habit-loop mechanics concisely.',
  };

  const contextBlock = habitContext
    ? `\n\nCurrent user context in Zest: Level ${habitContext.level ?? 1} (${habitContext.title ?? 'Seedling'}), ${habitContext.completedToday ?? 0}/${habitContext.totalToday ?? 0} rituals completed today, best streak ${habitContext.bestStreak ?? 0} days, active rituals: ${(habitContext.habitNames ?? []).slice(0, 10).join(', ') || 'none yet'}.`
    : '';

  return `${personaLines[persona]}${contextBlock}\nKeep responses scannable with short paragraphs or bullet points.`;
}

const ALLOWED_CHAT_MODELS = new Set<ChatModelId>([
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.1-flash-lite',
]);

export async function runCoachChat(params: {
  apiKey?: string;
  messages: ChatTurnInput[];
  model?: ChatModelId;
  persona?: CoachPersona;
  useSearchGrounding?: boolean;
  habitContext?: HabitContextSummary;
}): Promise<{
  reply: string;
  modelUsed: ChatModelId;
  sources: GroundingSource[];
}> {
  const ai = getGenAIClient(params.apiKey);
  const requestedModel =
    params.model && ALLOWED_CHAT_MODELS.has(params.model)
      ? params.model
      : 'gemini-4-hydrogen';

  const useSearch = Boolean(params.useSearchGrounding);
  const modelUsed: ChatModelId = useSearch ? 'gemini-4-hydrogen' : requestedModel;
  const persona: CoachPersona = params.persona ?? 'coach';

  const sanitizedMessages = (params.messages ?? [])
    .filter((m) => m && (m.role === 'user' || m.role === 'model') && m.text.trim().length > 0)
    .slice(-20);

  if (sanitizedMessages.length === 0) {
    throw new Error('Please enter a message to start the conversation.');
  }

  const contents = sanitizedMessages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text.trim() }],
  }));

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await ai.models.generateContent({
        model: modelUsed,
        contents,
        config: {
          systemInstruction: buildSystemInstruction(persona, params.habitContext),
          ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      const isTransient = msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand');
      if (attempt === 0 && isTransient) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      throw err;
    }
  }
  if (!response) {
    throw new Error('Could not obtain a response from Gemini.');
  }

  const reply = (response.text ?? '').trim() || 'I could not generate a response just now.';

  const rawChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seenUris = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of rawChunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title;
    if (uri && !seenUris.has(uri)) {
      seenUris.add(uri);
      sources.push({
        uri,
        title: title || uri,
      });
    }
  }

  return { reply, modelUsed, sources };
}

export async function generateFocusMusic(params: {
  apiKey?: string;
  prompt: string;
  mode: 'clip' | 'pro';
}): Promise<{
  audioDataUrl: string;
  lyrics: string;
  modelUsed: string;
}> {
  const ai = getGenAIClient(params.apiKey);
  const modelUsed =
    params.mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

  const cleanPrompt = params.prompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please describe the soundscape mood you want to create.');
  }

  const responseStream = await ai.models.generateContentStream({
    model: modelUsed,
    contents: cleanPrompt,
  });

  const audioChunks: string[] = [];
  let lyrics = '';
  let mimeType = 'audio/mpeg';

  for await (const chunk of responseStream) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (audioChunks.length === 0 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioChunks.push(part.inlineData.data);
      }
      if (part.text) {
        lyrics += part.text;
      }
    }
  }

  if (audioChunks.length === 0) {
    throw new Error('No audio stream was returned by Lyria.');
  }

  const audioBytes = audioChunks.map((chunk) => {
    const bin = atob(chunk);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    return arr;
  });
  const merged = new Uint8Array(audioBytes.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const part of audioBytes) {
    merged.set(part, offset);
    offset += part.length;
  }
  let binary = '';
  const STEP = 0x8000;
  for (let i = 0; i < merged.length; i += STEP) {
    binary += String.fromCharCode(...merged.subarray(i, i + STEP));
  }
  const audioBase64 = btoa(binary);
  return {
    audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
    lyrics: lyrics.trim(),
    modelUsed,
  };
}

export async function generateRitualVideo(params: {
  apiKey?: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
}): Promise<{
  videoDataUrl: string;
  mimeType: string;
}> {
  const ai = getGenAIClient(params.apiKey);
  const cleanPrompt = params.prompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please describe the ritual scene you want to visualize.');
  }

  const aspectRatio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
  const interaction = await ai.interactions.create(
    {
      model: 'gemini-omni-1.2-flash',
      input: cleanPrompt,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: aspectRatio,
        duration: '6s',
        resolution: '720p',
      },
    },
    { timeout: 300000 },
  );

  const videoPart = interaction.output_video;
  if (videoPart?.data) {
    const mimeType = videoPart.mime_type || 'video/mp4';
    return {
      videoDataUrl: `data:${mimeType};base64,${videoPart.data}`,
      mimeType,
    };
  }
  if (videoPart?.uri) {
    return {
      videoDataUrl: videoPart.uri,
      mimeType: videoPart.mime_type || 'video/mp4',
    };
  }

  throw new Error('Video generation completed without a playable video payload.');
}

export async function transcribeReflectionAudio(params: {
  apiKey?: string;
  audioBase64: string;
  mimeType: string;
}): Promise<{ transcript: string }> {
  const ai = getGenAIClient(params.apiKey);
  if (!params.audioBase64) {
    throw new Error('No audio recording payload provided.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType || 'audio/webm',
            data: params.audioBase64,
          },
        },
        {
          text: 'Transcribe this personal wellness reflection audio accurately with clean punctuation.',
        },
      ],
    },
  });

  const transcript = (response.text ?? '').trim();
  return { transcript };
}

export interface AutoPlanHabitInput {
  id: string;
  title: string;
  category: string;
  timeOfDay: string;
  durationMinutes: number;
}

export interface AutoPlanTaskInput {
  id: string;
  title: string;
  category: string;
  priority: string;
  durationMinutes: number;
  notes?: string;
}

export interface AutoPlanFixedBlockInput {
  title: string;
  startMinutes: number;
  endMinutes: number;
  category: string;
  source?: string;
}

const VALID_PLANNER_CATEGORIES = new Set<PlannerCategory>([
  'Wellness',
  'Mindfulness',
  'Movement',
  'Focus',
  'General',
]);

function snap15(val: number): number {
  return Math.round(val / 15) * 15;
}

function findNonOverlappingSlot(
  desiredStart: number,
  duration: number,
  occupied: Array<{ start: number; end: number }>,
): { start: number; end: number } | null {
  const MIN_DAY = 360; // 6:00 AM
  const MAX_DAY = 1380; // 11:00 PM
  const safeDuration = Math.max(15, Math.min(240, snap15(duration)));
  const candidateStarts: number[] = [];

  const clampedDesired = Math.max(
    MIN_DAY,
    Math.min(MAX_DAY - safeDuration, snap15(desiredStart)),
  );
  candidateStarts.push(clampedDesired);
  for (let s = MIN_DAY; s <= MAX_DAY - safeDuration; s += 15) {
    if (s !== clampedDesired) candidateStarts.push(s);
  }

  // Sort alternatives closest to desiredStart
  const sortedCandidates = [
    clampedDesired,
    ...candidateStarts
      .slice(1)
      .sort((a, b) => Math.abs(a - clampedDesired) - Math.abs(b - clampedDesired)),
  ];

  for (const start of sortedCandidates) {
    const end = start + safeDuration;
    const overlaps = occupied.some((slot) => start < slot.end && end > slot.start);
    if (!overlaps) {
      return { start, end };
    }
  }
  return null;
}

export async function generateAutoPlanSchedule(params: {
  apiKey?: string;
  dateKey: string;
  pendingHabits: AutoPlanHabitInput[];
  unscheduledTasks: AutoPlanTaskInput[];
  fixedBlocks: AutoPlanFixedBlockInput[];
}): Promise<{
  summaryRationale: string;
  blocks: AiProposedBlock[];
}> {
  const ai = getGenAIClient(params.apiKey);
  const pendingHabits = (params.pendingHabits ?? []).slice(0, 20);
  const unscheduledTasks = (params.unscheduledTasks ?? []).slice(0, 20);
  const fixedBlocks = (params.fixedBlocks ?? []).slice(0, 30);

  if (pendingHabits.length === 0 && unscheduledTasks.length === 0) {
    return {
      summaryRationale:
        'Your day already looks well-balanced — all rituals and tasks for today are already scheduled or completed.',
      blocks: [],
    };
  }

  const promptPayload = {
    dateKey: params.dateKey,
    dayWindowMinutes: { start: 360, end: 1380, label: '6:00 AM to 11:00 PM' },
    fixedEventsAlreadyScheduled: fixedBlocks.map((b) => ({
      title: b.title,
      startMinutes: b.startMinutes,
      endMinutes: b.endMinutes,
      category: b.category,
    })),
    pendingDailyRituals: pendingHabits,
    unscheduledTasks,
  };

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create an optimal, balanced daily time-block schedule for ${params.dateKey}.
Rules:
1. Schedule every pending daily ritual and unscheduled task (up to capacity) between 360 (6:00 AM) and 1380 (11:00 PM), in 15-minute increments.
2. NEVER overlap with any item in fixedEventsAlreadyScheduled or with other proposed blocks.
3. Respect habit timeOfDay preferences (Morning: 390-690, Afternoon: 720-1020, Evening: 1050-1320) and place High-priority Focus tasks in deep work windows with short breathing breaks.
4. Keep habitId matching the exact id from pendingDailyRituals (or null) and taskId matching the exact id from unscheduledTasks (or null).
5. Use exact category from ['Wellness', 'Mindfulness', 'Movement', 'Focus', 'General'].

Input JSON:
${JSON.stringify(promptPayload)}`,
        config: {
          systemInstruction:
            'You are Zest Daily Planner AI. Output a calm, realistic, non-overlapping time-blocked day schedule in valid JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryRationale: { type: Type.STRING },
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    startMinutes: { type: Type.INTEGER },
                    endMinutes: { type: Type.INTEGER },
                    habitId: { type: Type.STRING, nullable: true },
                    taskId: { type: Type.STRING, nullable: true },
                    rationale: { type: Type.STRING },
                  },
                  required: ['title', 'category', 'startMinutes', 'endMinutes', 'rationale'],
                },
              },
            },
            required: ['summaryRationale', 'blocks'],
          },
        },
      });
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      const isTransient = msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand');
      if (attempt === 0 && isTransient) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      throw err;
    }
  }

  if (!response?.text) {
    throw new Error('Could not generate a schedule from Gemini.');
  }

  const parsed = JSON.parse(response.text) as {
    summaryRationale?: string;
    blocks?: Array<{
      title?: string;
      category?: string;
      startMinutes?: number;
      endMinutes?: number;
      habitId?: string | null;
      taskId?: string | null;
      rationale?: string;
    }>;
  };

  const validHabitIds = new Set(pendingHabits.map((h) => h.id));
  const validTaskIds = new Set(unscheduledTasks.map((t) => t.id));
  const occupied = fixedBlocks.map((b) => ({
    start: b.startMinutes,
    end: b.endMinutes,
  }));

  const sanitizedBlocks: AiProposedBlock[] = [];
  for (const raw of parsed.blocks ?? []) {
    const title = String(raw.title ?? '').trim().slice(0, 100);
    if (!title) continue;

    const category: PlannerCategory = VALID_PLANNER_CATEGORIES.has(
      raw.category as PlannerCategory,
    )
      ? (raw.category as PlannerCategory)
      : 'General';

    const rawStart = Number.isFinite(raw.startMinutes) ? Number(raw.startMinutes) : 540;
    const rawEnd = Number.isFinite(raw.endMinutes) ? Number(raw.endMinutes) : rawStart + 30;
    const duration = Math.max(15, Math.min(180, rawEnd - rawStart));

    const slot = findNonOverlappingSlot(rawStart, duration, occupied);
    if (!slot) continue;

    occupied.push(slot);

    const habitId = raw.habitId && validHabitIds.has(raw.habitId) ? raw.habitId : null;
    const taskId = raw.taskId && validTaskIds.has(raw.taskId) ? raw.taskId : null;

    sanitizedBlocks.push({
      title,
      category,
      startMinutes: slot.start,
      endMinutes: slot.end,
      habitId,
      taskId,
      rationale: String(raw.rationale ?? 'Balanced placement for steady energy.').slice(0, 180),
    });
  }

  sanitizedBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

  return {
    summaryRationale:
      (parsed.summaryRationale ?? '').trim() ||
      'Placed your priorities and daily rituals into open focus and wellness windows.',
    blocks: sanitizedBlocks,
  };
}

