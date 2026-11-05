import type { Metadata } from 'next'

// The site's address, for what has to name a page in full: the address
// Google is to list it under (canonical), the preview of a shared link, the
// sitemap and robots.txt. Relative addresses in a page's metadata are made
// full with it (metadataBase, app/layout.tsx).
export const SITE_URL = 'https://www.christinaczybik.com'
export const SITE_NAME = 'Christina Czybik'

// The homepage's title in Google's results and the browser's tab, and its
// heading (for search engines and screen readers, not shown).
export const HOME_TITLE = 'Christina Czybik — Fotografin für Politik, Event und Reportage'

// What a page's preview takes besides its own title, description, address
// and photo. A page's openGraph replaces the layout's whole, so each page
// gives all of it.
export const OPEN_GRAPH: Metadata['openGraph'] = {
  siteName: SITE_NAME,
  locale: 'de_DE',
  type: 'website',
}

// A photo as the preview of a shared link: 1200 × 630, cropped from its
// middle, and a JPEG: not every app that shows previews takes the formats
// auto=format picks (so not sanityImageUrl, which asks for it).
export function getShareImage(url: string) {
  const query = new URLSearchParams({ w: '1200', h: '630', fit: 'crop', fm: 'jpg', q: '80' })
  return { url: `${url}?${query}`, width: 1200, height: 630 }
}
