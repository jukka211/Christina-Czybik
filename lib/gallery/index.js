// Starts a gallery page, the homepage or a project page, in the order the
// static site's scripts ran in, with the site's content from Sanity.
import { startGallery, startProjectGallery } from "./sketch";
import { markCurrentProject, startPanels } from "./panels";
import { startIntroGrid } from "./intro-grid";

let started = false;

// data: { categories, projects } from getSiteData (sanity/fetch.ts). Every
// category and project in it has at least one photo. projectSlug: the
// project whose page this is, none on the homepage. mobileFlat: see
// startGallery.
export function startSite({ categories, projects }, projectSlug, { mobileFlat = false } = {}) {
  // React runs an effect twice in development; the gallery starts once per
  // page load.
  if (started) return;
  started = true;

  if (projectSlug) {
    const index = projects.findIndex((project) => project.slug === projectSlug);
    if (index < 0) return;
    startProjectGallery(projects, index, { onChange: (project) => markCurrentProject(project.slug) });
    startPanels(projects);
  } else {
    // The homepage's rows: the categories' best-of.
    if (!categories.length) return;
    startGallery(
      categories.map((category) => ({
        type: "Kategorie",
        category: category.title,
        place: "",
        photos: category.photos,
      })),
      { mobileFlat },
    );
    startPanels(projects);
    startIntroGrid();
  }
  document.documentElement.classList.add("gallery-ready");
}
