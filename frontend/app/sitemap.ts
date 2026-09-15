import type { MetadataRoute } from 'next';

import { SITE_URL, hasSiteUrl } from '@/lib/site';
import { CLASSES } from '@/lib/classes';

/** One entry per `listed` class (D2) — the demo class stays out of it. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!hasSiteUrl) return [];
  return Object.values(CLASSES)
    .filter((cls) => cls.listed)
    .map((cls) => ({ url: `${SITE_URL}/${cls.slug}`, changeFrequency: 'daily', priority: 1 }));
}
