/** Fictional — exists to prove the brief/class split (D2). Not a real school. */
import { BIOLOGY_2027 } from '../briefs/biology-2027.ts';
import type { ClassConfig } from '../schedule.types.ts';

export const DEMO_2027: ClassConfig<typeof BIOLOGY_2027> = {
  slug: 'demo-2027',
  brief: BIOLOGY_2027,
  school: {
    name: 'Demo Community College',
    // No crest — exercises the crest-optional branch in site-header.tsx.
  },
  teacher: {
    label: 'Class teacher',
    name: 'Ms. Sample',
  },
  // A few days later than Katelyn's class, so the two pages visibly
  // differ — including in derived week ranges (D6): term.start sits close
  // enough to Katelyn's Sep 1 that the stage dates below (each a clean
  // week later than hers) land in different week-of-term buckets, not just
  // on different calendar dates.
  term: { start: '2026-09-04', end: '2026-12-19', weeks: 15 },
  dueDates: {
    'stage-3': '2026-10-02',
    'stage-4': '2026-10-23',
    catchup: '2026-11-06',
    'stage-5': '2026-11-20',
    'stage-6': '2026-12-18',
  },
  draftDate: '2026-12-11',
  revision: 1,
  listed: false,
};
