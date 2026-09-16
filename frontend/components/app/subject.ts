/**
 * Subject identity is a 4px bar down a card's left edge, never type or a badge (pack D-2). Keyed by
 * subject code or name, upper-cased. Full class names, so Tailwind sees each one.
 */
const EDGE: Record<string, string> = {
  BIOLOGY: "border-l-app-subject-biology",
  BUSINESS: "border-l-app-subject-business",
  CHEMISTRY: "border-l-app-subject-chemistry",
  PHYSICS: "border-l-app-subject-physics",
};

export function subjectEdge(subject: string): string {
  return EDGE[subject.toUpperCase()] ?? "border-l-app-field-border";
}
