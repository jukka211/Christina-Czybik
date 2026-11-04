import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'
import { getSiteData } from '@/sanity/fetch'

// Projects published in the Studio are in it within an hour.
export const revalidate = 3600

// /sitemap.xml: the pages for search engines to list, the projects' among
// them.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects } = await getSiteData()
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    ...projects.map(({ slug }) => ({ url: `${SITE_URL}/${slug}`, priority: 0.8 })),
    { url: `${SITE_URL}/impressum`, priority: 0.1 },
  ]
}
