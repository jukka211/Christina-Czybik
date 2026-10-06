import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { CATEGORIES, getCategoryTitle } from '../categories'
import { RESERVED_SLUGS, SLUG_PATTERN, slugify } from '../slug'

// A project: one row in the Index, and its own page at /<slug>, which the
// Index opens. Projects show in the order they're dragged into in the
// Studio's "Projekte" list (orderRank), and a project page has the one
// before it above and the one after it below.
export const project = defineType({
  name: 'project',
  title: 'Projekt',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: 'project' }),
    defineField({
      name: 'title',
      title: 'Projekt',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Adresse',
      description:
        'Die Adresse der Projektseite, z. B. „koenig-bansah“ für …/koenig-bansah. „Generate“ macht sie aus dem Projektnamen. Nach der Veröffentlichung nicht mehr ändern: Links auf die alte Adresse führen sonst ins Leere.',
      type: 'slug',
      options: { source: 'title', slugify },
      validation: (rule) =>
        rule.required().custom((value) => {
          const current = value?.current
          if (!current) return true
          if (!SLUG_PATTERN.test(current)) return 'Nur Kleinbuchstaben, Ziffern und Bindestriche, z. B. koenig-bansah.'
          if (RESERVED_SLUGS.includes(current)) return `„${current}“ ist schon die Adresse einer anderen Seite.`
          return true
        }),
    }),
    defineField({
      name: 'kategorie',
      title: 'Kategorie',
      type: 'string',
      options: {
        list: CATEGORIES.map(({ title, value }) => ({ title, value })),
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'auftraggeber',
      title: 'Auftraggeber',
      type: 'string',
    }),
    defineField({
      name: 'ort',
      title: 'Ort',
      type: 'string',
    }),
    defineField({
      name: 'jahr',
      title: 'Jahr',
      type: 'string',
      description: 'z. B. 2025 oder 2023–2024',
    }),
    defineField({
      name: 'fotos',
      title: 'Fotos',
      description: 'In der Reihenfolge, in der sie auf der Website erscheinen. Mehrere Fotos auf einmal hierher ziehen, um sie hochzuladen.',
      type: 'array',
      of: [defineArrayMember({ type: 'image' })],
      options: { layout: 'grid' },
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      kategorie: 'kategorie',
      jahr: 'jahr',
      media: 'fotos.0.asset',
    },
    prepare({ title, kategorie, jahr, media }) {
      return {
        title,
        subtitle: [getCategoryTitle(kategorie), jahr].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
