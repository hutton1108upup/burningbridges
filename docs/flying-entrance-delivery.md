# Flying Entrance delivery

- Route: `/flying-entrance`
- Primary keywords: Flying Entrance, AI Car Jump Video.
- Reference: https://www.talkpix.ai/trends/flying-entrance (inspected 2026-10-15).
- Recreated the dark layout, purple calls to action, two-column hero with vertical video, collapsible overview, before/after, photo requirements, four steps, FAQ, related cards and closing CTA.
- Adapted the header/footer to existing project routes. Creation, theme and related-effect links lead to `/pricing`; global navigation and policy links retain their own routes.
- Removed the source brand/domain/email, unrelated studios, app-store/social/API links, payment-provider logos, source credit prices, fixed model promises, ownership/consent claims about the sample person, and unsupported generation/refund/download guarantees.
- The page is a reference and plan-entry page. It does not upload photos, create a generation job or deduct credits.
- Added the route to `site.config.json`, `sitemap.xml` and `video-projects.json`; navigation and Examples were regenerated with the existing sync script.

## Media provenance

The following public reference assets were copied locally without claiming that the project created them:

- `public/assets/flying-entrance/result.jpg`: https://www.talkpix.ai/assets/trends/ai-video/flying-entrance.jpg
- `public/assets/flying-entrance/reference.mp4`: https://www.talkpix.ai/assets/trends/ai-video/flying-entrance.mp4
- `public/assets/flying-entrance/person.jpg`: https://www.talkpix.ai/assets/trends/inputs/ege-full.jpg
- `public/assets/flying-entrance/car.jpg`: https://www.talkpix.ai/assets/trends/inputs/car-coupe-front.jpg

Public availability is the provenance, not proof of a commercial license. The original page's team-member permission statement is not reproduced as this project's statement.

## Verification

- `npm.cmd ci --no-audit --no-fund`: installed locked dependencies; lockfile unchanged.
- `npm.cmd run check`: passed route/assets/canonical/runtime/analytics/copy checks and all 60 tests.
- `npm.cmd run build`: passed.
- Chromium at 1440px and 390px: no horizontal overflow or page errors; overview opens/closes; all 14 main-page conversion/theme/related links target Pricing; primary CTA navigates to Pricing; catalog and mobile category menu expose the new route.
- MP4 playback advanced successfully: 12.064 seconds, 480×854, no media error.
- Evidence: `.local/flying-entrance-qa/report.json`, desktop/mobile screenshots and `.local/verify-flying.py`.
- `git diff --check`: passed.
- Local preview: http://localhost:4186/flying-entrance
- No commit, push, merge or production deployment performed.
