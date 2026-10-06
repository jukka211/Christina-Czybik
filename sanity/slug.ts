// A project's page is at /<slug> (app/(site)/[slug]/page.tsx). The Studio
// makes the slug from the project's name with slugify (schemaTypes/project.ts),
// and so does the site for a project that doesn't have one yet (fetch.ts).

// Lowercase words joined by hyphens, with German letters written out and "&"
// as "und": "König Bansah" -> koenig-bansah, "Medien & Kultur" ->
// medien-und-kultur.
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' und ')
    // Any other accent goes: é -> e.
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 96)
    .replace(/^-+|-+$/g, '')
}

// What a slug may look like: what slugify makes.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// The site's own pages at the top level. A project with one of these as its
// slug could never be opened: the page would win. A new top-level page goes
// here too.
export const RESERVED_SLUGS = ['impressum', 'studio']
