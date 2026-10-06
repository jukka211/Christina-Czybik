import { ContactLines } from '@/components/ContactLines'
import { GalleryPage } from '@/components/GalleryPage'
import { TextLines } from '@/components/RichText'
import type { SiteData } from '@/sanity/fetch'

// The start page: the categories' best-of, a row each, under the opening
// intro. The projects are in the Index, which opens their pages. The
// homepage's (app/(site)/page.tsx), and /test-startpage's, which tries it
// with mobileFlat (see GalleryPage) and links its logo back to itself.
export function StartPage({ data, mobileFlat }: { data: SiteData; mobileFlat?: boolean }) {
  return (
    <GalleryPage data={data} mobileFlat={mobileFlat} homeHref={mobileFlat ? '/test-startpage' : '/'}>
      {/* Figma 48:2: Info + Kontakt centered on the screen, the Kontakt
          column starting at its middle; "Legal" in the bottom-right corner.
          The texts come from the Studio's "Info & Kontakt", as in the Info
          panel. */}
      <footer className="site-footer" id="bottomFooter">
        <div className="footer-contact">
          <div className="footer-col">
            <h2 className="footer-label">Info</h2>
            <p>
              <TextLines text={data.info.footerInfo} />
            </p>
          </div>
          <div className="footer-col">
            <h2 className="footer-label">Kontakt</h2>
            <p>
              <ContactLines info={data.info} />
            </p>
          </div>
        </div>
        <p className="footer-legal">
          <a href="/impressum">
            Impressum <br /> &amp; Datenschutz <br /> © 2026
          </a>
        </p>
      </footer>
    </GalleryPage>
  )
}
