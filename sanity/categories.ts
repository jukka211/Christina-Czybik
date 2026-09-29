// The five fixed categories, in the order the homepage shows them as rows.
// A project picks one of them (schemaTypes/project.ts), and each has one
// Kategorie document holding its best-of photos for the homepage
// (schemaTypes/kategorie.ts). `value` is what's stored, so the titles can
// be renamed here at any time; changing a value would orphan what's stored
// under the old one.
export const CATEGORIES = [
  { value: 'politik', title: 'Politik' },
  { value: 'veranstaltungen', title: 'Veranstaltungen' },
  { value: 'wirtschaft', title: 'Wirtschaft' },
  { value: 'portraet', title: 'Porträt' },
  { value: 'personal-projects', title: 'Personal Projects' },
] as const

export type CategoryValue = (typeof CATEGORIES)[number]['value']

export function getCategoryTitle(value: string | undefined) {
  return CATEGORIES.find((category) => category.value === value)?.title ?? ''
}

// Each category's Kategorie document has this fixed ID, so there is exactly
// one per category (see structure.ts).
export function getKategorieDocumentId(value: CategoryValue) {
  return `kategorie-${value}`
}
