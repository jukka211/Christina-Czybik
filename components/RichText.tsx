import { Fragment } from 'react'

import { PortableText, type PortableTextComponents } from 'next-sanity'

import { getMailtoHref } from '@/lib/contact'
import type { RichText as RichTextValue } from '@/sanity/texts'

// Links in the Studio's texts. A plain e-mail link gets the subject and
// first line every e-mail link on the site has; a link to another site
// opens in a new tab.
const components: PortableTextComponents = {
  marks: {
    link: ({ value, children }) => {
      const href: string = typeof value?.href === 'string' ? value.href : ''
      if (/^mailto:[^?]+$/.test(href)) return <a href={getMailtoHref(href.slice('mailto:'.length))}>{children}</a>
      if (/^https?:/.test(href)) {
        return (
          <a href={href} target="_blank" rel="noopener">
            {children}
          </a>
        )
      }
      return <a href={href}>{children}</a>
    },
  },
}

// A text from the Studio with paragraphs, line breaks and links (and bullet
// points where the field has them): a <p> per paragraph, a <br> per line
// break, as the markup had them before the texts were in the Studio.
export function RichText({ value }: { value: RichTextValue | null }) {
  if (!value) return null
  return <PortableText value={value} components={components} />
}

// A plain text from the Studio, a line of it per line.
export function TextLines({ text }: { text: string | null }) {
  if (!text) return null
  return text.split('\n').map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ))
}
