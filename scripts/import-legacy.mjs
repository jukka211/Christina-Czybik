// One-off import of the old static site's content into Sanity:
//
// - Each category folder in images/ becomes that category's best-of (its
//   Kategorie document), in file-name order, as the gallery's rows showed
//   them.
// - The Index's projects (legacy/projects.js) become Projekt documents, in
//   the same order, one per name. They're the design's placeholder list
//   (some names repeat there, and the photos are a first pass), to be edited
//   or replaced in the Studio.
//
// Run it once .env.local has the project ID and a write token (README.md):
//
//   npm run import-legacy
//
// Documents that already exist are left alone, so edits made in the Studio
// survive a second run; --overwrite replaces them. A photo that's already in
// Sanity (the same file content) isn't uploaded again.
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

import { createClient } from '@sanity/client'
import lexorank from 'lexorank'

const { LexoRank } = lexorank

const OVERWRITE = process.argv.includes('--overwrite')
const UPLOADS_AT_ONCE = 4

// Category value (sanity/categories.ts) -> its folder in images/.
const CATEGORY_FOLDERS = {
  politik: 'Politik',
  veranstaltungen: 'Veranstaltungen',
  wirtschaft: 'Wirtschaft',
  portraet: 'Porträt',
  'personal-projects': 'Personal_Projects',
}

// legacy/projects.js's categories -> the five fixed ones.
const PROJECT_CATEGORIES = {
  Politik: 'politik',
  Veranstaltung: 'veranstaltungen',
  BMWK: 'wirtschaft',
  Porträt: 'portraet',
  'Freie Projekte': 'personal-projects',
}

const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const { NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN } = process.env
if (!NEXT_PUBLIC_SANITY_PROJECT_ID || !SANITY_API_WRITE_TOKEN) {
  console.error('Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env.local first (see README.md).')
  process.exit(1)
}

const client = createClient({
  projectId: NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-09-01',
  token: SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

// --- Photos -----------------------------------------------------------------

// sha1 of the file -> a promise of its Sanity asset ID. The same photo filed
// in two folders, or in a folder and a project, is uploaded once.
const assetIds = new Map()
let uploadCount = 0
let reuseCount = 0

function getAssetId(filePath) {
  const buffer = fs.readFileSync(filePath)
  const sha1 = createHash('sha1').update(buffer).digest('hex')
  if (!assetIds.has(sha1)) assetIds.set(sha1, findOrUpload(buffer, sha1, filePath))
  return assetIds.get(sha1)
}

async function findOrUpload(buffer, sha1, filePath) {
  const existing = await client.fetch('*[_type == "sanity.imageAsset" && sha1hash == $sha1][0]._id', { sha1 })
  if (existing) {
    reuseCount += 1
    return existing
  }
  const asset = await client.assets.upload('image', buffer, {
    filename: path.basename(filePath).normalize('NFC'),
  })
  uploadCount += 1
  console.log(`  uploaded ${path.relative('images', filePath).normalize('NFC')}`)
  return asset._id
}

// An array of image items for a document, in the order of filePaths,
// uploading UPLOADS_AT_ONCE at a time.
async function toImageItems(filePaths) {
  const ids = new Array(filePaths.length)
  let next = 0
  async function worker() {
    while (next < filePaths.length) {
      const index = next
      next += 1
      ids[index] = await getAssetId(filePaths[index])
    }
  }
  await Promise.all(Array.from({ length: UPLOADS_AT_ONCE }, worker))
  return ids.map((id) => ({
    _type: 'image',
    _key: randomUUID().slice(0, 12),
    asset: { _type: 'reference', _ref: id },
  }))
}

// --- Documents --------------------------------------------------------------

// Checked before a document's photos are uploaded, so a document that's
// left alone costs no uploads.
async function isKept(id, label) {
  if (OVERWRITE || !(await client.getDocument(id))) return false
  console.log(`${label}: already in Sanity, left as it is (--overwrite replaces it)`)
  return true
}

async function save(doc, label) {
  await client.createOrReplace(doc)
  console.log(`${label}: saved`)
}

async function importCategories() {
  for (const [value, folder] of Object.entries(CATEGORY_FOLDERS)) {
    const id = `kategorie-${value}`
    if (await isKept(id, `Kategorie ${folder}`)) continue
    const folderPath = path.join('images', folder)
    const files = fs
      .readdirSync(folderPath)
      .filter((file) => !file.startsWith('.') && PHOTO_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort((a, b) => (a.normalize('NFC') < b.normalize('NFC') ? -1 : 1))
    console.log(`Kategorie ${folder}: ${files.length} photos`)
    const fotos = await toImageItems(files.map((file) => path.join(folderPath, file)))
    await save({ _id: id, _type: 'kategorie', fotos }, `Kategorie ${folder}`)
  }
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function importProjects() {
  const source = fs.readFileSync(path.join('legacy', 'projects.js'), 'utf8')
  const legacyProjects = vm.runInNewContext(`${source}\nPROJECTS`)

  const seen = new Set()
  let rank = LexoRank.min()
  for (const legacy of legacyProjects) {
    if (seen.has(legacy.project)) continue
    seen.add(legacy.project)
    // Spaced out the way the Studio's drag-and-drop list spaces them.
    rank = rank.genNext().genNext()

    const kategorie = PROJECT_CATEGORIES[legacy.category]
    if (!kategorie) throw new Error(`No category for "${legacy.category}" (${legacy.project})`)
    const id = `project-${slugify(legacy.project)}`
    if (await isKept(id, `Projekt ${legacy.project}`)) continue
    const fotos = await toImageItems(legacy.images.map((file) => path.join('images', file)))
    await save(
      {
        _id: id,
        _type: 'project',
        orderRank: rank.toString(),
        title: legacy.project,
        kategorie,
        auftraggeber: legacy.client,
        ort: legacy.place,
        jahr: legacy.year,
        fotos,
      },
      `Projekt ${legacy.project}`,
    )
  }
}

await importCategories()
await importProjects()
console.log(`\nDone: ${uploadCount} photos uploaded, ${reuseCount} already in Sanity.`)
