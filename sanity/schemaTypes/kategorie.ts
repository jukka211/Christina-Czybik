import { defineArrayMember, defineField, defineType } from 'sanity'

import { getCategoryTitle } from '../categories'

// A category's best-of: the photos of its row on the homepage (the gallery's
// "Kategorien" view). There is one of these per category, with a fixed ID
// (see getKategorieDocumentId), opened from the Studio's "Kategorien
// (Startseite)" list; they can't be created, duplicated or deleted
// (sanity.config.ts). Which category a document belongs to is its ID.
export const kategorie = defineType({
  name: 'kategorie',
  title: 'Kategorie',
  type: 'document',
  fields: [
    defineField({
      name: 'fotos',
      title: 'Best-of Fotos',
      description:
        'Die Fotos dieser Kategorie auf der Startseite, in dieser Reihenfolge. Mehrere Fotos auf einmal hierher ziehen, um sie hochzuladen.',
      type: 'array',
      of: [defineArrayMember({ type: 'image' })],
      options: { layout: 'grid' },
    }),
  ],
  preview: {
    select: {
      id: '_id',
      media: 'fotos.0.asset',
    },
    prepare({ id, media }) {
      const value = String(id).replace(/^drafts\./, '').replace(/^kategorie-/, '')
      return { title: getCategoryTitle(value), media }
    },
  },
})
