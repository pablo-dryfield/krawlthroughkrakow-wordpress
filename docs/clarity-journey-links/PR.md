## Summary

- Accept strictly validated native Clarity recording references through the existing storefront journey event stream; no schema or commerce changes.
- Add safe, deduplicated recording links and honest legacy lookup controls to the shared history timeline.
- Use that timeline in Payment Links, covering ongoing/recovered carts alongside manifest booking details and the executive booking dashboard.
- Keep project ownership, sampling and consent choices unchanged. Storefront capture is production-only and checks current analytics consent, including late callbacks.

## Validation

- `npm.cmd --prefix be run check`: passed.
- `npm.cmd --prefix be test -- --runInBand`: 342 suites, 3,466 passed, one skipped.
- `npm.cmd --prefix ui run check`: passed.
- `CI=true npm.cmd --prefix ui run build`: passed after removing two obsolete renderer imports. Generated build remains ignored and is not committed or deployed directly.
- `CI=true npm.cmd --prefix ui test -- --watchAll=false --runInBand StorefrontReplayLinks StorefrontActivityTimeline OngoingCartsPanel`: 3 suites, 20 passed.
- `CI=true npm.cmd --prefix ui test -- --watchAll=false --runInBand`: 177 suites, 1,224 passed. Required GitHub CI must also pass before merge.
- Storefront `npm.cmd test`: 48 passed; `npm.cmd run build`: passed.
- `php tools/tests/test_storefront_proxy.php`: 8 passed.
- Real shared timeline browser fixture: 13 passed at 390/1440px, including copy and layout.
- Real bundled tracking browser fixture: 11 passed, including withdrawal, deduplication, next-journey rotation, staging exclusion and passive metadata for an existing site-wide recording outside the storefront sample (no loader/upgrade).
- Existing cart browser regression: 18 passed at 390/1440px with quotes, checkout, activity and payments intercepted; zero real mutations.
- `git diff --check`: passed.

## Release and Limitations

The owner explicitly approved OmniLodge and storefront deployment together. Deploy this compatible backend/UI through the immutable release flow first, then the separately backed-up storefront payload via staging. No database migration, price/order/payment change, consent override or GTM/provider change.

Clarity's exported SDK `metadata` callback provides native IDs only after playback mode; this is not proof of successful upload or retained availability. New controls do not claim recording availability. Private dashboard playback has not been verified because an authenticated browser connection is unavailable. Links require existing project access; expiry, sampling, blocking and consent can prevent playback. Older visits get a copyable custom-session lookup ID, not an invented native recording URL.
