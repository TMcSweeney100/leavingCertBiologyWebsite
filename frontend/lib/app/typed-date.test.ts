import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTypedDate, typedDate, typedFromInput } from './typed-date.ts';

describe('typedFromInput', () => {
  test('keeps the digits and puts the slashes back as you type', () => {
    assert.deepEqual(['1', '16', '161', '1610', '16102', '16102026'].map(typedFromInput), ['1', '16', '16/1', '16/10', '16/10/2', '16/10/2026']);
  });

  test('takes pasted text with its own separators, cut at eight digits', () => {
    assert.equal(typedFromInput('16-10-2026'), '16/10/2026');
    assert.equal(typedFromInput('16/10/20269'), '16/10/2026');
    assert.equal(typedFromInput(''), '');
  });

  test('a pasted ISO date becomes day first', () => {
    assert.equal(typedFromInput('2026-10-16'), '16/10/2026');
  });

  test('deleting back over a slash does not bring it back', () => {
    assert.equal(typedFromInput('16/'), '16');
  });

  test('typing one character at a time, through the mask, ends in a whole date', () => {
    let field = '';
    for (const key of '30102026') field = typedFromInput(field + key);
    assert.equal(field, '30/10/2026');
    field = '';
    for (const key of '5/1/2026') field = typedFromInput(field + key);
    assert.equal(field, '05/01/2026');
  });

  test('digits past a full day or month roll on into the next part', () => {
    assert.deepEqual(['30/102', '1610/2026'].map(typedFromInput), ['30/10/2', '16/10/2026']);
  });

  test('typed separators finish a one-digit day or month with its zero', () => {
    assert.deepEqual(['5/', '5/1/2026', '5.10.2026'].map(typedFromInput), ['05', '05/01/2026', '05/10/2026']);
  });
});

describe('parseTypedDate', () => {
  test('a complete real date is an ISO date', () => {
    assert.equal(parseTypedDate('16/10/2026'), '2026-10-16');
    assert.equal(parseTypedDate('29/02/2028'), '2028-02-29');
  });

  test('anything else is null: unfinished, impossible, or empty', () => {
    for (const text of ['', '16', '16/10', '16/10/202', '31/02/2026', '29/02/2027', '00/10/2026', '16/13/2026', '16/10/0026']) {
      assert.equal(parseTypedDate(text), null, text);
    }
  });
});

describe('typedDate', () => {
  test('writes an ISO date the way it is typed', () => {
    assert.equal(typedDate('2026-10-16'), '16/10/2026');
    assert.equal(typedDate(''), '');
  });
});
