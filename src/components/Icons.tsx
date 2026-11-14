import {
  Apple,
  BookOpen,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Moon,
  PenLine,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react';
import type { HabitCategory, HabitIconId } from '../types/habit';

interface HabitIconProps {
  icon: HabitIconId;
  className?: string;
}

export function HabitIcon({ icon, className = 'w-6 h-6' }: HabitIconProps) {
  const props = { className, strokeWidth: 2.5, 'aria-hidden': true as const };

  switch (icon) {
    case 'droplets':
      return <Droplets {...props} />;
    case 'sun':
      return <Sun {...props} />;
    case 'book':
      return <BookOpen {...props} />;
    case 'footprints':
      return <Footprints {...props} />;
    case 'wind':
      return <Wind {...props} />;
    case 'moon':
      return <Moon {...props} />;
    case 'apple':
      return <Apple {...props} />;
    case 'dumbbell':
      return <Dumbbell {...props} />;
    case 'sparkles':
      return <Sparkles {...props} />;
    case 'coffee':
      return <Coffee {...props} />;
    case 'heart':
      return <Heart {...props} />;
    case 'pen':
      return <PenLine {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

export function getCategoryIconColors(category: HabitCategory): {
  bg: string;
  text: string;
} {
  switch (category) {
    case 'Mindfulness':
      return { bg: 'bg-[#D9E2FF]', text: 'text-[#395CA7]' };
    case 'Movement':
      return { bg: 'bg-[#FFF0D4]', text: 'text-[#995F00]' };
    case 'Focus':
      return { bg: 'bg-[#D7F3C2]', text: 'text-[#3D6700]' };
    case 'Wellness':
    default:
      return { bg: 'bg-[#E7F2DF]', text: 'text-[#4B7C00]' };
  }
}

export function SproutMascot({ className = 'w-20 h-20' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Warm sunlit aura */}
      <circle cx="48" cy="48" r="42" fill="#2E4F00" />
      <circle cx="48" cy="48" r="34" fill="#3C6300" />
      {/* Terracotta-cream pot */}
      <path
        d="M31 58H65L60.5 76C59.8 78.8 57.3 80.5 54.4 80.5H41.6C38.7 80.5 36.2 78.8 35.5 76L31 58Z"
        fill="#FFDDB6"
      />
      <rect x="28" y="52" width="40" height="8" rx="4" fill="#FFB95A" />
      {/* Stem */}
      <path
        d="M48 52V33"
        stroke="#B6F56D"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Left leaf */}
      <path
        d="M47 38C47 28 36 22 27 25C25 34 34 42 47 38Z"
        fill="#9BD854"
      />
      {/* Right leaf */}
      <path
        d="M49 34C49 23 60 18 69 22C70 31 61 39 49 34Z"
        fill="#D7F3C2"
      />
      {/* Friendly sprout face */}
      <circle cx="42.5" cy="67" r="2.2" fill="#1A260E" />
      <circle cx="53.5" cy="67" r="2.2" fill="#1A260E" />
      <path
        d="M44.5 71.5C46.2 73.2 49.8 73.2 51.5 71.5"
        stroke="#1A260E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Sparkle */}
      <path
        d="M74 14L75.6 18.4L80 20L75.6 21.6L74 26L72.4 21.6L68 20L72.4 18.4L74 14Z"
        fill="#FFB95A"
      />
    </svg>
  );
}

export function ZestBrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="12" fill="#4B7C00" />
      <path
        d="M18 26V15"
        stroke="#D7F3C2"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M18 19C18 13.5 13 10.5 9.5 12C9 16.5 13 20.5 18 19Z"
        fill="#9BD854"
      />
      <path
        d="M18 16.5C18 11 23.5 8.5 27 10.5C27.5 15 23 18.5 18 16.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
