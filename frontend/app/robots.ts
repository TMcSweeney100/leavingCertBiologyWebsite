import type { MetadataRoute } from 'next';

import { SITE_URL, hasSiteUrl } from '@/lib/site';

/**
 * Teachers searching for "Biology in Practice Investigation schedule" is a
 * real acquisition channel, and the site is currently invisible to it.
 *
 * The sitemap line is omitted until `NEXT_PUBLIC_SITE_URL` is set, for the
 * same reason `qr-block.tsx` renders nothing without it: pointing crawlers
 * at a placeholder origin is worse than pointing them nowhere.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(hasSiteUrl ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
