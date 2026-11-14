import { KeyRound } from 'lucide-react';
import { openSettings, useApiKey } from '../lib/apiKey';

/** Shown on AI screens while the user has not added their own Gemini API key. */
export function ApiKeyNotice({ className = '' }: { className?: string }) {
  const key = useApiKey();
  if (key) return null;
  return (
    <div
      role="status"
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-[#F0D9A8] bg-[#FFF8E6] px-4 py-3 ${className}`}
    >
      <div className="flex items-start gap-2.5 text-sm text-[#5A4310]">
        <KeyRound className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span className="font-semibold">
          Add your own Gemini API key in Settings to use AI features.
        </span>
      </div>
      <button
        type="button"
        onClick={openSettings}
        className="shrink-0 rounded-full px-4 min-h-[40px] bg-[#4B7C00] hover:bg-[#3C6300] text-white text-xs font-bold cursor-pointer"
      >
        Open Settings
      </button>
    </div>
  );
}
