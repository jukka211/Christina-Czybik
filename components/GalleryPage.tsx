import { Fragment } from 'react'

import { ContactLines } from '@/components/ContactLines'
import { Gallery } from '@/components/Gallery'
import { Logo } from '@/components/Logo'
import { RichText, TextLines } from '@/components/RichText'
import type { SiteData } from '@/sanity/fetch'

// A gallery page's markup: the homepage's (app/(site)/page.tsx) and a
// project page's (app/(site)/[slug]/page.tsx), the same but for what's in
// the gallery, which the gallery's own script fills in (lib/gallery/,
// started by Gallery). projectSlug: the project whose page this is, none on
// the homepage. mobileFlat: a start page whose rows on a phone all stay
// full width (see startGallery in lib/gallery/sketch.js). homeHref: where
// the logo goes, the homepage unless it says otherwise. children: what only
// the page has (the homepage's footer).
//
// The links to other pages are plain <a>s, not next/link: the gallery is
// built for a fresh page load each time (the intro, and coming back to it
// with the browser's back button, see sketch.js). A project page changes to
// another project by itself (see "Project pages" in sketch.js).
export function GalleryPage({
  data,
  projectSlug,
  mobileFlat,
  homeHref = '/',
  children,
}: {
  data: SiteData
  projectSlug?: string
  mobileFlat?: boolean
  homeHref?: string
  children?: React.ReactNode
}) {
  const { info } = data
  const clients = (info.clients ?? []).filter(Boolean)

  return (
    <>
      <nav className="top-nav top-nav--solo" id="topNav">
        <div className="nav-block nav-center">
          {/* Back to the start: a fresh load of the homepage, intro and all,
              without any panel the address had open. (With LOGO_SLIDES on in
              lib/gallery/sketch.js, a tap on the homepage on a phone slides
              the logo away instead, see startGallery.) */}
          <a href={homeHref} className="nav-logo-link">
            <Logo />
          </a>
        </div>
      </nav>

      {/* Info / Index — two independent switches (see panels.js). Kept
          outside .top-nav so they stay put while the logo runs its
          intro/scroll motion and slides away; the Info panel opens in the
          top half of the screen, the Index panel in the bottom half, and
          either or both can be open. */}
      <div className="panel-nav" id="panelNav">
        <button type="button" className="panel-toggle" data-panel="info" aria-controls="infoPanel" aria-expanded="false">
          <span>Info</span>
          <span className="panel-toggle-sign">+</span>
        </button>
        {/* The middle slot, under the logo: "Back" while a panel is open
            (closes both, see panels.js). */}
        <div className="panel-nav-center">
          <button type="button" className="panel-toggle panel-back" id="panelBack">
            Back
          </button>
        </div>
        <div className="panel-nav-right">
          <button type="button" className="panel-toggle" data-panel="index" aria-controls="indexPanel" aria-expanded="false">
            <span>Index</span>
            <span className="panel-toggle-sign">+</span>
          </button>
        </div>
      </div>

      <section className="panel panel-index" id="indexPanel" data-panel="index" aria-label="Index">
        <div className="index-table">
          <div className="index-row index-head">
            <span className="col-project">Projekt</span>
            <span className="col-category">Kategorie</span>
            <span className="col-client">Auftraggeber</span>
            <span className="col-place">Ort</span>
            <span className="col-year">Jahr</span>
          </div>
          {/* One row per project, each a link to its page. panels.js adds
              the previews and, on a project page, changes projects in
              place. Auftraggeber, Ort and Jahr may be left empty in the
              Studio. */}
          <div className="index-body" id="indexBody">
            {data.projects.map((project) => (
              <a key={project.slug} className="index-row" href={`/${project.slug}`} data-slug={project.slug}>
                <span className="col-project">{project.title}</span>
                <span className="col-category">{project.category}</span>
                <span className="col-client">{project.client}</span>
                <span className="col-place">{project.place}</span>
                <span className="col-year">{project.year}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* The texts come from the Studio's "Info & Kontakt" (see
          sanity/texts.ts); the labels and the portrait stay as they are. */}
      <section className="panel panel-info" id="infoPanel" data-panel="info" aria-label="Info">
        <div className="info-grid">
          <div className="info-col info-col-about">
            <h2 className="panel-label">Info</h2>
            <p className="info-upper">
              <TextLines text={info.info} />
            </p>
            <img className="info-portrait" src="/christina-portrait.png" alt="Christina Czybik" />
          </div>
          <div className="info-col info-col-contact">
            <h2 className="panel-label">Kontakt</h2>
            <p className="info-upper">
              <ContactLines info={info} />
            </p>
            <p className="info-legal">
              <a href="/impressum">
                Impressum &amp; <br /> Datenschutz
              </a>
            </p>
          </div>
          <div className="info-col info-col-clients">
            <h2 className="panel-label">Ausgewählte Kunden:</h2>
            {/* A line each, with a comma after all but the last. */}
            <p className="info-upper info-clients">
              {clients.map((client, index) => (
                <Fragment key={index}>
                  {client}
                  {index < clients.length - 1 && (
                    <>
                      ,<br />
                    </>
                  )}
                </Fragment>
              ))}
            </p>
          </div>
          <div className="info-col info-col-bio">
            <h2 className="panel-label">Bio</h2>
            <div className="info-bio">
              <RichText value={info.bio} />
            </div>
          </div>
        </div>
      </section>

      {/* A project page's stack is the screen's height: it doesn't scroll
          (see .stack-wrapper.is-project-page in style.css). */}
      <div className={projectSlug ? 'stack-wrapper is-project-page' : 'stack-wrapper'} id="stackWrapper">
        <div className="sticky-viewport" id="stickyViewport">
          {/* rows injected by sketch.js */}
        </div>
      </div>

      {/* Fullscreen mode's own title bar — the name (left) + counter
          (right), vertically centered on the screen. One shared element, not
          one per row, since only one row is ever fullscreen at a time;
          sketch.js fills in whichever row (or project) is fullscreen and
          fades this in/out via .is-visible. */}
      <div className="fullscreen-title" id="fullscreenTitle">
        <span id="fullscreenTitleName" />
        <span id="fullscreenTitleCount" />
      </div>

      {/* Fullscreen's way back to the gallery (the nav is hidden while a row
          is fullscreen). Same tab as the panels' "Back", in the same place. */}
      <button type="button" className="panel-toggle fullscreen-back" id="fullscreenBack">
        Back
      </button>

      {children}

      {/* Just what the gallery needs: the texts are all in the markup. */}
      <Gallery
        data={{ categories: data.categories, projects: data.projects }}
        projectSlug={projectSlug}
        mobileFlat={mobileFlat}
      />
    </>
  )
}
