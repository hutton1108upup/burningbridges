# Credit-offer navigation and GA4

## Navigation

- No photo, or an unchanged photo already stored in IndexedDB: use the native `/pricing` link immediately. Neither saving nor analytics callbacks are on this path.
- A photo still being prepared or changed settings: reuse the pending draft write, with a 1,500 ms navigation wait limit. On failure/timeout keep the page and photo, restore the button and show a retry message. Do not discard a photo to make navigation appear faster.
- Prefetch the public pricing document when the modal/teaser appears, except on data-saving or 2G connections.
- Storage-contention browser test: holding a real read/write transaction open delayed the old click until release (1,883 ms); the updated link requested pricing after 72 ms and preserved the same saved photo. These are local test timings, not a claim about all production networks.

## Existing destination

Use the existing GA4 measurement ID `G-LSG4H51443` through `public/analytics.js`. Production origin only; localhost and Workers preview do not initialize tags. Keep one default page view per document, sanitized URLs/referrers, disabled Google signals/ad personalization, and the existing Clarity input/photo masking. No additional consent interface or analytics service is introduced.

## Events

| Event | When | Additional parameters |
| --- | --- | --- |
| `offer_view` | Modal or mobile teaser becomes visible | `offer_id`, `offer_surface`, `offer_trigger`, `offer_source_path` |
| `offer_close` | A visible offer is dismissed | Above plus `close_method` |
| `offer_open` | Mobile teaser is clicked to open the modal | Teaser surface and scroll trigger |
| `offer_click` | The modal's pricing link is clicked, including modified/middle clicks | Above plus `destination_path=/pricing` |
| `pricing_view` | Pricing document initializes analytics | `offer_engagement=none/viewed/clicked`, plus offer context when available |
| `purchase` | Order API confirms credit grant and a verified non-revoked receipt in production mode | Offer context, receipt transaction ID, actual charged amount, currency and plan item |

`offer_surface`: `modal` / `teaser`. `offer_trigger`: `exit_top` / `scroll_up` / `teaser_click`.

`close_method`: `close_button` / `dismiss_button` / `backdrop` / `escape`. Navigation to pricing is not reported as a close. A mobile visitor may see both a teaser and a modal; use users and surface filters rather than treating their two impressions as two people.

Offer context lasts up to 30 minutes in session storage and does not add query strings to URLs. Purchase duplicates are suppressed in memory and a bounded list of the most recent 100 transaction references in local storage; GA4 also receives a stable `transaction_id`. Blocked storage/tags must not interrupt the product flow.


Only explicit safe fields are forwarded. Never send email, user ID, photo content/name, prompts, payment-provider IDs, checkout tokens or credentials. Purchase amount comes from the verified receipt, not a price-label scrape or success query parameter. Test, pending and revoked payments do not produce purchase events.

## GA4 reporting setup

This repository adds event collection; it does not claim that GA4 Admin custom definitions or saved explorations have been created.

1. Open the GA4 property whose web stream measurement ID is `G-LSG4H51443`.
2. In **Admin → Data display → Custom definitions → Create custom dimension**, register event-scoped dimensions for `offer_engagement`, `offer_surface`, `offer_trigger`, `offer_source_path`, and `close_method`. Add `offer_id` if multiple offers will be compared. Do not register transaction IDs as custom dimensions.
3. In **Explore → Funnel exploration**, use indirectly-followed steps: `offer_view` → `offer_click` → `pricing_view` → `purchase`. Separate mobile teaser/modal surfaces where needed. Use a 30-minute window when analyzing the offer-attributed journey.
4. Compare pricing and purchase users for `offer_engagement=none`, `viewed`, and `clicked`; inspect desktop/mobile separately. Click-through purchase rate is correlation, not proof of incremental lift. A randomized holdout would be needed to measure causal improvement.
5. Check event names in Realtime after real traffic reaches the released code. Custom definitions and standard reporting may take time to populate. Configure/verify `purchase` as a key event in the intended property if conversion reporting requires it.

Client-side purchase events require the buyer to return and the order confirmation to run; ad blockers, cleared storage or buyers who never return can cause undercounting. The payment ledger remains authoritative for revenue and refunds. This change does not implement refund-event synchronization or subscription-renewal reporting in the absence of a browser return.

Official references:

- https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
- https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase
- https://support.google.com/analytics/answer/9327974

## Verification

- `npm run check` / `npm run build` and focused Node tests for attribution, sanitization, production gating, purchase deduplication and verified receipt amounts.
- Browser regression covers native navigation under an actual IndexedDB write lock, photo preservation, and bounded retries for unsaved photos.
- Browser funnel test loads the real Google tag against locally intercepted site/API fixtures. All collection requests are intercepted and answered locally; no simulated purchase or test revenue is sent to the production property.
