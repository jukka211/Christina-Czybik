// Gives every project that has no address (slug) yet the one the Studio's
// "Generate" would make from its name, published projects and drafts alike.
// Projects that have one keep it. See README.md for running it.
import { at, defineMigration, setIfMissing } from 'sanity/migrate'

import { slugify } from '../../sanity/slug'

export default defineMigration({
  title: 'Add project slugs',
  documentTypes: ['project'],
  migrate: {
    document(doc) {
      const title = typeof doc.title === 'string' ? doc.title : ''
      if (!title) return
      return at('slug', setIfMissing({ _type: 'slug', current: slugify(title) }))
    },
  },
})
