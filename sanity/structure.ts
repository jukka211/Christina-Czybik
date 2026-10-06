import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import type { StructureResolver } from 'sanity/structure'

import { CATEGORIES, getKategorieDocumentId } from './categories'
import { LEGAL_ID, SITE_INFO_ID } from './texts'

// The Studio's sidebar: the projects, in the order they're dragged into, the
// five categories' best-of documents, one fixed entry each, and the site's
// texts, one fixed document each (see texts.ts).
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
      S.divider(),
      S.listItem()
        .id('siteInfo')
        .title('Info & Kontakt')
        .child(S.document().schemaType('siteInfo').documentId(SITE_INFO_ID).title('Info & Kontakt')),
      S.listItem()
        .id('legal')
        .title('Impressum & Datenschutz')
        .child(S.document().schemaType('legal').documentId(LEGAL_ID).title('Impressum & Datenschutz')),
    ])
