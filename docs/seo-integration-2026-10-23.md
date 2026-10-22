# SEO guide integration: local acceptance, 2026-10-23

## Baseline and scope

- Only the 4ca4 worktree was edited, on local branch `codex/trend-guides-local-integration`.
- Baseline: current main, `00bce8648bd9d2266221f7d0a466c0fc60708020` (Nicole Kidman, PR #63). A final fetch confirmed it is still main.
- Original uncommitted files and patch were backed up outside the repository before integration. This batch remains uncommitted and unpublished. Other worktrees were not edited.
- Build output is a local preview of uncommitted changes. Its main revision stamp does not identify a published release of this batch.

## PR #51 consolidation

[PR #51](https://github.com/hutton1108upup/burningbridges/pull/51) remains OPEN at `5b3a471c86577c3a636a8e0ccb98b18dbd7088dd`. Its nine How-to topics overlap this draft batch. Eight URLs match exactly. Cheba now uses `/blog/how-to-make-cheba-man-ai-dance-video`, matching that PR; the alternative `/blog/how-to-make-cheba-man-ai-video` is absent from the catalog, Blog, sitemap and route configuration. The local drafts occupy these same routes instead of adding a second article for the same topic and intent. PR #51 was not changed. A future publishing task should treat it as overlapping work rather than merge it blindly after this batch.

## Content and navigation

- 19 topics each have a detail page plus `what`, `how` and `free` guides: 57 topic articles and 76 topic-group pages.
- Blog has 63 cards: 57 topic articles and six existing general resources.
- Nicole Kidman's main detail and How-to routes remain. Added its explainer and free-options article. I Feel Like Nicole remains a separate cooler-cam topic, with cross-links explaining the difference.
- Scene-specific summaries replace repeated descriptions in the new articles. All 57 article descriptions are distinct. Free preparation, local photo preview, external rendering and supported party generation remain separate capabilities.
- Each topic group has one reciprocal link panel generated from `public/video-projects.json`. Canonicals, FAQ/schema, Blog ItemList, sitemap, assets and anchors passed project checks.
- All 19 detail pages retain their exact main input attributes, video/source attributes and script bindings. Existing photos, roles and business behavior were retained.
- Nicole's existing pricing links now say `View credit plans` to match their destination and actual capability.

## Acceptance

- `npm.cmd run check`: 88 routes, 207 assets and 382 FAQ answers checked; all 87 tests pass.
- `npm.cmd run build`: local build passed.
- Browser layout: Blog plus all 76 topic-group pages at 320, 390, 768 and 1280px (308 checks). Fixed a 6px overflow in Toc Toc's lower pricing CTA at 320px by wrapping its label inside the card; targeted recheck passed.
- Browser filters: all 57 topic/type pairs return one intended article; each of 19 topic-only selections returns three articles; reset returns 63 cards.
- Browser photos: selection, replacement and removal passed on all 18 reference-page planners. Gas Station solo/trio exposes one/three active inputs. Nicole accepts the optional second portrait.
- Mobile Blog navigation expands and closes; filtering works at 390px. Blog mobile and Nicole desktop screenshots were inspected. Additional article layout checks followed the final copy refinement.
- Reference media sources and controls were preserved. Gas Station video loaded without a media error and its sound control toggled. Paid generation, checkout and external AI exports were not exercised.
- No-JavaScript fallback was inspected in source: all cards are in HTML and only enhancement controls start hidden. A browser run with JavaScript disabled was not performed.

## Local preview

From this worktree, set `PORT=3084` and run `node scripts/dev-commerce.mjs`. Checkout is disabled; the server uses local test fixtures.

- [Blog](http://127.0.0.1:3084/blog)
- [Nicole detail](http://127.0.0.1:3084/examples/nicole-kidman-dance-ai-video-maker)
- [Nicole explainer](http://127.0.0.1:3084/blog/nicole-kidman-dance-ai-trend-explained)
- [Cheba guide](http://127.0.0.1:3084/blog/how-to-make-cheba-man-ai-dance-video)

Review locally before separately authorizing a commit or release.
