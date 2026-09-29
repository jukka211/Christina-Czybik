import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { CATEGORIES, getCategoryTitle } from '../categories'

// A project: one row in the Index, and one row of the homepage's gallery
// when it's switched to "Projekte". Projects show in the order they're
// dragged into in the Studio's "Projekte" list (orderRank).
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
