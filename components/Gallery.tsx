'use client'

import { useEffect } from 'react'

import type { SiteData } from '@/sanity/fetch'

// Starts the homepage's gallery (lib/gallery/) on the markup the page has
// rendered. The gallery is plain DOM code that works on the whole page, as
// it did on the static site, so it's only loaded in the browser, and starts
// once per page load (see startSite).
export function Gallery({ data }: { data: SiteData }) {
  useEffect(() => {
    import('@/lib/gallery').then(({ startSite }) => startSite(data))
  }, [data])

  return null
}
