import '@/styles/style.css'
import '@/styles/panels.css'
import '@/styles/intro.css'

import { StartPage } from '@/components/StartPage'
import { getSiteData } from '@/sanity/fetch'

// What's published in the Studio shows here within a minute.
export const revalidate = 60

export default async function HomePage() {
  return <StartPage data={await getSiteData()} />
}
