import { defineArrayMember, defineField, defineType } from 'sanity'

import { DEFAULT_LEGAL } from '../texts'
import { richTextField } from './rich-text'

// The Impressum & Datenschutz page's texts (app/(site)/impressum/page.tsx).
// One document, opened from the Studio's "Impressum & Datenschutz"
// (structure.ts); it can't be created twice, duplicated or deleted
// (sanity.config.ts). It starts out as the texts the page had before
// (sanity/texts.ts).
export const legal = defineType({
  name: 'legal',
  title: 'Impressum & Datenschutz',
  type: 'document',
  initialValue: DEFAULT_LEGAL,
  fields: [
    richTextField({
      name: 'impressum',
      title: 'Impressum',
      description: 'Absätze mit Enter, Zeilenumbrüche mit Umschalt+Enter.',
    }),
    defineField({
      name: 'datenschutz',
      title: 'Datenschutz',
      description: 'Die Abschnitte, in dieser Reihenfolge: links die Überschrift, rechts der Text.',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'section',
          title: 'Abschnitt',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Überschrift', type: 'string' }),
            richTextField({
              name: 'body',
              title: 'Text',
              description: 'Absätze mit Enter, Zeilenumbrüche mit Umschalt+Enter, und Aufzählungen.',
              lists: true,
            }),
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Impressum & Datenschutz' }),
  },
})
