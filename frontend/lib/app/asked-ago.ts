const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit', day: '2-digit' });
const DATE = new Intl.DateTimeFormat('en-IE', { timeZone: 'Europe/Dublin', day: 'numeric', month: 'short', year: 'numeric' });

/** Days since the Unix epoch of the Dublin calendar date `instant` falls on. */
function dublinDay(instant: Date): number {
  return Date.parse(`${DAY.format(instant)}T00:00:00Z`) / 86_400_000;
}

/** When a student asked to join, as pack D-2's pending rows say it: "asked 2 days ago". */
export function askedAgo(requestedAt: string, now: Date): string {
  const asked = new Date(requestedAt);
  const days = dublinDay(now) - dublinDay(asked);
  if (days <= 0) return 'asked today';
  if (days === 1) return 'asked yesterday';
  if (days < 7) return `asked ${days} days ago`;
  return `asked on ${DATE.format(asked)}`;
}
