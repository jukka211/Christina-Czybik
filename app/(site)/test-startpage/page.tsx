import '@/styles/style.css'
import '@/styles/panels.css'
import '@/styles/intro.css'

import type { Metadata } from 'next'

import { StartPage } from '@/components/StartPage'
import { getSiteData } from '@/sanity/fetch'

// What's published in the Studio shows here within a minute.
export const revalidate = 60

// A trial, not for search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } }

// The start page as a phone could have it: every row at full width, the page
// scrolling past them as plain as any page (mobileFlat, see
// lib/gallery/sketch.js). The same as the homepage on a desktop.
export default async function TestStartPage() {
  return <StartPage data={await getSiteData()} mobileFlat />
}
