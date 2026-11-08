import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { noteParts, recentlyUpdated } from './note-text.ts';

describe('note text', () => {
  test('http(s) addresses become links; trailing punctuation stays text', () => {
    assert.deepEqual(noteParts('Sign up (https://example.ie/slots). Thanks'), [
      { kind: 'text', text: 'Sign up (' },
      { kind: 'link', href: 'https://example.ie/slots', text: 'https://example.ie/slots' },
      { kind: 'text', text: '). Thanks' },
    ]);
  });

  test('a www. address becomes a link to https, shown as typed', () => {
    assert.deepEqual(noteParts('Examples at www.example.ie/2025. Page 88'), [
      { kind: 'text', text: 'Examples at ' },
      { kind: 'link', href: 'https://www.example.ie/2025', text: 'www.example.ie/2025' },
      { kind: 'text', text: '. Page 88' },
    ]);
  });

  test('a closing bracket that closes one inside the address stays in the link', () => {
    const wiki = 'https://en.wikipedia.org/wiki/Osmosis_(biology)';
    assert.deepEqual(noteParts(`Read ${wiki} first`), [
      { kind: 'text', text: 'Read ' },
      { kind: 'link', href: wiki, text: wiki },
      { kind: 'text', text: ' first' },
    ]);
    assert.deepEqual(noteParts(`(see ${wiki}).`), [
      { kind: 'text', text: '(see ' },
      { kind: 'link', href: wiki, text: wiki },
      { kind: 'text', text: ').' },
    ]);
  });

  test('a closing bracket with no opening one in the address belongs to the sentence', () => {
    assert.deepEqual(noteParts('(see https://example.ie/a)'), [
      { kind: 'text', text: '(see ' },
      { kind: 'link', href: 'https://example.ie/a', text: 'https://example.ie/a' },
      { kind: 'text', text: ')' },
    ]);
  });

  test('nothing else becomes a link', () => {
    assert.deepEqual(noteParts('javascript:alert(1) or example.ie or awww.example.ie'), [
      { kind: 'text', text: 'javascript:alert(1) or example.ie or awww.example.ie' },
    ]);
  });

  test('"Note updated" lasts 7 days from the day of the change', () => {
    assert.equal(recentlyUpdated('2026-10-28', '2026-10-28'), true);
    assert.equal(recentlyUpdated('2026-10-28', '2026-11-03'), true);
    assert.equal(recentlyUpdated('2026-10-28', '2026-11-04'), false);
  });
});
