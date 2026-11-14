import { FileAudio, Mic, Save, Square, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { aiFetch } from '../../lib/apiKey';

export interface JournalEntryItem {
  id: string;
  dateKey: string;
  transcript: string;
  source: 'voice' | 'text';
  createdAt: string;
}

interface VoiceJournalPanelProps {
  todayKey: string;
  entries: JournalEntryItem[];
  onSaveEntry: (transcript: string, source: 'voice' | 'text') => Promise<void>;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || '');
      const idx = res.indexOf(',');
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Failed to read audio file.'));
    reader.readAsDataURL(blob);
  });
}

export function VoiceJournalPanel({
  todayKey,
  entries,
  onSaveEntry,
}: VoiceJournalPanelProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastSource, setLastSource] = useState<'voice' | 'text'>('text');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const transcribeBlob = async (blob: Blob, mimeType: string) => {
    setTranscribing(true);
    setErrorMsg(null);
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await aiFetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not transcribe audio.');
        return;
      }
      setTranscript((prev) =>
        prev.trim() ? `${prev.trim()}\n${data.transcript}` : data.transcript,
      );
      setLastSource('voice');
    } catch {
      setErrorMsg('Network error during audio transcription.');
    } finally {
      setTranscribing(false);
    }
  };

  const toggleRecording = async () => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }

    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        void transcribeBlob(blob, mimeType);
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Microphone access is needed to record voice reflections.',
      );
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await transcribeBlob(file, file.type || 'audio/mpeg');
    e.target.value = '';
  };

  const handleSave = async () => {
    const clean = transcript.trim();
    if (!clean || saving) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSaveEntry(clean, lastSource);
      setTranscript('');
      setLastSource('text');
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Unable to save reflection.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="zest-card rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[#1A260E] flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-[#4B7C00]" aria-hidden="true" />
            <span>Voice Reflection Journal (Gemini 3.5 Transcribe)</span>
          </h2>
          <p className="text-xs font-medium text-[#586251] mt-0.5">
            Record a quick voice note or upload an audio clip to transcribe and save to your journal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleRecording()}
            disabled={transcribing}
            className={`rounded-full px-4 min-h-[42px] inline-flex items-center gap-2 text-xs font-bold cursor-pointer ${
              recording
                ? 'bg-[#FFDAD6] text-[#93000A]'
                : 'zest-btn-primary'
            }`}
          >
            {recording ? (
              <>
                <Square className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Stop & Transcribe</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" aria-hidden="true" />
                <span>Record Voice Note</span>
              </>
            )}
          </button>

          <label className="zest-btn-secondary rounded-full px-4 min-h-[42px] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer">
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upload Audio</span>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => void handleFileUpload(e)}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {transcribing && (
        <div className="rounded-2xl bg-[#E7F2DF] px-4 py-2.5 text-xs font-bold text-[#4B7C00]">
          Transcribing audio with Gemini 3.5 Transcribe...
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="rounded-2xl bg-[#FFDAD6] px-4 py-2.5 text-xs font-bold text-[#93000A]">
          {errorMsg}
        </div>
      )}

      <div>
        <label htmlFor="voice-journal-textarea" className="block text-xs font-bold text-[#1A260E] mb-1.5">
          Reflection Draft ({todayKey})
        </label>
        <textarea
          id="voice-journal-textarea"
          rows={4}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Record a voice note, upload audio, or type your daily gratitude & habit reflection..."
          className="zest-input w-full rounded-2xl p-4 text-sm font-medium resize-y"
        />
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !transcript.trim()}
            className="zest-btn-primary rounded-full px-5 min-h-[42px] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{saving ? 'Saving...' : 'Save Reflection'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#586251]">
          Saved Reflections ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="text-xs font-medium text-[#586251] bg-[#F2F9ED] rounded-2xl p-4">
            No reflections saved yet. Record or write your first win above.
          </p>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {entries.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#F2F9ED] border border-[#D8E0D1] px-4 py-3"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-[#4B7C00] mb-1">
                  <span>{item.dateKey}</span>
                  <span className="uppercase">{item.source}</span>
                </div>
                <p className="text-sm font-medium text-[#1A260E] whitespace-pre-wrap">
                  {item.transcript}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
