# Zombie Pet landing page

Route: `/zombie-pet-ai-video`. This change adds a landing page and local two-photo casting preview. Create buttons link to `/pricing`; it does not register a pet generation provider, upload photos, create jobs, or spend credits.

## Page and navigation

The layout follows the public `https://aizombie.video/zombie-pet` page: dark background, amber controls, landscape story video, two photo slots, four scene cards, photo guidance, and FAQ. Copy is rewritten for Burning Bridges rather than copied from the source.

The story video, poster and scene images are external references from `https://aizombie.video/samples/pet-leap*`. They are not Burning Bridges generation results. The directory thumbnail is an original SVG illustration, labeled as such in its alt text. External media availability is controlled by that site.

`public/video-projects.json` adds the `pets` category (`Pets & Stories`) and one Zombie Pet project. The existing `scripts/sync-video-projects.mjs` regenerates the Examples card, category filters, ItemList schema and navigation menus. Other page changes are generated menu additions. Examples metadata and introductory text now include pet stories.

## Copy review

Applied `humanizer-zh` editorial principles to the English copy: remove generic promotion, prefer visible details, vary sentence length, and avoid unsupported price or rendering-time claims. The page uses the core phrase in its title, H1, description and FAQ without repeating it in every paragraph.

Examples of edits:

- Closing title: `A familiar pet. A story with a different ending.` becomes `Pick the photos for your story`.
- Replaced source-specific rendering, refund and saved-video claims with a Pricing link and a check of included templates.
- Kept photo privacy concrete: previews stay on the page, and opening Pricing does not upload them or start a job.

## Verification

- `npm.cmd run check`: 60 tests pass; 19 public routes plus 404, assets, links, sitemap, analytics coverage and matching FAQ/schema checked.
- `npm.cmd run build` and `git diff --check`: pass.
- Browser: reference video and all four scene images load; both photo slots accept a valid PNG and can be removed; invalid and oversized files show errors while preserving the previous valid preview.
- Browser: FAQ expands, Create video reaches Pricing, Examples pets filter returns one project, project card reaches this route, desktop menu closes with Escape, and mobile menu includes the project.
- Checked 320px, 390px, 768px and desktop layouts; no horizontal document overflow. No browser console errors observed.
- Local review: `http://127.0.0.1:4176/zombie-pet-ai-video` and `http://127.0.0.1:4176/examples`.

Deployment and real pet video generation are separate from this landing-page delivery.
