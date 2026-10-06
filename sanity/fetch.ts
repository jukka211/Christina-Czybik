import { defineQuery } from 'next-sanity'
import { cache } from 'react'

import type { Photo } from '@/lib/sanity-image'

import { CATEGORIES, getCategoryTitle, getKategorieDocumentId } from './categories'
import { client } from './client'
import { RESERVED_SLUGS, slugify } from './slug'
import { DEFAULT_LEGAL, DEFAULT_SITE_INFO, LEGAL_ID, type Legal, SITE_INFO_ID, type SiteInfo } from './texts'

// Everything the gallery pages show from Sanity, in one request: the
// categories, the projects, and the Info panel's texts. A photo is its CDN
// URL and its shape (width / height), which the gallery lays out with
// before the photo itself has loaded.
const SITE_QUERY = defineQuery(`{
  "categories": *[_type == "kategorie"]{
    _id,
    "photos": fotos[defined(asset)]{ "url": asset->url, "aspect": asset->metadata.dimensions.aspectRatio }
  },
  "projects": *[_type == "project"] | order(orderRank) {
    title,
    "slug": slug.current,
    kategorie,
    auftraggeber,
    ort,
    jahr,
    "photos": fotos[defined(asset)]{ "url": asset->url, "aspect": asset->metadata.dimensions.aspectRatio }
  },
  "info": *[_id == $siteInfoId][0]{ info, phone, email, instagram, clients, bio, footerInfo }
}`)

const LEGAL_QUERY = defineQuery(`*[_id == $legalId][0]{
  impressum,
  datenschutz[]{ _key, title, body }
}`)

type SiteQueryResult = {
  categories: { _id: string; photos: Photo[] | null }[]
  projects: {
    title: string | null
    slug: string | null
    kategorie: string | null
    auftraggeber: string | null
    ort: string | null
    jahr: string | null
    photos: Photo[] | null
  }[]
  info: SiteInfo | null
}

export type SiteCategory = {
  title: string
  photos: Photo[]
}

export type SiteProject = {
  title: string
  // Its page's address: /<slug>.
  slug: string
  category: string
  client: string | null
  place: string | null
  year: string | null
  photos: Photo[]
}

export type SiteData = {
  categories: SiteCategory[]
  projects: SiteProject[]
  info: SiteInfo
}

// The categories come in the fixed order of CATEGORIES, the projects in the
// order they're sorted into in the Studio. Either one without photos is left
// out: the gallery has nothing to show for it. So is a project whose address
// is taken, by one of the site's pages or by a project before it: it could
// never be opened. One without an address yet gets its name's.
//
// The Info panel's texts are the ones the site had before they were in the
// Studio until "Info & Kontakt" has been published (see texts.ts).
//
// Asked for once per page load, however many parts of the page ask (cache):
// a project page asks for its title too (generateMetadata).
export const getSiteData = cache(async (): Promise<SiteData> => {
  const result = await client.fetch<SiteQueryResult>(SITE_QUERY, { siteInfoId: SITE_INFO_ID })

  const categories = CATEGORIES.map(({ value, title }) => ({
    title,
    photos: result.categories.find((doc) => doc._id === getKategorieDocumentId(value))?.photos ?? [],
  })).filter((category) => category.photos.length > 0)

  const slugsTaken = new Set(RESERVED_SLUGS)
  const projects = result.projects
    .map((project) => ({
      title: project.title ?? '',
      slug: project.slug || slugify(project.title ?? ''),
      category: getCategoryTitle(project.kategorie ?? undefined),
      client: project.auftraggeber,
      place: project.ort,
      year: project.jahr,
      photos: project.photos ?? [],
    }))
    .filter((project) => {
      if (project.photos.length === 0 || !project.slug || slugsTaken.has(project.slug)) return false
      slugsTaken.add(project.slug)
      return true
    })

  return { categories, projects, info: result.info ?? DEFAULT_SITE_INFO }
})

// The Impressum & Datenschutz page's texts: the ones it had before they were
// in the Studio until the document has been published (see texts.ts).
export async function getLegal(): Promise<Legal> {
  return (await client.fetch<Legal | null>(LEGAL_QUERY, { legalId: LEGAL_ID })) ?? DEFAULT_LEGAL
}
