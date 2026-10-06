import { defineArrayMember, defineField } from 'sanity'

// Text the way the site sets it: paragraphs (Enter), line breaks within one
// (Shift+Enter) and links, and with `lists` bullet points too. No bold, no
// headings: the site's type is one size and weight throughout.
export function richTextField({
  name,
  title,
  description,
  lists = false,
}: {
  name: string
  title: string
  description?: string
  lists?: boolean
}) {
  return defineField({
    name,
    title,
    description,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [{ title: 'Normal', value: 'normal' }],
        lists: lists ? [{ title: 'Aufzählung', value: 'bullet' }] : [],
        marks: {
          decorators: [],
          annotations: [
            {
              name: 'link',
              title: 'Link',
              type: 'object',
              fields: [
                defineField({
                  name: 'href',
                  title: 'Adresse',
                  description: 'https://…, mailto:… (eine E-Mail-Adresse) oder tel:… (eine Telefonnummer)',
                  type: 'url',
                  validation: (rule) => rule.uri({ scheme: ['http', 'https', 'mailto', 'tel'] }),
                }),
              ],
            },
          ],
        },
      }),
    ],
  })
}
