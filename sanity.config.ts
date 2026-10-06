'use client'

// The Sanity Studio, served by the site itself at /studio
// (app/studio/[[...tool]]/page.tsx).
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'

import { dataset, projectId } from './sanity/env'
import { schemaTypes } from './sanity/schemaTypes'
import { structure } from './sanity/structure'

const FIXED_DOCUMENT_TYPES = ['kategorie', 'siteInfo', 'legal']

export default defineConfig({
  basePath: '/studio',
  title: 'Christina Czybik',
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool({ structure })],
  document: {
    // The Kategorie documents are the five fixed ones in the sidebar, never
    // new ones, and the site's texts (Info & Kontakt, Impressum &
    // Datenschutz) one each.
    newDocumentOptions: (previous) =>
      previous.filter((template) => !FIXED_DOCUMENT_TYPES.includes(template.templateId)),
    actions: (previous, { schemaType }) =>
      FIXED_DOCUMENT_TYPES.includes(schemaType)
        ? previous.filter(({ action }) => action !== 'delete' && action !== 'duplicate' && action !== 'unpublish')
        : previous,
  },
})
