// Starts the homepage's gallery, panels and opening grid, in the order the
// static site's scripts ran in, with the site's content from Sanity.
import { startGallery } from "./sketch";
import { startPanels } from "./panels";
import { startIntroGrid } from "./intro-grid";

// The view the homepage opens on: the categories' best-of. The switch's
// markup in app/(site)/page.tsx marks the same one active.
const DEFAULT_VIEW = "kategorien";

let started = false;

// data: { categories, projects } from getSiteData (sanity/fetch.ts). Every
// category and project in it has at least one photo.
export function startSite({ categories, projects }) {
  // React runs an effect twice in development; the gallery starts once per
  // page load.
  if (started) return;
  started = true;

  const views = {
    kategorien: categories.map((category) => ({
      type: "Kat.",
      category: category.title,
      place: "",
      photos: category.photos,
    })),
    projekte: projects.map((project) => ({
      type: "Proj.",
      category: project.title,
      place: project.place ?? "",
      photos: project.photos,
    })),
  };
  if (!views.kategorien.length && !views.projekte.length) return;

  startGallery(views, DEFAULT_VIEW);
  startPanels(projects);
  startIntroGrid();
  document.documentElement.classList.add("gallery-ready");
}
