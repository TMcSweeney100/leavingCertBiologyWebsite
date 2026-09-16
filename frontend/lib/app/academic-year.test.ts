import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { currentAcademicYear } from './academic-year.ts';

describe('currentAcademicYear', () => {
  test('rolls over in August', () => {
    assert.equal(currentAcademicYear(new Date(2026, 8, 15)), '2026/27');
    assert.equal(currentAcademicYear(new Date(2027, 6, 31)), '2026/27');
    assert.equal(currentAcademicYear(new Date(2027, 7, 1)), '2027/28');
    assert.equal(currentAcademicYear(new Date(2099, 9, 1)), '2099/00');
  });
});
