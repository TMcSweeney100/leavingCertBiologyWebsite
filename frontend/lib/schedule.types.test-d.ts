/**
 * Type-only proof for D8: a `ClassConfig` built against `BIOLOGY_2027` that
 * forgets one of the brief's stage dates, or names a stage id the brief
 * doesn't declare, fails to compile.
 *
 * Checked by `tsc --noEmit`. `npm test`'s `lib/**\/*.test.ts` glob does not
 * match this file's `.test-d.ts` suffix, so it costs no runtime test — the
 * compiler is the assertion, via `@ts-expect-error`.
 */
import { BIOLOGY_2027 } from './briefs/biology-2027.ts';
import type { ClassConfig } from './schedule.types.ts';

// Missing 'stage-6'.
const missingStageDate: ClassConfig<typeof BIOLOGY_2027> = {
  slug: 'missing-date',
  brief: BIOLOGY_2027,
  school: { name: 'Test School' },
  teacher: { label: 'Class teacher', name: 'Test Teacher' },
  term: { start: '2026-09-01', end: '2026-12-12', weeks: 15 },
  // @ts-expect-error — dueDates must cover every id in the brief's datedStageIds (D8).
  dueDates: {
    'stage-3': '2026-09-25',
    'stage-4': '2026-10-16',
    catchup: '2026-10-30',
    'stage-5': '2026-11-13',
  },
  draftDate: '2026-12-04',
  revision: 1,
  listed: true,
};

const unknownStageId: ClassConfig<typeof BIOLOGY_2027> = {
  slug: 'unknown-id',
  brief: BIOLOGY_2027,
  school: { name: 'Test School' },
  teacher: { label: 'Class teacher', name: 'Test Teacher' },
  term: { start: '2026-09-01', end: '2026-12-12', weeks: 15 },
  dueDates: {
    'stage-3': '2026-09-25',
    'stage-4': '2026-10-16',
    catchup: '2026-10-30',
    'stage-5': '2026-11-13',
    'stage-6': '2026-12-11',
    // @ts-expect-error — 'stage-7' is not one of the brief's datedStageIds (D8).
    'stage-7': '2026-12-20',
  },
  draftDate: '2026-12-04',
  revision: 1,
  listed: true,
};

// Referenced so neither const is flagged unused — their value is
// irrelevant, only whether they compile.
void missingStageDate;
void unknownStageId;
