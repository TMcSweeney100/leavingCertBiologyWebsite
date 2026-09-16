import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { askedAgo } from './asked-ago.ts';

// 16 Sep 2026, 10:00 in Dublin (09:00 UTC, Irish summer time).
const NOW = new Date('2026-09-16T09:00:00Z');

describe('askedAgo', () => {
  test('counts Dublin calendar days, not 24-hour spans', () => {
    assert.equal(askedAgo('2026-09-16T00:30:00Z', NOW), 'asked today');
    // 23:30 UTC on the 15th is 00:30 on the 16th in Dublin: still today.
    assert.equal(askedAgo('2026-09-15T23:30:00Z', NOW), 'asked today');
    assert.equal(askedAgo('2026-09-15T22:30:00Z', NOW), 'asked yesterday');
  });

  test('says how many days for the last week', () => {
    assert.equal(askedAgo('2026-09-14T12:00:00Z', NOW), 'asked 2 days ago');
    assert.equal(askedAgo('2026-09-10T12:00:00Z', NOW), 'asked 6 days ago');
  });

  test('gives the date for anything older', () => {
    assert.equal(askedAgo('2026-09-09T12:00:00Z', NOW), 'asked on 9 Sept 2026');
  });

  test('treats a clock slightly ahead of this one as today', () => {
    assert.equal(askedAgo('2026-09-16T09:05:00Z', NOW), 'asked today');
  });
});
