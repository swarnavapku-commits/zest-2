export type SanctuaryMood = 'morning' | 'golden' | 'twilight';
export type SanctuaryCameraPresetId = 'overview' | 'tree' | 'fountain' | 'lantern';

export interface SanctuaryMetrics {
  canopyScale: number;
  blossomRatio: number;
  lanternGlow: number;
  fountainFlow: number;
  stageLabel: string;
}

export interface CameraPresetConfig {
  id: SanctuaryCameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface MoodPaletteConfig {
  id: SanctuaryMood;
  label: string;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  keyColorHex: number;
  keyIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  lanternBoost: number;
}

export const SANCTUARY_CAMERA_PRESETS: Record<
  SanctuaryCameraPresetId,
  CameraPresetConfig
> = {
  overview: {
    id: 'overview',
    label: 'Sanctuary',
    position: [8.8, 5.8, 9.6],
    target: [0, 1.5, 0],
  },
  tree: {
    id: 'tree',
    label: 'Ritual Tree',
    position: [4.2, 3.6, 5.2],
    target: [0, 2.2, 0],
  },
  fountain: {
    id: 'fountain',
    label: 'Zen Basin',
    position: [5.4, 2.2, 2.6],
    target: [2.8, 0.7, 0.9],
  },
  lantern: {
    id: 'lantern',
    label: 'Lantern Shrine',
    position: [-5.1, 2.5, 4.1],
    target: [-2.6, 1.15, 1.4],
  },
};

export const SANCTUARY_MOODS: Record<SanctuaryMood, MoodPaletteConfig> = {
  morning: {
    id: 'morning',
    label: 'Morning Mist',
    skyHex: 0xe6f2dc,
    fogHex: 0xe6f2dc,
    fogDensity: 0.015,
    keyColorHex: 0xfff3d6,
    keyIntensity: 2.1,
    hemiSkyHex: 0xd4ecff,
    hemiGroundHex: 0x456628,
    hemiIntensity: 0.9,
    lanternBoost: 0.7,
  },
  golden: {
    id: 'golden',
    label: 'Golden Hour',
    skyHex: 0xf4e8d2,
    fogHex: 0xf4e8d2,
    fogDensity: 0.017,
    keyColorHex: 0xffc985,
    keyIntensity: 2.35,
    hemiSkyHex: 0xd9e4ff,
    hemiGroundHex: 0x526324,
    hemiIntensity: 0.82,
    lanternBoost: 1.15,
  },
  twilight: {
    id: 'twilight',
    label: 'Calm Dusk',
    skyHex: 0x1d2b24,
    fogHex: 0x1d2b24,
    fogDensity: 0.02,
    keyColorHex: 0xaec8ff,
    keyIntensity: 1.25,
    hemiSkyHex: 0x5d7aa8,
    hemiGroundHex: 0x263820,
    hemiIntensity: 0.82,
    lanternBoost: 2.1,
  },
};

export function groundHeightAt(x: number, z: number): number {
  const distSq = x * x + z * z;
  const centerFlat = Math.min(1, Math.max(0, (Math.sqrt(distSq) - 4.2) / 8));
  const gentleWave =
    (Math.sin(x * 0.28) * Math.cos(z * 0.28) * 0.45 +
      Math.sin((x + z) * 0.16) * 0.25) *
    centerFlat;
  return Number(gentleWave.toFixed(4));
}

export function computeSanctuaryMetrics(params: {
  level: number;
  dailyPercentage: number;
  bestStreak: number;
}): SanctuaryMetrics {
  const safeLevel = Math.max(1, params.level);
  const safeDaily = Math.min(100, Math.max(0, params.dailyPercentage));
  const safeStreak = Math.max(0, params.bestStreak);

  const canopyScale = Number(
    Math.min(1.45, 0.82 + (safeLevel - 1) * 0.08 + (safeDaily / 100) * 0.12).toFixed(3),
  );
  const blossomRatio = Number(
    Math.min(1, 0.15 + (safeDaily / 100) * 0.85).toFixed(3),
  );
  const lanternGlow = Number(
    Math.min(2.2, 0.55 + Math.min(safeStreak, 14) * 0.08 + (safeDaily / 100) * 0.45).toFixed(3),
  );
  const fountainFlow = Number(
    Math.min(1.8, 0.4 + (safeDaily / 100) * 1.4).toFixed(3),
  );

  let stageLabel = 'Young Sprout Grove';
  if (safeDaily >= 100) {
    stageLabel = 'Full Daily Bloom';
  } else if (safeLevel >= 5) {
    stageLabel = 'Flourishing Canopy';
  } else if (safeDaily >= 50) {
    stageLabel = 'Sunlit Awakening';
  }

  return {
    canopyScale,
    blossomRatio,
    lanternGlow,
    fountainFlow,
    stageLabel,
  };
}
