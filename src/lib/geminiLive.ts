import { Modality, type LiveServerMessage } from '@google/genai';
import { formatGeminiError, getGenAIClient } from './gemini';

type LiveSession = Awaited<ReturnType<ReturnType<typeof getGenAIClient>['live']['connect']>>;

/**
 * Browser-side Gemini Live connection using the user's own API key.
 * Mimics the small WebSocket surface that LiveVoicePanel uses
 * (onopen / onmessage / onerror / onclose / send / close / readyState).
 */
export class GeminiLiveConnection {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  private session: LiveSession | null = null;
  private closed = false;

  constructor(apiKey: string) {
    void this.start(apiKey);
  }

  private emit(payload: Record<string, unknown>) {
    if (!this.closed) this.onmessage?.({ data: JSON.stringify(payload) });
  }

  private async start(apiKey: string) {
    try {
      const ai = getGenAIClient(apiKey);
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            'You are Zest Live Coach, a warm, upbeat wellness and daily habit companion. Keep spoken answers concise, practical, and encouraging.',
        },
        callbacks: {
          onopen: () => {
            this.emit({ type: 'ready' });
          },
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              this.emit({ inputTranscript: content.inputTranscription.text });
            }
            if (content?.outputTranscription?.text) {
              this.emit({ outputTranscript: content.outputTranscription.text });
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) this.emit({ audio: part.inlineData.data });
            }
            if (content?.interrupted) this.emit({ interrupted: true });
          },
          onerror: () => {
            this.emit({ error: 'Live voice session encountered a connection error.' });
          },
          onclose: () => {
            this.emit({ type: 'closed' });
          },
        },
      });

      if (this.closed) {
        try {
          session.close();
        } catch {
          // ignore
        }
        return;
      }
      this.session = session;
      this.readyState = GeminiLiveConnection.OPEN;
      this.onopen?.();
    } catch (error) {
      this.emit({ error: formatGeminiError(error).message });
      this.close();
    }
  }

  send(raw: string) {
    if (!this.session || this.closed) return;
    try {
      const parsed = JSON.parse(raw) as { audio?: string; text?: string };
      if (parsed.audio) {
        this.session.sendRealtimeInput({
          audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
        });
      } else if (parsed.text && parsed.text.trim()) {
        this.session.sendRealtimeInput({ text: parsed.text.trim() });
      }
    } catch {
      // ignore malformed client messages
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.readyState = GeminiLiveConnection.CLOSED;
    try {
      this.session?.close();
    } catch {
      // ignore
    }
    this.session = null;
    this.onclose?.();
  }
}
