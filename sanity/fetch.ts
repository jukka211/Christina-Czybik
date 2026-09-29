import { defineQuery } from 'next-sanity'

import type { Photo } from '@/lib/sanity-image'

import { CATEGORIES, getCategoryTitle, getKategorieDocumentId } from './categories'
import { client } from './client'

// Everything the site shows from Sanity, in one request. A photo is its CDN
// URL and its shape (width / height), which the gallery lays out with
// before the photo itself has loaded.
const SITE_QUERY = defineQuery(`{
  "categories": *[_type == "kategorie"]{
    _id,
    "photos": fotos[defined(asset)]{ "url": asset->url, "aspect": asset->metadata.dimensions.aspectRatio }
  },
  "projects": *[_type == "project"] | order(orderRank) {
    title,
    kategorie,
    auftraggeber,
    ort,
    jahr,
    "photos": fotos[defined(asset)]{ "url": asset->url, "aspect": asset->metadata.dimensions.aspectRatio }
  }
}`)

type SiteQueryResult = {
  categories: { _id: string; photos: Photo[] | null }[]
  projects: {
    title: string | null
    kategorie: string | null
    auftraggeber: string | null
    ort: string | null
    jahr: string | null
    photos: Photo[] | null
  }[]
}

export type SiteCategory = {
  title: string
  photos: Photo[]
}

export type SiteProject = {
  title: string
  category: string
  client: string | null
  place: string | null
  year: string | null
  photos: Photo[]
}

export type SiteData = {
  categories: SiteCategory[]
  projects: SiteProject[]
}

// The categories come in the fixed order of CATEGORIES, the projects in the
// order they're sorted into in the Studio. Either one without photos is left
// out: the gallery has nothing to show for it.
export async function getSiteData(): Promise<SiteData> {
  const result = await client.fetch<SiteQueryResult>(SITE_QUERY)

  const categories = CATEGORIES.map(({ value, title }) => ({
    title,
    photos: result.categories.find((doc) => doc._id === getKategorieDocumentId(value))?.photos ?? [],
  })).filter((category) => category.photos.length > 0)

  const projects = result.projects
    .map((project) => ({
      title: project.title ?? '',
      category: getCategoryTitle(project.kategorie ?? undefined),
      client: project.auftraggeber,
      place: project.ort,
      year: project.jahr,
      photos: project.photos ?? [],
    }))
    .filter((project) => project.photos.length > 0)

  return { categories, projects }
}
