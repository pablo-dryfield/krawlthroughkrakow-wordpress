# Shared NYE Facts And Expiry Review

Read-only preparation, 13 November 2026, 20:02 UTC. No NYE application/hero,
product configuration, pricing, order, consent or production change in this review.

## Current Public Configuration

The public staging catalog exposes product32, `nye-pub-crawl-32`, with:

-250 PLN base price; actual selected booking/discount quotes remain authoritative.
- Fixed date31 December2026, groups17:00 and19:30.
- Meeting pointTBA, no address/instructions supplied.
- Two-hour open bar; buffet with vegetarian/vegan options; guides/photographer;
  entry to3 bars or clubs and welcome shots.
- Current important-information copy explicitly describes returning after midnight
  with a wristband. This is distinct from the regular crawl's corrected return-
  visit discount proof. Do not globally remove every occurrence of “wristband”.
- NYE currently says bring valid ID, whereas the owner described ID as recommended
  for the regular crawl. Do not silently merge these into one global rule.
- Its description still mentions Champagne. This is current configured copy, not
  separate physical/operations verification. Existing guides correctly defer
  inclusions to the current event offer rather than independently inventing them.

Source: the public GET `/staging/wp-json/ktk-storefront/v1/products`, product32's
`price`, `config.content`, `config.startTimes` and `config.availability` fields.
The first exploratory read used absent top-level content fields and returned no
offer detail; the nested configuration above is the actual reviewed source.

## Remaining Consistency Work

- Shared reviewed data currently cover the date, groups and TBA, but the original
  homepage hero and sales-page countdown still have independent literals.
- Keep exact vector artwork, current layout and distinct regular/NYE identities.
  Share real facts without inventing a venue itinerary, city programme or future
  campaign dates. No automated rollover to an unconfirmed2027 offer.
- Define and test an honest past-event/next-dates-TBA state separately from booking
  availability; do not invent an operational booking cutoff or alter paid orders.
- Two C01 metadata descriptions still contain generic every-night/pink-sign
  language. Their current batch intentionally preserves metadata; a next scoped
  facts/description revision should qualify regular versus special-event guidance
  and use the same confirmed pink umbrella. It will require fresh discovery
  bindings, not a silent hand edit of generated definitions.
- Joining/FAQ content uses “wristband” only as obsolete regular-return proof; NYE
  event admission/re-entry has a different purpose. Preserve that distinction.

These are remaining C02/G01/T05 decisions, not a completed campaign or release.
The current website work stays staging-only.
