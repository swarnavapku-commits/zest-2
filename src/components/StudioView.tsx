import { AudioLines, Film, MessageSquareText, Mic } from 'lucide-react';
import { useState } from 'react';
import type { Habit, LevelInfo } from '../types/habit';
import { ApiKeyNotice } from './ApiKeyNotice';
import { CoachChatPanel } from './studio/CoachChatPanel';
import { LiveVoicePanel } from './studio/LiveVoicePanel';
import { MediaStudioPanel } from './studio/MediaStudioPanel';
import { VoiceJournalPanel, type JournalEntryItem } from './studio/VoiceJournalPanel';

type StudioSection = 'coach' | 'live' | 'journal' | 'media';

interface StudioViewProps {
  todayKey: string;
  levelInfo: LevelInfo;
  habits: Habit[];
  completedTodayCount: number;
  totalTodayCount: number;
  bestStreak: number;
  journals: JournalEntryItem[];
  onSaveJournal: (transcript: string, source: 'voice' | 'text') => Promise<void>;
}

const STUDIO_TABS: Array<{
  id: StudioSection;
  label: string;
  Icon: typeof MessageSquareText;
}> = [
  { id: 'coach', label: 'AI Coach & Search', Icon: MessageSquareText },
  { id: 'live', label: 'Live Voice', Icon: Mic },
  { id: 'journal', label: 'Voice Journal', Icon: AudioLines },
  { id: 'media', label: 'Sound & Video', Icon: Film },
];

export function StudioView({
  todayKey,
  levelInfo,
  habits,
  completedTodayCount,
  totalTodayCount,
  bestStreak,
  journals,
  onSaveJournal,
}: StudioViewProps) {
  const [section, setSection] = useState<StudioSection>('coach');

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#4B7C00]">
            Zest AI Wellness Studio
          </span>
          <h1 className="font-display font-extrabold text-3xl text-[#1A260E] tracking-tight mt-0.5">
            Coach, Reflect & Create
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Wellness studio tools"
          className="flex flex-wrap gap-2"
        >
          {STUDIO_TABS.map(({ id, label, Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setSection(id)}
                className={`rounded-full px-4 min-h-[42px] inline-flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#4B7C00] text-white shadow-[0px_3px_0px_#3C6300]'
                    : 'bg-[#FDFFFB] border border-[#D8E0D1] text-[#1A260E] hover:bg-[#E7F2DF]'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ApiKeyNotice />

      <div className={section === 'coach' ? 'block' : 'hidden'}>
        <CoachChatPanel
          levelInfo={levelInfo}
          habits={habits}
          completedTodayCount={completedTodayCount}
          totalTodayCount={totalTodayCount}
          bestStreak={bestStreak}
        />
      </div>

      <div className={section === 'live' ? 'block' : 'hidden'}>
        <LiveVoicePanel />
      </div>

      <div className={section === 'journal' ? 'block' : 'hidden'}>
        <VoiceJournalPanel
          todayKey={todayKey}
          entries={journals}
          onSaveEntry={onSaveJournal}
        />
      </div>

      <div className={section === 'media' ? 'block' : 'hidden'}>
        <MediaStudioPanel />
      </div>
    </section>
  );
}
