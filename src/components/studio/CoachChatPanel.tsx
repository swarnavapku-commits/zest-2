import { ExternalLink, Globe, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Habit, LevelInfo } from '../../types/habit';
import { aiFetch } from '../../lib/apiKey';

type ChatModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-4-carbon';

type CoachPersona = 'coach' | 'mindfulness' | 'scientist';

interface GroundingSource {
  title: string;
  uri: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  sources?: GroundingSource[];
}

interface CoachChatPanelProps {
  levelInfo: LevelInfo;
  habits: Habit[];
  completedTodayCount: number;
  totalTodayCount: number;
  bestStreak: number;
}

const MODEL_OPTIONS: Array<{ id: ChatModelId; label: string; hint: string }> = [
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen', hint: 'Balanced + Search' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', hint: 'Ultra-fast' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon', hint: 'Complex planning (Paid)' },
  { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon', hint: 'Deep reasoning (Paid)' },
];

const PERSONAS: Array<{ id: CoachPersona; label: string }> = [
  { id: 'coach', label: 'Habit Coach' },
  { id: 'mindfulness', label: 'Mindfulness Guide' },
  { id: 'scientist', label: 'Wellness Researcher' },
];

const QUICK_PROMPTS = [
  'Suggest a 10-minute morning ritual stack for my current habits.',
  'What are the latest sleep hygiene findings for morning energy?',
  'Help me protect my streak on busy workdays.',
];

export function CoachChatPanel({
  levelInfo,
  habits,
  completedTodayCount,
  totalTodayCount,
  bestStreak,
}: CoachChatPanelProps) {
  const [model, setModel] = useState<ChatModelId>('gemini-4-hydrogen');
  const [persona, setPersona] = useState<CoachPersona>('coach');
  const [useSearch, setUseSearch] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: `Hi! I'm your Zest ${PERSONAS[0].label}. You're at Level ${levelInfo.level} (${levelInfo.title}) with ${completedTodayCount}/${totalTodayCount} rituals done today. Ask me anything about habit stacking, recovery, or current wellness research!`,
      modelUsed: 'gemini-4-hydrogen',
    },
  ]);

  const sendMessage = async (
    textToSend: string,
    overrideSearch?: boolean,
  ) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const effectiveSearch =
      typeof overrideSearch === 'boolean' ? overrideSearch : useSearch;

    const alreadyHasLastUser =
      overrideSearch === false &&
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user' &&
      messages[messages.length - 1].text === trimmed;

    const nextHistory = alreadyHasLastUser
      ? messages
      : [
          ...messages,
          {
            id: `u-${Date.now()}`,
            role: 'user' as const,
            text: trimmed,
          },
        ];

    if (!alreadyHasLastUser) {
      setMessages(nextHistory);
      setInput('');
    }
    setErrorMsg(null);
    setLastFailedPrompt(null);
    setLoading(true);

    try {
      const res = await aiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          model: effectiveSearch ? 'gemini-4-hydrogen' : model,
          persona,
          useSearchGrounding: effectiveSearch,
          habitContext: {
            level: levelInfo.level,
            title: levelInfo.title,
            completedToday: completedTodayCount,
            totalToday: totalTodayCount,
            bestStreak,
            habitNames: habits.filter((h) => !h.archived).map((h) => h.title),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not reach Gemini coach.');
        if (effectiveSearch) {
          setLastFailedPrompt(trimmed);
        }
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.reply,
          modelUsed: data.modelUsed,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch {
      setErrorMsg('Network error while contacting Zest Coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setErrorMsg(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: 'Started a fresh coaching thread. What ritual or wellness goal would you like to explore?',
      },
    ]);
  };

  return (
    <div className="zest-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[#1A260E] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4B7C00]" aria-hidden="true" />
            <span>Multi-Turn Wellness Coach</span>
          </h2>
          <p className="text-xs font-medium text-[#586251] mt-0.5">
            Maintains full conversation context with optional live Google Search grounding.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="rounded-full px-3.5 min-h-[38px] bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>New Thread</span>
        </button>
      </div>

      {/* Controls: Model, Persona, Search Grounding */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#F2F9ED] rounded-2xl p-3 border border-[#D8E0D1]/80">
        <div>
          <label htmlFor="coach-model-select" className="block text-[11px] font-bold uppercase tracking-wider text-[#586251] mb-1">
            Gemini Model
          </label>
          <select
            id="coach-model-select"
            value={useSearch ? 'gemini-4-hydrogen' : model}
            disabled={useSearch}
            onChange={(e) => setModel(e.target.value as ChatModelId)}
            className="zest-input w-full h-10 rounded-xl px-3 text-xs font-semibold disabled:opacity-75"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.hint})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="coach-persona-select" className="block text-[11px] font-bold uppercase tracking-wider text-[#586251] mb-1">
            Coach Persona
          </label>
          <select
            id="coach-persona-select"
            value={persona}
            onChange={(e) => setPersona(e.target.value as CoachPersona)}
            className="zest-input w-full h-10 rounded-xl px-3 text-xs font-semibold"
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setUseSearch((v) => !v)}
            aria-pressed={useSearch}
            className={`w-full h-10 rounded-xl px-3 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              useSearch
                ? 'bg-[#4B7C00] text-white'
                : 'bg-[#E7F2DF] text-[#1A260E] hover:bg-[#D7F3C2]'
            }`}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span>Search Grounding: {useSearch ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void sendMessage(q)}
            disabled={loading}
            className="shrink-0 sm:shrink rounded-full px-3.5 py-1.5 bg-[#E7F2DF] hover:bg-[#D7F3C2] text-xs font-semibold text-[#1A260E] cursor-pointer disabled:opacity-60 text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Scrollable Conversation Thread */}
      <div
        aria-live="polite"
        data-testid="coach-chat-thread"
        className="h-[250px] sm:h-[320px] overflow-y-auto rounded-2xl bg-[#F2F9ED] border border-[#D8E0D1] p-4 space-y-3"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-[#4B7C00] text-white'
                    : 'bg-[#FDFFFB] border border-[#D8E0D1] text-[#1A260E]'
                }`}
              >
                {msg.text}
              </div>
              {!isUser && msg.sources && msg.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[85%]">
                  {msg.sources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-[#D7F3C2] px-2.5 py-1 text-[11px] font-bold text-[#1A260E] hover:bg-[#ccebb5]"
                    >
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      <span className="truncate max-w-[180px]">{src.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="text-xs font-semibold text-[#4B7C00]">
            Thinking with {useSearch ? 'Gemini 4 Hydrogen + Search' : model}...
          </div>
        )}
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-2xl bg-[#FFDAD6] px-4 py-2.5 text-xs font-bold text-[#93000A] flex flex-wrap items-center justify-between gap-2">
          <span>{errorMsg}</span>
          {lastFailedPrompt && (
            <button
              type="button"
              onClick={() => {
                setUseSearch(false);
                void sendMessage(lastFailedPrompt, false);
              }}
              className="rounded-full bg-[#93000A] text-white px-3 py-1 text-[11px] font-bold hover:opacity-90 cursor-pointer"
            >
              Turn off Search & Retry
            </button>
          )}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="coach-chat-input" className="sr-only">
          Ask your Zest habit coach
        </label>
        <input
          id="coach-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about habit routines, sleep science, or focus..."
          className="zest-input flex-1 h-12 rounded-2xl px-4 text-sm font-medium"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="zest-btn-primary rounded-2xl px-5 h-12 inline-flex items-center gap-1.5 text-sm font-bold cursor-pointer disabled:opacity-60"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
