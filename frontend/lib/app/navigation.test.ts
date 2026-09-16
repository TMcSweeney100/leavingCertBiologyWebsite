import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_NAV, landingFor, safeNext, teacherSchoolId } from './navigation.ts';
import type { Me } from '../api/schemas.ts';

const school = { schoolId: '11111111-1111-1111-1111-111111111111', schoolName: 'School A' };

function me(roles: Me['roles'], mustChangePassword = false): Me {
  return {
    userId: 'u1',
    username: 'someone',
    firstName: 'Some',
    lastName: 'One',
    mustChangePassword,
    roles,
  };
}

describe('safeNext', () => {
  test('accepts only same-origin absolute paths', () => {
    assert.equal(safeNext('/teach/classes/abc'), '/teach/classes/abc');
    assert.equal(safeNext('/home?x=1'), '/home?x=1');
    for (const bad of [undefined, null, '', 'home', '//evil.example', 'https://evil.example', '/\\evil', '/login']) {
      assert.equal(safeNext(bad), undefined, String(bad));
    }
  });
});

describe('landingFor', () => {
  test('forced password change beats everything', () => {
    assert.equal(landingFor(me([{ ...school, role: 'TEACHER' }], true), '/home'), '/account/password');
  });

  test('a safe next beats the role landing', () => {
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }]), '/join/ABCDEFGH'), '/join/ABCDEFGH');
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }]), '//evil.example'), '/home');
  });

  test('highest role wins: teacher, then leader, then student', () => {
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }, { ...school, role: 'TEACHER' }])), '/teach');
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }, { ...school, role: 'SCHOOL_LEADER' }])), '/school');
    assert.equal(landingFor(me([{ ...school, role: 'STUDENT' }])), '/home');
    assert.equal(landingFor(me([])), '/home');
  });
});

describe('teacherSchoolId', () => {
  test('is the school of the TEACHER role, or undefined', () => {
    assert.equal(teacherSchoolId(me([{ ...school, role: 'TEACHER' }])), school.schoolId);
    assert.equal(teacherSchoolId(me([{ ...school, role: 'STUDENT' }])), undefined);
  });
});

describe('APP_NAV', () => {
  test('offers one landing per role held, in the roadmap order', () => {
    const all = APP_NAV(me([{ ...school, role: 'STUDENT' }, { ...school, role: 'TEACHER' }, { ...school, role: 'SCHOOL_LEADER' }]));
    assert.deepEqual(all.map((n) => n.href), ['/teach', '/school', '/home']);
    assert.deepEqual(APP_NAV(me([{ ...school, role: 'STUDENT' }])).map((n) => n.label), ['Timeline']);
  });
});
