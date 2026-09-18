const CALENDAR_DATE = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * "2026-10-16" → "16 Oct 2026". A calendar date has no time or zone, so it's read and formatted in UTC; any
 * other zone could move it a day (the same hazard lib/schedule.ts documents).
 */
export function formatCalendarDate(iso: string): string {
  return CALENDAR_DATE.format(Date.parse(`${iso}T00:00:00Z`));
}

type Hours = { label: string | null; hoursMin: number | null; hoursMax: number | null; hoursGroup: string | null };

/** Display only (design §6.2). A shared estimate (Business Stages 4 and 5) names the stages sharing it. */
export function hoursLabel(stage: Hours, all: ReadonlyArray<Hours>): string {
  if (stage.hoursMax === null) return '';
  const range = stage.hoursMin === null ? `Up to ${stage.hoursMax} hours` : `${stage.hoursMin}–${stage.hoursMax} hours`;
  if (!stage.hoursGroup) return range;
  const sharing = all.filter((s) => s.hoursGroup === stage.hoursGroup).map((s) => s.label ?? '');
  return `${range} for ${sharing.join(' and ')} together`;
}

/** Whether the draft (stage id → "YYYY-MM-DD" or "") differs from the saved dates. */
export function datesChanged(saved: ReadonlyArray<{ id: string; dueDate: string | null }>, draft: Record<string, string>): boolean {
  return saved.some((s) => (s.dueDate ?? '') !== (draft[s.id] ?? ''));
}
