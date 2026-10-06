import '@/styles/panels.css'
import '@/styles/legal.css'

import type { Metadata } from 'next'

import { LegalBack } from '@/components/LegalBack'
import { RichText } from '@/components/RichText'
import { type Photo, sanityImageUrl } from '@/lib/sanity-image'
import { getLegal, getSiteData } from '@/sanity/fetch'

export const metadata: Metadata = {
  title: 'Impressum & Datenschutz — Christina Czybik',
}

export const revalidate = 60

// Figma 51:12. The gallery behind the text, faded to 4% like behind the
// Info / Index panels, as a still picture: small copies of the categories'
// photos in the gallery's three-row layout, the middle row's middle one
// large. The photos are taken from each category in turn, so every row
// mixes them. The texts come from the Studio's "Impressum & Datenschutz"
// (see sanity/texts.ts); the two labels stay as they are.
export default async function LegalPage() {
  const [{ categories }, legal] = await Promise.all([getSiteData(), getLegal()])
  const photos: Photo[] = []
  for (let i = 0; photos.length < 13 && categories.some((category) => i < category.photos.length); i += 1) {
    categories.forEach((category) => {
      if (i < category.photos.length) photos.push(category.photos[i])
    })
  }
  const backdropRows = [photos.slice(0, 5), photos.slice(5, 8), photos.slice(8, 13)]

  return (
    <div className="legal-page">
      <div className="legal-backdrop" aria-hidden="true">
        {backdropRows.map((row, rowIndex) => (
          <div className="legal-backdrop-row" key={rowIndex}>
            {row.map((photo, photoIndex) => {
              const isLarge = rowIndex === 1 && photoIndex === 1
              return (
                <img
                  key={photoIndex}
                  className={isLarge ? 'is-large' : undefined}
                  src={sanityImageUrl(photo.url, { h: isLarge ? 1400 : 240, q: 60 })}
                  alt=""
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Same buttons as the home page, leading back to it (with the panel
          open, for Info and Index). Plain <a>s: the gallery wants a fresh
          page load (see app/(site)/page.tsx). */}
      <nav className="panel-nav" aria-label="Navigation">
        <a className="panel-toggle" data-panel="info" href="/#info">
          <span>Info</span>
          <span>+</span>
        </a>
        <div className="panel-nav-center">
          <LegalBack />
        </div>
        <div className="panel-nav-right">
          <a className="panel-toggle" data-panel="index" href="/#index">
            <span>Index</span>
            <span>+</span>
          </a>
        </div>
      </nav>

      <main className="legal-main">
        <section className="legal-imprint" aria-labelledby="imprintTitle">
          <h2 className="legal-label" id="imprintTitle">Impressum</h2>
          <div className="legal-text">
            <RichText value={legal.impressum} />
          </div>
        </section>

        <section className="legal-privacy" aria-labelledby="privacyTitle">
          <h2 className="legal-label" id="privacyTitle">Datenschutz-Informationen:</h2>
          <div className="legal-sections">
            {(legal.datenschutz ?? []).map((section) => (
              <section className="legal-section" key={section._key}>
                <h3 className="legal-section-title">{section.title}</h3>
                <div className="legal-section-body">
                  <RichText value={section.body} />
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
