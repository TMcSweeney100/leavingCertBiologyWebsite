import type { Me, Role } from '../api/schemas.ts';

/** Landing page per role, highest first (roadmap §6.1). */
const LANDINGS: ReadonlyArray<{ role: Role; href: string; label: string }> = [
  { role: 'TEACHER', href: '/teach', label: 'Classes' },
  { role: 'SCHOOL_LEADER', href: '/school', label: 'School overview' },
  { role: 'STUDENT', href: '/home', label: 'Timeline' },
];

/**
 * A `?next=` value is honoured only if it's a path on this origin: starts with one slash, and isn't
 * the login page itself (which would loop).
 */
export function safeNext(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined;
  if (value === '/login' || value.startsWith('/login?')) return undefined;
  return value;
}

export function landingFor(me: Me, next?: string | null): string {
  if (me.mustChangePassword) return '/account/password';
  const safe = safeNext(next);
  if (safe) return safe;
  const held = new Set(me.roles.map((r) => r.role));
  return LANDINGS.find((l) => held.has(l.role))?.href ?? '/home';
}

/** The school a teacher creates classes at. In the pilot a teacher has exactly one (plan 1C P-2). */
export function teacherSchoolId(me: Me): string | undefined {
  return me.roles.find((r) => r.role === 'TEACHER')?.schoolId;
}

/** Header links: one per role held, roadmap order. Shown as a switcher only when there's more than one. */
export function APP_NAV(me: Me): ReadonlyArray<{ href: string; label: string }> {
  const held = new Set(me.roles.map((r) => r.role));
  return LANDINGS.filter((l) => held.has(l.role)).map(({ href, label }) => ({ href, label }));
}
