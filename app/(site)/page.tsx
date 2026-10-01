import '@/styles/style.css'
import '@/styles/panels.css'
import '@/styles/intro.css'

import { Gallery } from '@/components/Gallery'
import { Logo } from '@/components/Logo'
import { getSiteData } from '@/sanity/fetch'

// What's published in the Studio shows here within a minute.
export const revalidate = 60

// The links to other pages are plain <a>s, not next/link: the gallery is
// built for a fresh page load each time (the intro, and coming back to it
// with the browser's back button, see sketch.js).
export default async function HomePage() {
  const data = await getSiteData()

  return (
    <>
      <nav className="top-nav top-nav--solo" id="topNav">
        <div className="nav-block nav-center">
          {/* Back to the start: a fresh load of the page, intro and all,
              without any panel the address had open. */}
          <a href="/" className="nav-logo-link">
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
          {/* The Kategorien / Projekte switch: what the gallery's rows are.
              It names the view showing, and a click changes to the other
              one (see setView and markActiveView in sketch.js). It opens on
              Kategorien (see DEFAULT_VIEW in lib/gallery/index.js). */}
          <button
            type="button"
            className="panel-toggle view-switch"
            id="viewSwitch"
            data-view="kategorien"
            aria-label="Ansicht wechseln: Projekte"
          >
            <span className="view-switch-icon" aria-hidden="true" />
            <span className="view-switch-label">Kategorien</span>
          </button>
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
          {/* rows injected by panels.js, one per project from Sanity */}
          <div className="index-body" id="indexBody" />
        </div>
      </section>

      <section className="panel panel-info" id="infoPanel" data-panel="info" aria-label="Info">
        <div className="info-grid">
          <div className="info-col info-col-about">
            <h2 className="panel-label">Info</h2>
            <p className="info-upper">
              Christina Czybik
              <br />
              PHOTOGRAPHER and Photo Editor
            </p>
            <img className="info-portrait" src="/christina-portrait.png" alt="Christina Czybik" />
          </div>
          <div className="info-col info-col-contact">
            <h2 className="panel-label">Kontakt</h2>
            <p className="info-upper">
              Tel.: <a href="tel:+491724040642">0049 (0) 1724040642</a>
              <br />
              E-Mail: <a href="mailto:request@christinaczybik.com">request@christinaczybik.com</a>
              <br />
              Instagram:{' '}
              <a href="https://www.instagram.com/christinaczybik/" target="_blank" rel="noopener">
                @christinaczybik
              </a>
            </p>
            <p className="info-legal">
              <a href="/impressum">
                Impressum &amp; <br /> Datenschutz
              </a>
            </p>
          </div>
          <div className="info-col info-col-clients">
            <h2 className="panel-label">Ausgewählte Kunden:</h2>
            <p className="info-upper info-clients">
              Bundespresseamt,
              <br />
              Deutscher Bundestag,
              <br />
              Bundeskanzleramt,
              <br />
              BMWK/BMWE,
              <br />
              AA,&nbsp;BMWSB,
          
              <br />
              BMI,
              <br />
              BMBF/BMFTR,
              <br />
              DSEE,
              <br />
              BGHM,
              <br />
              Landesvertretung NRW,
              <br />
              SPD,
              <br />
              VBKI,
              <br />
              Steinway&amp;Sons,
              <br />
              Schwarzkopf,
              <br />
              ADC,
              <br />
              Hamburger Hochbahn,
              <br />
              Hermes,
              <br />
              Cargill,
              <br />
              Zeppelin,
              <br />
              Wild auf Wild,
              <br />
              Edel Books,
              <br />
              Hirschen Group,
              <br />
              Vagedes &amp; Schmid,
              <br />
              familie redlich,
              <br />
              neues handeln,
              <br />
              Filmfest München
            </p>
          </div>
          <div className="info-col info-col-bio">
            <h2 className="panel-label">Bio</h2>
            <div className="info-bio">
              <p>
                Ich bin freiberufliche Fotografin aus Hamburg mit 25 Jahren Erfahrung in den Bereichen Politik,
                Event, Reportage und Zeitgeschehen. Meine Schwerpunkte sind die dokumentarische Fotografie,
                Pressefotografie, Eventdokumentationen für Unternehmen und Verbände sowie die politische Kommunikation.
                <br />
                Als leitende Fotoredakteurin bei großen Pressebildagenturen in Hamburg und Los Angeles verantwortete ich
                die Durchführung von Fotoshootings, die Koordination von Fotografenteams und das Management von
                Bildrechten.
                <br />
                Ich bin Gesellschafterin und Geschäftsführerin der im Januar 2026 gegründeten Czybik &amp; Schmid Media
                UG (haftungsbeschränkt) und halte als Rahmenvertragspartnerin beim Bund Veranstaltungen für Ministerien
                und Bundesbehörden fotografisch fest. Bei der Begleitung von Ministerinnen und Ministern auf
                Auslandsreisen, Pressereisen oder Veranstaltungen erfasse ich die Nuancen des Geschehens und stelle
                komplexe Themen insbesondere für Social Media visuell dar.
              </p>
              <p>
                Ich lege großen Wert darauf, eine verlässliche Quelle zu sein und Geschehnisse auf journalistischen
                Grundlagen wiederzugeben. Besonders in sozialen Medien sehe ich eine Chance, Inhalte schnell und direkt
                an ein breites Publikum zu transportieren.
                <br />
                Neben meiner Arbeit auf dem politischen Parkett und im PR Segment von Veranstaltungen widme ich mich
                regelmäßig freien Fotoprojekten, die mich oft an ungewöhnliche Orte führen. Sie bieten Raum für
                langfristige, persönliche Dokumentationen, die die leisen, unbeachteten Details des Alltags ins Zentrum
                rücken.
                <br />
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="stack-wrapper" id="stackWrapper">
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

      {/* Figma 48:2: Info + Kontakt centered on the screen, the Kontakt
          column starting at its middle; "Legal" in the bottom-right corner. */}
      <footer className="site-footer" id="bottomFooter">
        <div className="footer-contact">
          <div className="footer-col">
            <h2 className="footer-label">Info</h2>
            <p>
              Christina Czybik
              <br />
              PHOTOGRAPHER &amp; Photo Editor
              <br />
              Hamburg / Bundesweit
            </p>
          </div>
          <div className="footer-col">
            <h2 className="footer-label">Kontakt</h2>
            <p>
              Tel.: <a href="tel:+491724040642">0049 (0) 1724040642</a>
              <br />
              E-Mail: <a href="mailto:request@christinaczybik.com">request@christinaczybik.com</a>
              <br />
              Instagram:{' '}
              <a href="https://www.instagram.com/christinaczybik/" target="_blank" rel="noopener">
                @christinaczybik
              </a>
            </p>
          </div>
        </div>
        <p className="footer-legal">
          <a href="/impressum">
            Impressum <br /> &amp; Datenschutz <br /> © 2026
          </a>
        </p>
      </footer>

      <Gallery data={data} />
    </>
  )
}
