/**
 * The class registry. Adding a teacher is a new file in this directory plus
 * one line here.
 */
import { NWETSS_HANLON } from './nwetss-hanlon.ts';
import { DEMO_2027 } from './demo-2027.ts';
import type { ClassConfig } from '../schedule.types.ts';

export const CLASSES: Record<string, ClassConfig> = {
  [NWETSS_HANLON.slug]: NWETSS_HANLON,
  [DEMO_2027.slug]: DEMO_2027,
};

export const CLASS_SLUGS = Object.keys(CLASSES);

export function getClass(slug: string): ClassConfig | undefined {
  return CLASSES[slug];
}
