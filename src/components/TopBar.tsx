import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Compass,
  LogIn,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Trees,
} from 'lucide-react';
import { ZestBrandMark } from './Icons';

export type AppTab =
  | 'today'
  | 'calendar'
  | 'routines'
  | 'insights'
  | 'rewards'
  | 'sanctuary'
  | 'studio';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenNewHabit: () => void;
  onOpenSettings: () => void;
  userDisplayName?: string | null;
  userEmail?: string | null;
  signingIn?: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  mobileLabel: string;
  Icon: typeof CheckCircle2;
}> = [
  { id: 'today', label: 'Today', mobileLabel: 'Today', Icon: CheckCircle2 },
  { id: 'calendar', label: 'Calendar', mobileLabel: 'Calendar', Icon: CalendarDays },
  { id: 'routines', label: 'Routines', mobileLabel: 'Routines', Icon: Compass },
  { id: 'insights', label: 'Insights', mobileLabel: 'Insights', Icon: BarChart3 },
  { id: 'rewards', label: 'Rewards', mobileLabel: 'Rewards', Icon: Award },
  { id: 'sanctuary', label: 'Sanctuary', mobileLabel: 'Garden', Icon: Trees },
  { id: 'studio', label: 'Studio', mobileLabel: 'Studio', Icon: Sparkles },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onOpenNewHabit,
  onOpenSettings,
  userDisplayName,
  userEmail,
  signingIn,
  onSignIn,
  onSignOut,
}: TopBarProps) {
  const isSignedIn = Boolean(userEmail || userDisplayName);
  const shortName =
    (userDisplayName || userEmail || 'Account').split(/[@\s]/)[0].slice(0, 12);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#F2F9ED]/95 border-b border-[#D8E0D1]/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-[72px] flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('today')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-2"
            aria-label="Zest home"
          >
            <ZestBrandMark className="w-8 h-8" />
            <span className="font-display font-extrabold text-2xl tracking-tight text-[#1A260E] whitespace-nowrap shrink-0">
              Zest
            </span>
          </button>

          {/* Zone 2: Desktop navigation links */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5" aria-label="Primary navigation">
            {NAV_ITEMS.map(({ id, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTab(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-2 text-[14px] lg:text-[15px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-4 rounded-md ${
                    isActive
                      ? 'text-[#1A260E]'
                      : 'text-[#586251] hover:text-[#1A260E]'
                  }`}
                >
                  {label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-0.5 h-[3px] rounded-full bg-[#4B7C00]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Auth & Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSettings}
              title="Settings"
              aria-label="Open settings"
              className="rounded-full w-[42px] h-[42px] bg-[#FDFFFB] border border-[#D8E0D1] hover:bg-[#E7F2DF] text-[#586251] hover:text-[#1A260E] inline-flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4B7C00] focus-visible:outline-offset-2"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
            {isSignedIn ? (
              <button
                type="button"
                onClick={onSignOut}
                title={`Signed in as ${userEmail || userDisplayName}. Click to sign out.`}
                aria-label={`Sign out ${shortName}`}
                className="rounded-full px-3 min-h-[42px] bg-[#E7F2DF] hover:bg-[#D7F3C2] text-[#1A260E] inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                <span className="max-w-[84px] truncate">{shortName}</span>
                <LogOut className="w-3.5 h-3.5 text-[#586251]" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={signingIn}
                className="rounded-full px-3.5 min-h-[42px] bg-[#FDFFFB] border border-[#D8E0D1] hover:bg-[#E7F2DF] text-[#1A260E] inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5 text-[#4B7C00]" aria-hidden="true" />
                <span>{signingIn ? 'Signing in...' : 'Sign In'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNewHabit}
              className="zest-btn-primary rounded-full px-4 sm:px-5 min-h-[44px] inline-flex items-center gap-1.5 text-sm sm:text-[15px] font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A260E] focus-visible:outline-offset-2"
            >
              <Plus className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
              <span className="hidden sm:inline">New Habit</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FDFFFB] border-t-2 border-[#D8E0D1] px-1"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-7 items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ id, mobileLabel, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-[#4B7C00] font-bold'
                    : 'text-[#586251] font-semibold hover:text-[#1A260E]'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.6 : 2.1} aria-hidden="true" />
                <span className="text-[10px] leading-none">{mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
