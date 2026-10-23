# Trend guide groups

All 20 catalog topics, including Firestarter, each have a detail page and three Blog articles: an explainer (`what`), a creation guide (`how`) and a free-method comparison (`free`). Existing URLs are retained. Burning Bridges is a video-generation product; implementation work is split across worktrees. The scope of this content branch is not a statement of product availability.

New topics may start with a detail page and a `how` guide only. Add `what` and `free` entries only when those distinct articles exist; the synchronizer links only the available pages. Do not attach template-exclusion or generation-unavailability disclaimers to CTAs. Follow the product-copy rules in `AGENTS.md` for body copy, FAQ, metadata and generated navigation.

## Editing a topic

1. Find the topic in `public/video-projects.json`. Its `url` identifies the detail page and its `guides` object identifies the three article routes.
2. Edit the corresponding `public/<route>/index.html` files. Preserve photo input attributes, video sources, source credits and runtime scripts. Keep FAQ schema answers identical to visible answers.
   Generation detail pages use Hero → in-page workspace → validated photos → Pricing. Load `generation-workspace.js`; mark the workspace and its primary action with `data-generation-workspace` and `data-generate-video`. Each existing photo validator sets `data-generation-ready` on its input only after a successful decode, and clears it on replacement/removal. Keep each scene's required roles and optional slots; disabled mode-specific inputs are excluded. Homepage/Drake retain their existing commerce draft-saving and generation handlers.
3. Register a new route in `site.config.json` and `public/sitemap.xml` if adding an article. Add its Blog card in `public/blog/index.html` with matching `data-guide-type` (`what`, `how`, `free`) and `data-guide-topic` (catalog project ID).
4. Run `npm.cmd run check` and `npm.cmd run build` from the repository root. Both run the catalog synchronizer. Do not hand-edit blocks between `TREND GUIDES START` and `TREND GUIDES END`; `scripts/sync-trend-guides.mjs` rebuilds them from the catalog and actual H1 titles.

The shared styling is `public/trend-guides.css`, loaded before `site-theme.css`. `public/blog-guides.js` filters the existing links in place. With JavaScript disabled all cards remain visible. The existing schema synchronizer derives the Blog ItemList from those same cards.

## Local acceptance

Use PowerShell in the repository root. In one terminal run:

```powershell
$env:PORT='3084'
node scripts/dev-commerce.mjs
```

The local commerce server reports `checkout disabled; test fixtures only`. Open `http://127.0.0.1:3084/blog` to review the guides. A pure static server can produce account API errors from the site's existing account UI, so use the local commerce server for the final preview.

In a second terminal run:

```powershell
python scripts/qa-trend-guides.py --base-url http://127.0.0.1:3084 --output .local/trend-guide-qa
```

The script checks 77 pages at 320, 390, 768 and 1280px, all 57 topic/type filter combinations, the 18 local reference-page photo planners and the no-JavaScript Blog fallback. It does not submit a generation or payment request. Use `--interactive-only` for a focused repeat of interaction checks after a completed layout sweep. Video playback can be checked with the existing `qa-dual-heroes.py` and `qa-social-heroes.py` tools.

## Editorial boundaries

- Keep each scene's roles, photo requirements, shot sequence and failure checks specific. Free filming, photo editing, local file preview and AI rendering are separate outputs.
- Visual descriptions refer to the existing credited references. Where no live external source was available, articles point to the local reference collection instead of inventing origin dates or popularity figures.
- Use actual source frames already held by the project. Keep the original topic publication timestamps in `video-projects.json`; adding an article must not reorder the Examples catalog.

These checks establish local content and behavior only. They do not establish GitHub submission, deployment or production acceptance.
