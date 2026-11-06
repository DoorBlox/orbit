import test from 'node:test';
import assert from 'node:assert/strict';
import { validDateKey, todayKey, dateKey, civilTimestamp, addCivilDays, dateLabel } from '../src/dates.js';
import { daysUntil, formatDate } from '../src/model.js';

test('Jakarta day changes at 17:00 UTC regardless of process timezone', () => {
  assert.equal(todayKey(new Date('2026-11-01T16:59:59Z')), '2026-11-01');
  assert.equal(todayKey(new Date('2026-11-01T17:00:00Z')), '2026-11-02');
  assert.equal(dateKey('2026-11-01T20:30:00Z'), '2026-11-02');
  assert.equal(dateKey('2026-11-01'), '2026-11-01');
});

test('invalid civil dates never overflow to a different day', () => {
  for (const value of ['', null, '2026-02-29', '2026-13-01', '2026-11-31', '2026-1-01', 'garbage']) {
    assert.equal(validDateKey(value), false, String(value));
    assert.ok(Number.isNaN(civilTimestamp(value)), String(value));
  }
  assert.equal(validDateKey('2028-02-29'), true);
  assert.equal(dateKey('garbage', new Date('2026-11-01T20:30Z')), '2026-11-02');
});

test('civil arithmetic crosses months and leap years without host local time', () => {
  assert.equal(addCivilDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addCivilDays('2028-02-29', 1), '2028-03-01');
  assert.equal(addCivilDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addCivilDays('invalid', 1), '');
});

test('deadlines and labels use the same civil day as the journal', () => {
  const now = new Date('2026-11-01T20:30Z');
  assert.equal(daysUntil('2026-11-02', now), 0);
  assert.equal(daysUntil('2026-11-01', now), -1);
  assert.equal(daysUntil('2026-11-03', now), 1);
  assert.equal(daysUntil('2026-02-29', now), null);
  assert.equal(formatDate('2026-11-02'), 'Nov 2, 2026');
  assert.equal(formatDate('2026-02-29'), 'Anytime');
  assert.equal(dateLabel('2026-11-02', {month:'short',day:'numeric'}), 'Nov 2');
  assert.equal(dateLabel('invalid'), '');
});
