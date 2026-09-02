/**
 * Katelyn Hanlon's class at North Wicklow Educate Together Secondary
 * School — identity and dates only. Everything else about the coursework
 * comes from `BIOLOGY_2027` (spec §4.1).
 */
import { BIOLOGY_2027 } from '../briefs/biology-2027.ts';
import type { ClassConfig } from '../schedule.types.ts';

export const NWETSS_HANLON: ClassConfig<typeof BIOLOGY_2027> = {
  slug: 'nwetss-hanlon',
  brief: BIOLOGY_2027,
  school: {
    name: 'North Wicklow Educate Together Secondary School',
    crest: '/crests/nwetss.png',
  },
  teacher: {
    label: 'Class teacher',
    name: 'Katelyn Hanlon',
  },
  term: { start: '2026-09-01', end: '2026-12-12', weeks: 15 },
  dueDates: {
    'stage-3': '2026-09-25',
    'stage-4': '2026-10-16',
    catchup: '2026-10-30',
    'stage-5': '2026-11-13',
    'stage-6': '2026-12-11',
  },
  draftDate: '2026-12-04',
  revision: 1,
  listed: true,
};
