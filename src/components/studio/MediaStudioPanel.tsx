import { Film, Music } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { aiFetch } from '../../lib/apiKey';

const MUSIC_PRESETS = [
  'Warm acoustic marimba and soft rain for morning deep focus, calm botanical energy',
  'Gentle lo-fi upright piano and breeze chimes for evening gratitude journaling',
  'Upbeat sunlit acoustic guitar groove for a 25-minute brisk outdoor walk',
];

const VIDEO_PRESETS = [
  'Morning sunlight filtering through eucalyptus leaves onto a wooden desk with ceramic tea cup, calm botanical studio lighting',
  'Tranquil stone water fountain in a sunlit courtyard garden with drifting cherry blossoms',
];

export function MediaStudioPanel() {
  // Lyria Music state
  const [musicPrompt, setMusicPrompt] = useState(MUSIC_PRESETS[0]);
  const [musicMode, setMusicMode] = useState<'clip' | 'pro'>('clip');
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string>('');

  // Omni Video state
  const [videoPrompt, setVideoPrompt] = useState(VIDEO_PRESETS[0]);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);

  const handleGenerateMusic = async (e: FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || musicLoading) return;
    setMusicLoading(true);
    setMusicError(null);
    try {
      const res = await aiFetch('/api/ai/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt, mode: musicMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMusicError(data.error || 'Music generation failed.');
        return;
      }
      setAudioDataUrl(data.audioDataUrl);
      setLyrics(data.lyrics || '');
    } catch {
      setMusicError('Network error while generating Lyria soundscape.');
    } finally {
      setMusicLoading(false);
    }
  };

  const handleGenerateVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() || videoLoading) return;
    setVideoLoading(true);
    setVideoError(null);
    try {
      const res = await aiFetch('/api/ai/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: videoPrompt, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVideoError(data.error || 'Video generation failed.');
        return;
      }
      setVideoDataUrl(data.videoDataUrl);
    } catch {
      setVideoError('Network error while generating ritual video.');
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Focus Soundscapes (Lyria 3) */}
      <div className="zest-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display font-bold text-xl text-[#1A260E] flex items-center gap-2">
            <Music className="w-5 h-5 text-[#4B7C00]" aria-hidden="true" />
            <span>Focus Soundscapes (Lyria 3)</span>
          </h2>
          <p className="text-xs font-medium text-[#586251] mt-0.5">
            Compose 30s clips (<code className="font-mono">lyria-3-clip-preview</code>) or full tracks (<code className="font-mono">lyria-3-pro-preview</code>).
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {MUSIC_PRESETS.map((preset, idx) => (
            <button
              key={preset}
              type="button"
              onClick={() => setMusicPrompt(preset)}
              className="rounded-full px-3 py-1 bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[11px] font-bold text-[#1A260E] cursor-pointer"
            >
              Preset {idx + 1}
            </button>
          ))}
        </div>

        <form onSubmit={handleGenerateMusic} className="space-y-3">
          <div>
            <label htmlFor="music-prompt-input" className="block text-xs font-bold text-[#1A260E] mb-1">
              Soundscape Prompt
            </label>
            <textarea
              id="music-prompt-input"
              rows={3}
              value={musicPrompt}
              onChange={(e) => setMusicPrompt(e.target.value)}
              className="zest-input w-full rounded-2xl p-3.5 text-sm font-medium resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex rounded-xl bg-[#E7F2DF] p-1">
              <button
                type="button"
                onClick={() => setMusicMode('clip')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  musicMode === 'clip' ? 'bg-[#4B7C00] text-white' : 'text-[#1A260E]'
                }`}
              >
                Clip (30s)
              </button>
              <button
                type="button"
                onClick={() => setMusicMode('pro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  musicMode === 'pro' ? 'bg-[#4B7C00] text-white' : 'text-[#1A260E]'
                }`}
              >
                Full Track (Pro)
              </button>
            </div>

            <button
              type="submit"
              disabled={musicLoading || !musicPrompt.trim()}
              className="zest-btn-primary rounded-full px-5 min-h-[42px] text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {musicLoading ? 'Composing...' : 'Generate Soundscape'}
            </button>
          </div>
        </form>

        {musicError && (
          <div role="alert" className="rounded-2xl bg-[#FFDAD6] px-4 py-2.5 text-xs font-bold text-[#93000A]">
            {musicError}
          </div>
        )}

        {audioDataUrl && (
          <div className="rounded-2xl bg-[#F2F9ED] border border-[#D8E0D1] p-4 space-y-2">
            <audio controls src={audioDataUrl} className="w-full" />
            {lyrics && (
              <p className="text-xs font-medium text-[#586251] whitespace-pre-wrap">
                {lyrics}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ritual Scene Visualizer (Omni 1.2 Flash) */}
      <div className="zest-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display font-bold text-xl text-[#1A260E] flex items-center gap-2">
            <Film className="w-5 h-5 text-[#4B7C00]" aria-hidden="true" />
            <span>Ritual Visualizer (Omni 1.2 Flash)</span>
          </h2>
          <p className="text-xs font-medium text-[#586251] mt-0.5">
            Generate calming 16:9 or 9:16 ritual loops via the Interactions API (<code className="font-mono">gemini-omni-1.2-flash</code>).
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {VIDEO_PRESETS.map((preset, idx) => (
            <button
              key={preset}
              type="button"
              onClick={() => setVideoPrompt(preset)}
              className="rounded-full px-3 py-1 bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[11px] font-bold text-[#1A260E] cursor-pointer"
            >
              Scene {idx + 1}
            </button>
          ))}
        </div>

        <form onSubmit={handleGenerateVideo} className="space-y-3">
          <div>
            <label htmlFor="video-prompt-input" className="block text-xs font-bold text-[#1A260E] mb-1">
              Visual Scene Prompt
            </label>
            <textarea
              id="video-prompt-input"
              rows={3}
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              className="zest-input w-full rounded-2xl p-3.5 text-sm font-medium resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex rounded-xl bg-[#E7F2DF] p-1">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  aspectRatio === '16:9' ? 'bg-[#4B7C00] text-white' : 'text-[#1A260E]'
                }`}
              >
                16:9 Wide
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  aspectRatio === '9:16' ? 'bg-[#4B7C00] text-white' : 'text-[#1A260E]'
                }`}
              >
                9:16 Vertical
              </button>
            </div>

            <button
              type="submit"
              disabled={videoLoading || !videoPrompt.trim()}
              className="zest-btn-primary rounded-full px-5 min-h-[42px] text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {videoLoading ? 'Rendering Video...' : 'Generate Video'}
            </button>
          </div>
        </form>

        {videoError && (
          <div role="alert" className="rounded-2xl bg-[#FFDAD6] px-4 py-2.5 text-xs font-bold text-[#93000A]">
            {videoError}
          </div>
        )}

        {videoDataUrl && (
          <div className="rounded-2xl bg-[#F2F9ED] border border-[#D8E0D1] p-3">
            <video
              controls
              loop
              playsInline
              src={videoDataUrl}
              className="w-full rounded-xl max-h-[320px] bg-black"
            />
          </div>
        )}
      </div>
    </div>
  );
}
