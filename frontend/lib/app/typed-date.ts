/**
 * The date drawer's "Type a date" field (plan date-picker-drawer C-37). Dates are typed day first, the way
 * Irish dates are written, and a phone's number pad has no slash, so the field adds the slashes itself.
 */

/** "2026-10-16" → "16/10/2026" (what the box and the field show). "" stays "". */
export function typedDate(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * What the field should hold after the teacher types or pastes `raw`: digits with the slashes put back, so the
 * value is always the start of "dd/mm/yyyy". A pasted ISO date is turned day first. When separators are typed
 * ("5/10/2026") a finished day or month gets its leading zero. A trailing slash is dropped, so deleting back over
 * one works.
 */
export function typedFromInput(raw: string): string {
  const iso = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  // Typed separators end a part; digits typed past a full day or month roll on into the next part.
  const parts = (/[/.\-\s]/.test(raw) ? raw.split(/[/.\-\s]+/) : [raw]).map((part) => part.replace(/\D/g, ''));
  let [day = '', month = '', year = ''] = parts;
  if (day.length > 2) [day, month] = [day.slice(0, 2), day.slice(2) + month];
  if (month.length > 2) [month, year] = [month.slice(0, 2), month.slice(2) + year];
  if (parts.length > 1 && day.length === 1) day = `0${day}`;
  if (parts.length > 2 && month.length === 1) month = `0${month}`;
  year = year.slice(0, 4);
  return [day, month, year].filter(Boolean).join('/');
}

/** "16/10/2026" → "2026-10-16" for a complete, real date from 2000 on; anything else is null. */
export function parseTypedDate(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 2000 || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}
