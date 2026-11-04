import '@/styles/style.css'
import '@/styles/panels.css'
import '@/styles/intro.css'

import type { Metadata } from 'next'

import { StartPage } from '@/components/StartPage'
import { getInstagramHandle, getInstagramHref } from '@/lib/contact'
import { getShareImage, HOME_TITLE, OPEN_GRAPH, SITE_NAME, SITE_URL } from '@/lib/site'
import { getSiteData, type SiteData } from '@/sanity/fetch'
import { DEFAULT_SITE_INFO } from '@/sanity/texts'

// What's published in the Studio shows here within a minute.
export const revalidate = 60

// The text under the title in Google's results, and in a shared link's
// preview: the Studio's "Text bei Google", or the one it starts out as
// before it's typed in.
function getDescription({ info }: SiteData) {
  return info.searchDescription?.trim() || DEFAULT_SITE_INFO.searchDescription || undefined
}

// The title and text Google shows, and a shared link's preview (Open Graph):
// those and the Studio's "Vorschaubild", or the first category's first photo
// until there is one.
export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  const description = getDescription(data)
  const photo = data.info.shareImage ?? data.categories[0]?.photos[0]?.url
  return {
    title: HOME_TITLE,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      ...OPEN_GRAPH,
      title: HOME_TITLE,
      description,
      url: '/',
      images: photo ? [getShareImage(photo)] : undefined,
    },
  }
}

export default async function HomePage() {
  const data = await getSiteData()
  const instagram = data.info.instagram && getInstagramHandle(data.info.instagram)

  // Who the site is about, for search engines (schema.org, as JSON-LD): the
  // site's name Google shows above its title, and the photographer, her
  // trade and where she works.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: 'de' },
      {
        '@type': 'Person',
        name: SITE_NAME,
        jobTitle: 'Fotografin',
        description: getDescription(data),
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/christina-portrait.png`,
        email: data.info.email?.trim() || undefined,
        address: { '@type': 'PostalAddress', addressLocality: 'Hamburg', addressCountry: 'DE' },
        knowsAbout: ['Dokumentarische Fotografie', 'Pressefotografie', 'Eventfotografie', 'Reportage', 'Politische Kommunikation'],
        sameAs: instagram ? [getInstagramHref(instagram)] : undefined,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        // < written as \u003c, so no text from the Studio can close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <StartPage data={data} />
    </>
  )
}
