// The Sanity Studio at /studio, where the projects and the categories'
// best-of photos are edited. Configured in sanity.config.ts.
import { NextStudio } from 'next-sanity/studio'

import config from '@/sanity.config'

export const dynamic = 'force-static'

export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  return <NextStudio config={config} />
}
