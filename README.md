# Christina Czybik

Portfolio site: [Next.js](https://nextjs.org) (App Router), content in
[Sanity](https://www.sanity.io), hosted on [Vercel](https://vercel.com).

## Content (Sanity Studio at `/studio`)

- **Projekte**: one entry per project, with Projekt (name), Adresse (the
  slug: its page is at `/<slug>`, made from the name with "Generate"),
  Kategorie (one of Politik, Veranstaltungen, Wirtschaft, Porträt, Personal
  Projects), Auftraggeber, Ort, Jahr and its Fotos. Projects fill the Index,
  which opens their pages. A project's page has its photos in the middle row,
  and the projects before and after it in the Index above and below. Drag
  them in the list to change their order.
- **Kategorien (Startseite)**: the five categories' best-of photos, one row
  each on the homepage.
- **Info & Kontakt**: the Info panel's texts (Info, Telefon, E-Mail,
  Instagram, Ausgewählte Kunden, Bio) and the Info in the homepage's footer,
  whose Kontakt is the same. The links (to call, to write with the subject
  "Anfrage", to Instagram) are made from what's typed.
- **Impressum & Datenschutz**: the Impressum, and the Datenschutz's sections,
  each a heading and its text.

The last two start out as the texts the site had before they were in the
Studio (`sanity/texts.ts`), and the site shows those until they're
published.

Published changes show on the site within about a minute. Photos are served
by Sanity's image CDN, scaled to the screen they're shown on.

## Setup

Needs Node 20.6 or newer.

1. `npm install`
2. Create the Sanity project (you need to be logged in: `npx sanity login`):

   ```sh
   npx sanity init --bare --project-name "Christina Czybik" --dataset production
   ```

   Copy `.env.example` to `.env.local` and fill in the project ID it prints.
3. Let the local site and Studio talk to Sanity:

   ```sh
   npx sanity cors add http://localhost:3000 --credentials
   ```

4. `npm run dev`, then open <http://localhost:3000> and
   <http://localhost:3000/studio>.

### Importing the old site's photos (once)

`scripts/import-legacy.mjs` uploads the category folders in `images/` as the
categories' best-of, and the old Index's placeholder projects
(`legacy/projects.js`) as projects. It needs a write token:

```sh
npx sanity tokens add "Import" --role=editor
```

Put the token in `.env.local` as `SANITY_API_WRITE_TOKEN`, then run
`npm run import-legacy`. It's safe to run again: documents that already
exist are left alone (`npm run import-legacy -- --overwrite` replaces them),
and photos already in Sanity aren't uploaded twice. Remove the token from
`.env.local` afterwards. The site itself never needs it.

### Adding the projects' addresses (once)

Projects made before the Adresse field existed get theirs from
`migrations/add-project-slugs/` (each project's name, as "Generate" makes
it, and the same address the site already gives a project that has none).
Deploy the site first, so the Studio online knows the field, then:

```sh
npx sanity migration run add-project-slugs            # shows what it would change
npx sanity migration run add-project-slugs --no-dry-run
```

It uses your Sanity login (`npx sanity login`), and leaves projects that
already have an address alone.

## Deploying on Vercel

1. Import the repository in Vercel (framework: Next.js, no other settings).
2. Add the environment variables `NEXT_PUBLIC_SANITY_PROJECT_ID` and
   `NEXT_PUBLIC_SANITY_DATASET`.
3. Add the site's domain(s) to Sanity's CORS origins, so the Studio works
   there too: `npx sanity cors add https://your-domain --credentials`.

## Where things are

- `app/(site)/page.tsx`: the homepage, `app/(site)/[slug]/page.tsx`: a
  project's page, both on `components/GalleryPage.tsx` (nav, Info / Index
  panels, gallery). `app/(site)/impressum/page.tsx`: Impressum &
  Datenschutz. `app/not-found.tsx`: the page for addresses that don't exist.
- `lib/gallery/`: the gallery, panels and opening intro, plain DOM code
  carried over from the static site. `sketch.js` has the row stack,
  fullscreen and the project pages (moving from one project to the next).
- `styles/`: the stylesheets, one per part of the page.
- `sanity/`: schema (`schemaTypes/`), the Studio's sidebar
  (`structure.ts`), the category list (`categories.ts`), how a project's
  address is made (`slug.ts`), the site's texts as they started out
  (`texts.ts`) and the queries the pages use (`fetch.ts`).
  `sanity.config.ts` configures the Studio, `migrations/` holds one-off
  changes to the content.
- `legacy/`: the old static site, for reference.
