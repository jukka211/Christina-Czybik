import '@/styles/style.css'
import '@/styles/panels.css'
import '@/styles/intro.css'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { GalleryPage } from '@/components/GalleryPage'
import { getSiteData } from '@/sanity/fetch'

// What's published in the Studio shows here within a minute.
export const revalidate = 60

type ProjectPageProps = { params: Promise<{ slug: string }> }

// Every project's page is made ahead. One published since is made the first
// time it's visited.
export async function generateStaticParams() {
  const { projects } = await getSiteData()
  return projects.map(({ slug }) => ({ slug }))
}

// The project's name in the browser's tab, and its first photo, name and
// details in the preview of a shared link (Open Graph). The photo is a JPEG:
// not every app that shows previews takes the formats auto=format picks.
export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params
  const project = (await getSiteData()).projects.find((candidate) => candidate.slug === slug)
  if (!project) return {}
  const title = `${project.title} — Christina Czybik`
  const description = [project.category, project.client, project.place, project.year].filter(Boolean).join(' · ')
  const image = `${project.photos[0].url}?${new URLSearchParams({ w: '1200', h: '630', fit: 'crop', fm: 'jpg', q: '80' })}`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images: [{ url: image, width: 1200, height: 630 }] },
  }
}

// A project's page: its photos in the middle row, and the projects before
// and after it in the Index above and below (see "Project pages" in
// lib/gallery/sketch.js). No intro, and no footer: the page doesn't scroll.
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const data = await getSiteData()
  if (!data.projects.some((project) => project.slug === slug)) notFound()

  return <GalleryPage data={data} projectSlug={slug} />
}
