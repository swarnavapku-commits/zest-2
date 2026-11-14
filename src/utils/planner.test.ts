import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampBlockRange,
  createInitialPlannerSeed,
  formatMinutesLabel,
  getMonthCalendarGrid,
  getWeekDatesForKey,
  parseTimeStringToMinutes,
  snapToQuarterHour,
  validatePlannerTaskInput,
} from './planner';

test('formatMinutesLabel and parseTimeStringToMinutes round-trip cleanly', () => {
  assert.equal(formatMinutesLabel(360), '6:00 AM');
  assert.equal(formatMinutesLabel(720), '12:00 PM');
  assert.equal(formatMinutesLabel(810), '1:30 PM');
  assert.equal(formatMinutesLabel(1380), '11:00 PM');
  assert.equal(parseTimeStringToMinutes('09:15'), 555);
  assert.equal(parseTimeStringToMinutes('25:00'), null);
});

test('snapToQuarterHour and clampBlockRange keep blocks within 6 AM - 11 PM', () => {
  assert.equal(snapToQuarterHour(547), 540);
  assert.equal(snapToQuarterHour(551), 555);

  const clampedEarly = clampBlockRange(200, 230);
  assert.equal(clampedEarly.startMinutes, 360);
  assert.equal(clampedEarly.endMinutes, 390);

  const clampedLate = clampBlockRange(1360, 1450);
  assert.equal(clampedLate.endMinutes, 1380);
  assert.ok(clampedLate.startMinutes <= 1365);
});

test('validatePlannerTaskInput enforces title, date, and scheduled time order', () => {
  const invalidEmpty = validatePlannerTaskInput({
    title: '  ',
    dateKey: '2026-11-13',
    scheduled: false,
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 30,
    priority: 'Medium',
    category: 'Focus',
    notes: '',
  });
  assert.equal(invalidEmpty.valid, false);
  assert.ok(invalidEmpty.errors.title);

  const invalidOrder = validatePlannerTaskInput({
    title: 'Deep Focus Session',
    dateKey: '2026-11-13',
    scheduled: true,
    startTime: '14:00',
    endTime: '13:30',
    durationMinutes: 30,
    priority: 'High',
    category: 'Focus',
    notes: '',
  });
  assert.equal(invalidOrder.valid, false);
  assert.ok(invalidOrder.errors.time);

  const valid = validatePlannerTaskInput({
    title: 'Deep Focus Session',
    dateKey: '2026-11-13',
    scheduled: true,
    startTime: '14:00',
    endTime: '15:00',
    durationMinutes: 60,
    priority: 'High',
    category: 'Focus',
    notes: 'Prepare slides',
  });
  assert.equal(valid.valid, true);
});

test('calendar grid generators produce 42 month cells and 7 week days', () => {
  const monthGrid = getMonthCalendarGrid(2026, 10); // Nov 2026
  assert.equal(monthGrid.length, 42);
  assert.equal(monthGrid.filter((c) => c.inCurrentMonth).length, 30);

  const week = getWeekDatesForKey('2026-11-13');
  assert.equal(week.length, 7);
  assert.equal(week[0].dayShort, 'Mon');
  assert.equal(week[4].dateKey, '2026-11-13');
});

test('createInitialPlannerSeed produces unscheduled tasks and scheduled blocks', () => {
  const seed = createInitialPlannerSeed(new Date(2026, 10, 13));
  assert.ok(seed.tasks.some((t) => t.startMinutes === null));
  assert.ok(seed.timeBlocks.length >= 2);
});
