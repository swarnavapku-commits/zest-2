import { Mic, MicOff, PhoneOff, Send, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getApiKey } from '../../lib/apiKey';
import { GeminiLiveConnection } from '../../lib/geminiLive';

interface LiveLogEntry {
  id: string;
  speaker: 'you' | 'coach' | 'system';
  text: string;
}

function float32ToInt16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64PcmToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i += 1) {
    float32[i] = int16[i] / 0x8000;
  }
  return float32;
}

export function LiveVoicePanel() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [muted, setMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textNudge, setTextNudge] = useState('');
  const [logs, setLogs] = useState<LiveLogEntry[]>([]);

  const wsRef = useRef<GeminiLiveConnection | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const stopSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close();
      inputCtxRef.current = null;
    }
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    activeSourcesRef.current = [];
    if (outputCtxRef.current) {
      void outputCtxRef.current.close();
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const schedulePlaybackChunk = (base64Pcm: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    const samples = base64PcmToFloat32(base64Pcm);
    const buffer = ctx.createBuffer(1, samples.length, 24000);
    buffer.copyToChannel(new Float32Array(samples), 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.02, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + buffer.duration;
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  };

  const startSession = async () => {
    if (status !== 'idle') return;
    setErrorMsg(null);
    setStatus('connecting');

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = micStream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;

      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error('Add your Gemini API key in Settings (gear icon) to use Live Voice.');
      }
      const ws = new GeminiLiveConnection(apiKey);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setLogs((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            speaker: 'system',
            text: 'Connected to Gemini 3.8 Live. Speak naturally or send a prompt below.',
          },
        ]);

        const source = inputCtx.createMediaStreamSource(micStream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (mutedRef.current || ws.readyState !== GeminiLiveConnection.OPEN) return;
          const channel = event.inputBuffer.getChannelData(0);
          const base64 = float32ToInt16Base64(channel);
          ws.send(JSON.stringify({ audio: base64 }));
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as {
          audio?: string;
          inputTranscript?: string;
          outputTranscript?: string;
          interrupted?: boolean;
          error?: string;
        };
        if (msg.error) {
          setErrorMsg(msg.error);
          stopSession();
          return;
        }
        if (msg.interrupted) {
          for (const src of activeSourcesRef.current) {
            try {
              src.stop();
            } catch {
              // ignore
            }
          }
          activeSourcesRef.current = [];
          nextStartTimeRef.current = outputCtx.currentTime;
        }
        if (msg.audio) {
          schedulePlaybackChunk(msg.audio);
        }
        if (msg.inputTranscript) {
          setLogs((prev) => [
            ...prev.slice(-18),
            { id: `u-${Date.now()}-${Math.random()}`, speaker: 'you', text: msg.inputTranscript! },
          ]);
        }
        if (msg.outputTranscript) {
          setLogs((prev) => [
            ...prev.slice(-18),
            { id: `c-${Date.now()}-${Math.random()}`, speaker: 'coach', text: msg.outputTranscript! },
          ]);
        }
      };

      ws.onerror = () => {
        setErrorMsg('Live voice WebSocket disconnected.');
        stopSession();
      };

      ws.onclose = () => {
        stopSession();
      };
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Microphone access is required for Live Voice coaching.';
      setErrorMsg(msg);
      stopSession();
    }
  };

  const handleSendText = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = textNudge.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== GeminiLiveConnection.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ text: trimmed }));
    setLogs((prev) => [
      ...prev.slice(-18),
      { id: `ut-${Date.now()}`, speaker: 'you', text: trimmed },
    ]);
    setTextNudge('');
  };

  return (
    <div className="zest-card rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-[#1A260E] flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#4B7C00]" aria-hidden="true" />
            <span>Live Voice Companion (Gemini 3.8 Live)</span>
          </h2>
          <p className="text-xs font-medium text-[#586251] mt-0.5">
            Bidirectional 16kHz mic & 24kHz spoken coaching with interruption support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'idle' ? (
            <button
              type="button"
              onClick={() => void startSession()}
              className="zest-btn-primary rounded-full px-5 min-h-[44px] inline-flex items-center gap-2 text-sm font-bold cursor-pointer"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span>Start Live Session</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-pressed={muted}
                className="zest-btn-secondary rounded-full px-4 min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{muted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>
              <button
                type="button"
                onClick={stopSession}
                className="rounded-full px-4 min-h-[44px] bg-[#FFDAD6] text-[#93000A] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" aria-hidden="true" />
                <span>End Call</span>
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-2xl bg-[#FFDAD6] px-4 py-2.5 text-xs font-bold text-[#93000A]">
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl bg-[#F2F9ED] border border-[#D8E0D1] p-4 min-h-[220px] max-h-[300px] overflow-y-auto space-y-2.5">
        {logs.length === 0 ? (
          <p className="text-sm font-medium text-[#586251] text-center py-12">
            Press &ldquo;Start Live Session&rdquo; to speak directly with your Zest Live Coach.
          </p>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-2xl px-3.5 py-2 text-xs font-medium ${
                entry.speaker === 'you'
                  ? 'bg-[#D7F3C2] text-[#1A260E] ml-8'
                  : entry.speaker === 'coach'
                    ? 'bg-[#FDFFFB] border border-[#D8E0D1] text-[#1A260E] mr-8'
                    : 'bg-[#E7F2DF] text-[#586251] text-center'
              }`}
            >
              {entry.speaker !== 'system' && (
                <span className="font-bold uppercase tracking-wider mr-1.5">
                  {entry.speaker === 'you' ? 'You:' : 'Coach:'}
                </span>
              )}
              {entry.text}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendText} className="flex gap-2">
        <label htmlFor="live-text-nudge" className="sr-only">
          Send a text message during live session
        </label>
        <input
          id="live-text-nudge"
          type="text"
          disabled={status !== 'connected'}
          value={textNudge}
          onChange={(e) => setTextNudge(e.target.value)}
          placeholder={
            status === 'connected'
              ? 'Send a quick note to the live coach...'
              : 'Connect a live session to send messages'
          }
          className="zest-input flex-1 h-11 rounded-2xl px-4 text-sm font-medium disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status !== 'connected' || !textNudge.trim()}
          className="zest-btn-secondary rounded-2xl px-4 h-11 inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
