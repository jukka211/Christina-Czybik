'use client'

import { useEffect } from 'react'
import { preconnect } from 'react-dom'

import type { SiteData } from '@/sanity/fetch'

// Starts a gallery page's gallery (lib/gallery/) on the markup the page has
// rendered (see GalleryPage): the homepage's, or with projectSlug, that
// project's page. The gallery is plain DOM code that works on the whole
// page, as it did on the static site, so it's only loaded in the browser,
// and starts once per page load (see startSite).
export function Gallery({
  data,
  projectSlug,
}: {
  data: Pick<SiteData, 'categories' | 'projects'>
  projectSlug?: string
}) {
  // Every photo on the page comes from Sanity's image CDN, so the browser
  // can open its connection there while it's still loading the gallery.
  preconnect('https://cdn.sanity.io')

  useEffect(() => {
    import('@/lib/gallery').then(({ startSite }) => startSite(data, projectSlug))
  }, [data, projectSlug])

  return null
}
