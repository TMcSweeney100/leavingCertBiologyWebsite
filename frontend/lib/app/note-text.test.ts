import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { noteParts, recentlyUpdated } from './note-text.ts';

describe('note text', () => {
  test('http(s) addresses become links; trailing punctuation stays text', () => {
    assert.deepEqual(noteParts('Sign up (https://example.ie/slots). Thanks'), [
      { kind: 'text', text: 'Sign up (' },
      { kind: 'link', href: 'https://example.ie/slots' },
      { kind: 'text', text: '). Thanks' },
    ]);
  });

  test('a closing bracket that closes one inside the address stays in the link', () => {
    assert.deepEqual(noteParts('Read https://en.wikipedia.org/wiki/Osmosis_(biology) first'), [
      { kind: 'text', text: 'Read ' },
      { kind: 'link', href: 'https://en.wikipedia.org/wiki/Osmosis_(biology)' },
      { kind: 'text', text: ' first' },
    ]);
    assert.deepEqual(noteParts('(see https://en.wikipedia.org/wiki/Osmosis_(biology)).'), [
      { kind: 'text', text: '(see ' },
      { kind: 'link', href: 'https://en.wikipedia.org/wiki/Osmosis_(biology)' },
      { kind: 'text', text: ').' },
    ]);
  });

  test('a closing bracket with no opening one in the address belongs to the sentence', () => {
    assert.deepEqual(noteParts('(see https://example.ie/a)'), [
      { kind: 'text', text: '(see ' },
      { kind: 'link', href: 'https://example.ie/a' },
      { kind: 'text', text: ')' },
    ]);
  });

  test('nothing else becomes a link', () => {
    assert.deepEqual(noteParts('javascript:alert(1) or www.example.ie'), [{ kind: 'text', text: 'javascript:alert(1) or www.example.ie' }]);
  });

  test('"Note updated" lasts 7 days from the day of the change', () => {
    assert.equal(recentlyUpdated('2026-10-28', '2026-10-28'), true);
    assert.equal(recentlyUpdated('2026-10-28', '2026-11-03'), true);
    assert.equal(recentlyUpdated('2026-10-28', '2026-11-04'), false);
  });
});
