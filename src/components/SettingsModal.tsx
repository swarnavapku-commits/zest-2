import { Eye, EyeOff, ExternalLink, KeyRound, Settings, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { maskApiKey, removeApiKey, setApiKey, useApiKey } from '../lib/apiKey';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (message: string) => void;
}

export function SettingsModal({ isOpen, onClose, onNotify }: SettingsModalProps) {
  const savedKey = useApiKey();
  const [draft, setDraft] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft('');
    setVisible(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setApiKey(draft);
    setDraft('');
    setVisible(false);
    onNotify?.('Gemini API key saved');
    onClose();
  };

  const handleRemove = () => {
    removeApiKey();
    onNotify?.('Gemini API key removed');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#131F08]/55 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="zest-modal-in w-full sm:max-w-md bg-[#FDFFFB] border-2 border-[#D8E0D1] rounded-t-3xl sm:rounded-3xl shadow-[0px_12px_36px_rgba(26,38,14,0.18)] max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div
          className="sm:hidden w-10 h-1.5 bg-[#D8E0D1] rounded-full mx-auto mt-3 shrink-0"
          aria-hidden="true"
        />

        <div className="p-6 pb-4 border-b border-[#D8E0D1]/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E7F2DF] text-[#4B7C00] flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2
              id="settings-modal-title"
              className="font-display font-bold text-xl sm:text-2xl text-[#1A260E]"
            >
              Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-10 h-10 rounded-full hover:bg-[#E7F2DF] text-[#586251] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label
              htmlFor="gemini-api-key"
              className="flex items-center gap-1.5 text-sm font-bold text-[#1A260E] mb-1.5"
            >
              <KeyRound className="w-4 h-4 text-[#4B7C00]" aria-hidden="true" />
              Gemini API key
            </label>
            <p className="text-xs text-[#586251] mb-3">
              Zest&apos;s AI features (Coach, Auto-plan, Live voice, Music, Video, Voice journal)
              use your own Gemini API key.
            </p>

            {savedKey && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#E7F2DF] px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#4B7C00]">
                    Key saved
                  </div>
                  <div className="font-mono text-xs text-[#1A260E] truncate">
                    {maskApiKey(savedKey)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 min-h-[36px] text-xs font-bold text-[#9A2B1B] hover:bg-[#FDFFFB] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            )}

            <div className="relative">
              <input
                id="gemini-api-key"
                type={visible ? 'text' : 'password'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={savedKey ? 'Paste a new key to replace' : 'Paste your API key (AIza…)'}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-2xl border-2 border-[#D8E0D1] bg-white px-3.5 pr-12 min-h-[46px] text-sm font-mono text-[#1A260E] focus:outline-none focus:border-[#4B7C00]"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Hide key' : 'Show key'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-[#586251] hover:bg-[#E7F2DF] flex items-center justify-center cursor-pointer"
              >
                {visible ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>

            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#4B7C00] hover:underline"
            >
              Get a free key from Google AI Studio
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>

          <p className="text-[11px] leading-relaxed text-[#586251] rounded-2xl bg-[#F2F9ED] px-3.5 py-2.5">
            Your key is stored only in this browser. It is sent securely with your AI requests and
            is never saved on our servers.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 min-h-[44px] text-sm font-bold text-[#586251] hover:bg-[#E7F2DF] cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!draft.trim()}
              className="zest-btn-primary rounded-full px-5 min-h-[44px] text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
