import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { KIND_LABEL, KINDS } from './personal-kind.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(path.join(here, rel), 'utf8');

describe('KIND_LABEL', () => {
  test('has one label per personal item kind', () => {
    assert.deepEqual(KIND_LABEL, { TEST: 'Test', ESSAY: 'Essay', DEADLINE: 'Deadline', OTHER: 'Other' });
  });

  test('KINDS lists the same kinds in the same order as their labels', () => {
    assert.deepEqual(KINDS.map((k) => [k.value, k.label]), Object.entries(KIND_LABEL));
  });
});

describe('the client/server module boundary (plan 2F P2-49)', () => {
  // personal-item-form.tsx is "use client" (it uses useState). A Server Component that imports a
  // *value* export (not just a type) from a "use client" file gets React's client-reference stub in
  // its place, not the real object — so `KIND_LABEL[item.personalKind]` silently evaluates to
  // undefined at render time. Vitest doesn't apply that boundary, so a component spec alone can't
  // catch this; only real Next SSR (i.e. the e2e journey) shows it. Guard it here structurally instead:
  // the label map must live outside any "use client" file, and the server component must import it
  // from there.
  test('personal-kind.ts (the module timeline-view.tsx needs KIND_LABEL from) is not a client module', () => {
    const source = read('personal-kind.ts');
    assert.ok(!/^\s*["']use client["'];?/m.test(source), 'personal-kind.ts must not start with "use client"');
  });

  test('timeline-view.tsx (a server component) imports KIND_LABEL from the non-client module', () => {
    const source = read('../../components/app/timeline-view.tsx');
    assert.match(source, /import\s*\{[^}]*\bKIND_LABEL\b[^}]*\}\s*from\s*["']@\/lib\/app\/personal-kind["']/);
    assert.doesNotMatch(source, /import\s*\{[^}]*\bKIND_LABEL\b[^}]*\}\s*from\s*["']\.\/personal-item-form["']/);
  });
});
