import '@/styles/theme.css'
import '@/styles/panels.css'
import '@/styles/legal.css'

import { LegalBack } from '@/components/LegalBack'

// Any address the site doesn't have, an unknown project's included (see
// app/(site)/[slug]/page.tsx). Set like the Impressum, with the same buttons
// back to the homepage.
export default function NotFound() {
  return (
    <div className="legal-page">
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
        <section className="legal-imprint" aria-labelledby="notFoundTitle">
          <h2 className="legal-label" id="notFoundTitle">404</h2>
          <div className="legal-text">
            <p>Diese Seite gibt es nicht (mehr).</p>
            <p>
              <a href="/">Zur Startseite</a>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
