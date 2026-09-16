/**
 * Top-level route names the pilot app claims. The public schedule lives at `/[class]`, so a class
 * slug equal to one of these would be shadowed by an app page (design §5.3). `routes.test.ts`
 * fails if one ever is.
 */
export const APP_ROUTE_NAMES = [
  'api',
  'login',
  'join',
  'reset',
  'account',
  'home',
  'components',
  'teach',
  'school',
] as const;

/**
 * Whether the pilot app's pages and proxy are switched on (roadmap R1). Exactly "true" and nothing
 * looser, so a typo in a Vercel environment variable leaves the app off rather than on.
 */
export function isAppEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.APP_ENABLED === 'true';
}
