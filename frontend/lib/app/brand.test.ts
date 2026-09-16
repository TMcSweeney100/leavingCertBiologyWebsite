import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { headerSchoolName } from './brand.ts';

describe('headerSchoolName', () => {
  test('uses the short name when the operator set one', () => {
    const roles = [{ schoolName: 'North Wicklow Educate Together Secondary School', schoolShortName: 'North Wicklow ETSS' }];
    assert.equal(headerSchoolName(roles), 'North Wicklow ETSS');
  });

  test('falls back to the full name', () => {
    assert.equal(headerSchoolName([{ schoolName: 'School A', schoolShortName: null }]), 'School A');
  });

  test('is undefined for an account with no roles yet', () => {
    assert.equal(headerSchoolName([]), undefined);
  });
});
