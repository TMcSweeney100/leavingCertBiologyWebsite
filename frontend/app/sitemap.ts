import type { MetadataRoute } from 'next';

import { SITE_URL, hasSiteUrl } from '@/lib/site';

/** One page today. Phase B turns this into one entry per class. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!hasSiteUrl) return [];
  return [{ url: SITE_URL, changeFrequency: 'daily', priority: 1 }];
}
