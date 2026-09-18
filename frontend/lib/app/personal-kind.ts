import type { PersonalKind } from "@/lib/api/schemas";

/**
 * One label per personal item kind (plan 2F P2-49/P2-50), shared by the item form's <select> and the
 * timeline's kind word. Deliberately not "use client": timeline-view.tsx is a Server Component, and a
 * Server Component that imports a value export from a "use client" file gets React's client-reference
 * stub in its place rather than the real object, so `KIND_LABEL[kind]` would silently evaluate to
 * undefined at render time. Keep this map out of any "use client" module.
 */
export const KIND_LABEL: Record<PersonalKind, string> = { TEST: "Test", ESSAY: "Essay", DEADLINE: "Deadline", OTHER: "Other" };

export const KINDS: ReadonlyArray<{ value: PersonalKind; label: string }> = Object.entries(KIND_LABEL).map(([value, label]) => ({
  value: value as PersonalKind,
  label,
}));
