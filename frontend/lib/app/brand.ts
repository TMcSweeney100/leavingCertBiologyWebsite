/**
 * Pilot placeholders (roadmap R28). The product has no name yet (H4) and the pilot has one school,
 * so the header and auth pages carry that school's crest. Swap these when either changes.
 */
export const APP_NAME = "Leaving Cert Practical";
export const CREST_SRC = "/app/crest.png";
/** Shown under the app name on auth pages, where there's no session to read a school from. */
export const PILOT_SCHOOL_SHORT_NAME = "North Wicklow ETSS";


/** The school name the app header shows: the short form when the operator set one (R26). */
export function headerSchoolName(roles: ReadonlyArray<{ schoolName: string; schoolShortName: string | null }>) {
  const first = roles[0];
  return first ? (first.schoolShortName ?? first.schoolName) : undefined;
}
