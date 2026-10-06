import { defineArrayMember, defineField, defineType } from 'sanity'

import { DEFAULT_SITE_INFO } from '../texts'
import { richTextField } from './rich-text'

// The Info panel's texts (Info, Kontakt, Ausgewählte Kunden, Bio) and the
// homepage's footer, which shows the same Kontakt. One document, opened from
// the Studio's "Info & Kontakt" (structure.ts); it can't be created twice,
// duplicated or deleted (sanity.config.ts). It starts out as the texts the
// site had before (sanity/texts.ts).
export const siteInfo = defineType({
  name: 'siteInfo',
  title: 'Info & Kontakt',
  type: 'document',
  initialValue: DEFAULT_SITE_INFO,
  fields: [
    defineField({
      name: 'info',
      title: 'Info',
      description: 'Unter „Info“, in Großbuchstaben. Jede Zeile hier ist eine Zeile dort.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'phone',
      title: 'Telefon',
      description: 'So, wie es auf der Website stehen soll, z. B. 0049 (0) 1724040642. Der Link zum Anrufen wird daraus gemacht.',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'E-Mail',
      description: 'Ein Klick darauf öffnet eine E-Mail mit Betreff „Anfrage“.',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram',
      description: 'Der Benutzername, ohne @.',
      type: 'string',
    }),
    defineField({
      name: 'clients',
      title: 'Ausgewählte Kunden',
      description: 'Einer pro Eintrag, in dieser Reihenfolge. Die Kommas setzt die Website.',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    richTextField({
      name: 'bio',
      title: 'Bio',
      description: 'Absätze mit Enter, Zeilenumbrüche mit Umschalt+Enter.',
    }),
    defineField({
      name: 'footerInfo',
      title: 'Info in der Fußzeile',
      description:
        'Ganz unten auf der Startseite, links neben dem Kontakt (der von oben kommt). Jede Zeile hier ist eine Zeile dort.',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Info & Kontakt' }),
  },
})
