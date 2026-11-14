import { useSyncExternalStore } from 'react';

// The user's own Gemini API key lives only in this browser (localStorage).
// It is sent to our server per request in a header and is never stored server-side.
const STORAGE_KEY = 'zest.geminiApiKey';
const CHANGE_EVENT = 'zest:api-key-changed';
export const OPEN_SETTINGS_EVENT = 'zest:open-settings';

export function getApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.) — nothing to persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function removeApiKey(): void {
  setApiKey('');
}

export function openSettings(): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useApiKey(): string {
  return useSyncExternalStore(subscribe, getApiKey, () => '');
}

/**
 * Drop-in replacement for fetch('/api/ai/...'): runs the Gemini call directly in the
 * browser with the user's own API key and returns a JSON Response, so no backend
 * server is needed (works on static hosts like Vercel / Netlify).
 */
export async function aiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    // Loaded lazily so the Gemini SDK stays out of the initial bundle.
    const gemini = await import('./gemini');
    const body = JSON.parse(typeof init.body === 'string' ? init.body : '{}') as Record<
      string,
      any
    >;
    const apiKey = getApiKey();

    switch (input) {
      case '/api/ai/chat':
        return json(await gemini.runCoachChat({ ...body, apiKey } as any));
      case '/api/ai/auto-plan':
        return json(
          await gemini.generateAutoPlanSchedule({
            apiKey,
            dateKey: body.dateKey || new Date().toISOString().slice(0, 10),
            pendingHabits: body.pendingHabits ?? [],
            unscheduledTasks: body.unscheduledTasks ?? [],
            fixedBlocks: body.fixedBlocks ?? [],
          }),
        );
      case '/api/ai/music':
        return json(
          await gemini.generateFocusMusic({
            apiKey,
            prompt: body.prompt ?? '',
            mode: body.mode === 'pro' ? 'pro' : 'clip',
          }),
        );
      case '/api/ai/video':
        return json(
          await gemini.generateRitualVideo({
            apiKey,
            prompt: body.prompt ?? '',
            aspectRatio: body.aspectRatio === '9:16' ? '9:16' : '16:9',
          }),
        );
      case '/api/ai/transcribe':
        return json(
          await gemini.transcribeReflectionAudio({
            apiKey,
            audioBase64: body.audioBase64 ?? '',
            mimeType: body.mimeType ?? 'audio/webm',
          }),
        );
      default:
        return json({ error: 'Unknown AI action.' }, 404);
    }
  } catch (error) {
    const { formatGeminiError } = await import('./gemini');
    const formatted = formatGeminiError(error);
    return json(
      { error: formatted.message, requiresPaidKey: formatted.requiresPaidKey },
      formatted.status,
    );
  }
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
