import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import type { StructureResolver } from 'sanity/structure'

import { CATEGORIES, getKategorieDocumentId } from './categories'

// The Studio's sidebar: the projects, in the order they're dragged into, and
// the five categories' best-of documents, one fixed entry each.
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Inhalte')
    .items([
      orderableDocumentListDeskItem({ type: 'project', title: 'Projekte', S, context }),
      S.divider(),
      S.listItem()
        .id('kategorien')
        .title('Kategorien (Startseite)')
        .child(
          S.list()
            .title('Kategorien (Startseite)')
            .items(
              CATEGORIES.map(({ value, title }) =>
                S.listItem()
                  .id(value)
                  .title(title)
                  .child(
                    S.document()
                      .schemaType('kategorie')
                      .documentId(getKategorieDocumentId(value))
                      .title(title),
                  ),
              ),
            ),
        ),
    ])
