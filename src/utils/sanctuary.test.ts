import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSanctuaryMetrics,
  groundHeightAt,
  SANCTUARY_CAMERA_PRESETS,
  SANCTUARY_MOODS,
} from './sanctuary';

test('groundHeightAt keeps central sanctuary plaza flat at y=0', () => {
  assert.equal(groundHeightAt(0, 0), 0);
  assert.equal(groundHeightAt(2.8, 0.9), 0);
  assert.notEqual(groundHeightAt(12, 8), undefined);
});

test('computeSanctuaryMetrics scales canopy, blossoms, and lantern glow with progress', () => {
  const low = computeSanctuaryMetrics({ level: 1, dailyPercentage: 0, bestStreak: 0 });
  const high = computeSanctuaryMetrics({ level: 6, dailyPercentage: 100, bestStreak: 12 });

  assert.ok(high.canopyScale > low.canopyScale);
  assert.ok(high.blossomRatio > low.blossomRatio);
  assert.ok(high.lanternGlow > low.lanternGlow);
  assert.equal(high.stageLabel, 'Full Daily Bloom');
});

test('camera presets and mood palettes include all required keys', () => {
  assert.ok(SANCTUARY_CAMERA_PRESETS.overview);
  assert.ok(SANCTUARY_CAMERA_PRESETS.tree);
  assert.ok(SANCTUARY_CAMERA_PRESETS.fountain);
  assert.ok(SANCTUARY_CAMERA_PRESETS.lantern);
  assert.equal(SANCTUARY_MOODS.morning.skyHex, SANCTUARY_MOODS.morning.fogHex);
  assert.equal(SANCTUARY_MOODS.golden.skyHex, SANCTUARY_MOODS.golden.fogHex);
  assert.equal(SANCTUARY_MOODS.twilight.skyHex, SANCTUARY_MOODS.twilight.fogHex);
});
