/**
 * Where this site lives, once it lives anywhere — and which class it lives
 * at by default.
 *
 * Several things need the deployed URL and cannot derive it from anything
 * else in the repo: the noticeboard QR block (`components/bipi/qr-block.tsx`),
 * the link-preview card's `metadataBase` (`app/layout.tsx`), and the crawler
 * config (`app/robots.ts`, `app/sitemap.ts`) — all of it URL-dependent, all
 * of it reading `hasSiteUrl`/`SITE_URL` from here rather than the env var
 * directly, so there is one place to set it and one gate to stay behind.
 *
 * It is read from `NEXT_PUBLIC_SITE_URL` at build time and is deliberately
 * **empty by default**: a QR code that resolves to a placeholder domain is
 * worse than no QR code — it is a QR code that sends a class to the wrong
 * page. Everything that depends on it renders nothing until it is set (see
 * `hasSiteUrl`), so the site is correct at every stage of deployment.
 *
 * To set it: add `NEXT_PUBLIC_SITE_URL=https://…` to the Vercel project's
 * environment variables (or to `.env.local` for a local check), with no
 * trailing slash, then redeploy. Nothing else needs to change.
 *
 * `NEXT_PUBLIC_DEFAULT_CLASS` (below) is separate: it is read at build time
 * too, but it picks which class `/` redirects to, and has a sane fallback
 * (the first registered class) so the site works with it unset.
 */
import { CLASS_SLUGS } from './classes/index.ts';

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';

/** The site's canonical origin, or `''` when it has not been configured. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '');

/** Whether `SITE_URL` is a usable absolute URL. Guard URL-dependent UI on this. */
export const hasSiteUrl = /^https?:\/\/\S+$/.test(SITE_URL);

/**
 * `SITE_URL` as it should be *printed* — no scheme, no trailing slash.
 * "bipi.example.ie/schedule" reads better under a QR code than the full
 * URL, and is what someone would type if the scan failed.
 */
export const SITE_URL_LABEL = SITE_URL.replace(/^https?:\/\//, '');

/** Which class `/` redirects to. Falls back to the first registered class when unset. */
export const DEFAULT_CLASS = process.env.NEXT_PUBLIC_DEFAULT_CLASS?.trim() || CLASS_SLUGS[0];
