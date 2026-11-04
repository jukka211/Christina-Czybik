import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

// /robots.txt: search engines may take everything but the Studio and the
// start page's trial, and find the pages in the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/studio', '/test-startpage'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
