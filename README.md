# Christina Czybik

Portfolio site: [Next.js](https://nextjs.org) (App Router), content in
[Sanity](https://www.sanity.io), hosted on [Vercel](https://vercel.com).

## Content (Sanity Studio at `/studio`)

- **Projekte**: one entry per project, with Projekt (name), Kategorie
  (one of Politik, Veranstaltungen, Wirtschaft, Porträt, Personal Projects),
  Auftraggeber, Ort, Jahr and its Fotos. Projects fill the Index, and the
  homepage's rows when the switch is set to "Projekte" (one row per project).
  Drag them in the list to change their order.
- **Kategorien (Startseite)**: the five categories' best-of photos, one row
  each on the homepage when the switch is set to "Kategorien", which is what
  it opens on.

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

## Deploying on Vercel

1. Import the repository in Vercel (framework: Next.js, no other settings).
2. Add the environment variables `NEXT_PUBLIC_SANITY_PROJECT_ID` and
   `NEXT_PUBLIC_SANITY_DATASET`.
3. Add the site's domain(s) to Sanity's CORS origins, so the Studio works
   there too: `npx sanity cors add https://your-domain --credentials`.

## Where things are

- `app/(site)/page.tsx`: the homepage's markup (nav, Info / Index panels,
  footer). `app/(site)/impressum/page.tsx`: Impressum & Datenschutz.
- `lib/gallery/`: the gallery, panels and opening intro, plain DOM code
  carried over from the static site. `sketch.js` has the row stack,
  fullscreen and the Projekte / Kategorien switch.
- `styles/`: the stylesheets, one per part of the page.
- `sanity/`: schema (`schemaTypes/`), the Studio's sidebar
  (`structure.ts`), the category list (`categories.ts`) and the query the
  pages use (`fetch.ts`). `sanity.config.ts` configures the Studio.
- `legacy/`: the old static site, for reference.
