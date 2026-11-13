# Jazz Guide: Scoped Venue Facts

## Scope And Progress

First C05/C08 factual batch, staging only, on the existing
`/jazz-bars-in-krakow/` URL. This is not a full rewrite or clearance of every
venue/history statement in this article or the other music guides.

- [x] Before application edits, archive88da989 tracked source in
  `seo-jazz-facts-before-20261113.zip`, SHA256
  `069bd445b7a152512c2395a9942e77a8d78d24c5b278855e9ebb062c6fe54b6f`.
  Detached original reference retained for byte/DOM comparison.
- [x] Recheck primary Harris, PIEC Art and U Muniaka pages on13 November2026.
  Remove unsupported Harris birthplace claims from its heading, contents and
  three paragraphs; replace U Muniaka's unsupported1950s claim. Explain actual
  programme/seat-checking and distinguish concert tickets from a pub crawl.
- [x] Eight exact, atomic text edits plus a visibly scoped three-venue check
  note. Preserve URL, original H1/title/byline/18 July2023 publication, all15
  section fragments, original photos/attributes, schema/metadata/captured CSS,
  forms/shells and115 other page bodies. No redirects or article consolidation.
- [x] Native link to the existing nightlife hub and matching pub-crawl product28;
  no invented concert inclusion, admission price, lineup or personal visit.
- [x] Article-only16px mobile header/body inset keeps text clear of the visible
  floating Book Now tab; no global control/font/layout or hiding change.
- [x] Local build2320/source381/native browser74/Python180/shared JS77/PHP760/
  forms31 stubbed pass. Four axe views0 violations/4 incomplete groups, no page
  errors; actual phone screenshot inspected. Not full accessibility conformance.
- [ ] Required CI, guarded staging deployment and live origin/normal/cache checks.
- [ ] Add the verified batch to the roadmap only after staging checks pass.

## Sources And Limits

- [Harris operator history](https://harris.krakow.pl/o-nas/) supplies Rynek Glowny28,
  January1997 and a mix of musical styles. This does not substantiate the old
  birthplace claim or guarantee a future programme. No copied superlatives.
- [PIEC Art operator page](https://www.piecart.pl/?lang=pl) distinguishes its bar
  and cellar concert/bar spaces and displays dated events. No individual gig
  price or time becomes a general admission rule.
- [U Muniaka programme](https://jazzumuniaka.club/) identifies Florianska3 and
  dated shows. Its [reservation terms](https://jazzumuniaka.club/regulamin/)
  distinguish ticket and seated-place reservations. No replacement founding
  year is invented from conflicting secondary accounts.
- Piano Rouge's operator site was read as part of wider research. Alchemia's
  English page was inaccessible; HEVRE redirected to a blocked Facebook login.
  These failures are not evidence of closure. Their article paragraphs are
  explicitly outside this batch, not newly certified recommendations.

## Maintainable Source And Guards

`tools/content/jazz-facts.json` owns eight original-text/replacement pairs.
`tools/jazz-editorial.mjs` binds original capture SHA256
`64a6ab3ac4e3b25e71f6d97f1aafdb90b64e2760d5b116454e35f1b04ecebb1c`,
the article identity/publication, exact selectors and reviewed destinations.
Every target/markup is validated before any edit; stale/duplicate text, scripts,
new images, handlers, unknown selectors and foreign links fail without partial
changes. Actual DOM fixtures verify these negatives and idempotency. Unrelated
articles, especially the medical hold, return without mutation.

Only content HTML and one scoped runtime-CSS rule differ in the application
payload. All page-definition/discovery bytes stay exact, so no discovery/home/
storefront publisher is required. The immutable asset/image-review manifest
remains intact. No production, commerce, OmniLodge, consent, plugin or account
change; no messages/orders/quotes/payments are submitted.

Preserved initial diagnostic: the first build rejected the mobile rule after
the generated shared-accessibility end marker, before building pages. Rule moved
to the existing pre-marker manual section; guard unchanged, full116-page build
then passed. No malformed intermediate payload was deployed.

## Next Work

Finish current-primary checks for the remaining jazz venues, then broader music
and overlapping-techno intent work described in [REVIEW.md](REVIEW.md). Keep both
techno URLs until an evidence-backed decision; this batch does not consolidate,
delete, deindex or make the full C05 ticket complete.
