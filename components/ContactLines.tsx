import { Fragment } from 'react'

import { getInstagramHandle, getInstagramHref, getMailtoHref, getTelHref } from '@/lib/contact'
import type { SiteInfo } from '@/sanity/texts'

// The contact details from the Studio's "Info & Kontakt", a line each: in
// the Info panel and in the homepage's footer. One left empty is left out.
export function ContactLines({ info }: { info: SiteInfo }) {
  const lines: React.ReactNode[] = []
  if (info.phone) {
    lines.push(
      <>
        Tel.: <a href={getTelHref(info.phone)}>{info.phone}</a>
      </>,
    )
  }
  if (info.email) {
    lines.push(
      <>
        E-Mail: <a href={getMailtoHref(info.email)}>{info.email}</a>
      </>,
    )
  }
  const instagram = info.instagram ? getInstagramHandle(info.instagram) : ''
  if (instagram) {
    lines.push(
      <>
        Instagram:{' '}
        <a href={getInstagramHref(instagram)} target="_blank" rel="noopener">
          @{instagram}
        </a>
      </>,
    )
  }
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ))
}
