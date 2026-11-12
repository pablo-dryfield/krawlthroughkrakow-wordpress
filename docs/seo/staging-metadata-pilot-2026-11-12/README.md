# Staging SEO Metadata Pilot

Date: November 12, 2026. Scope: first small T05/G01/T10 delivery, not completion
of the entire SEO roadmap. Production and OmniLodge are unchanged. No rankings
or search-traffic improvement is claimed from an intentionally noindex staging
release.

## What Changed

Eight missing page descriptions now come from the reviewed source
`tools/code-pages-seo.json`, not hand-edited generated PHP or WordPress settings:

| Staging Path | Purpose |
| --- | --- |
| `/staging/about-us/` | Operator identity and experience |
| `/staging/about-us/how-to-join/` | Joining instructions |
| `/staging/meeting-point/` | Regular crawl meeting instructions |
| `/staging/new-years-eve/` | Confirmed current NYE offer |
| `/staging/krakow-nightlife/` | Nightlife advice hub |
| `/staging/wheres-the-cheap-places-to-drink-in-krakow/` | Existing budget-drinks guide |
| `/staging/krakow-stag-do/` | Stag group planning and enquiry |
| `/staging/krakow-hen-do/` | Hen group planning and enquiry |

These roles support the plan's intent map; they do not constitute a complete
GSC overlap investigation or authorize canonical consolidation. The homepage
remains the main brand/pub-crawl landing page; product pages handle booking.

The resolver accepts only a description and a documented role for explicit
registered content routes. It rejects markup, duplicates, unknown/protected
routes and attempts to add title/canonical/robots/redirect fields. The builder
and verifier share that source. Rebuilding retains all other original page
metadata/indexing policies. Existing titles, visible content, layouts, images,
links, schema, commerce, consent and tracking are unchanged.

The NYE description uses the confirmed December 31, 2026 date and 5 PM/7:30 PM
groups, keeping its unconfirmed meeting points separate from regular Adam
Statue/9 PM instructions. It does not promise named venues or introduce a hero
price. Older guide facts/prices are not represented as freshly verified.

Google may choose a different snippet. This is a page-summary pilot, not a
ranking guarantee or exact-character-count exercise. Guidance checked:
[Google Search Central: snippets](https://developers.google.com/search/docs/appearance/snippet).

## Checkpoints And Deployment

- Pre-SEO Git checkpoint: `18502b658bef4d7396a1d8f0ff182ed0d5b00c99`.
- Pre-edit source ZIP: `deploy-backups/seo-pilot-before-20261112-1730.zip`,
  SHA-256 `38a6430b02aaba3dd1db65f187a040beaa40e98d75bca854190ac950b839dad6`.
- Manual staging-only publisher:
  `tools/publish-code-pages.ps1 --full --incremental --report docs/seo/staging-metadata-pilot-2026-11-12/staging-publish.json`.
- Published at `2026-11-12T16:33:29.730547+00:00`. All 1,915 owned payload
  hashes match independently. Exactly eight remote page definitions changed;
  their only semantic change is `description`.
- Remote changed-files backup:
  `deploy-backups/ktk-code-pages-staging-20261112-163304.zip`, SHA-256
  `da420fd3cd7922406da8cef25b9b38b4d81736ce19897887a81bcfe4b69933a1`.
- Original WordPress state, protected homepage/storefront hashes and the legacy
  store definition are unchanged. The expiring deployment helper was removed.
- No production files, settings, cache or account configuration was written.
  Eight production control requests still have their original empty
  descriptions and original title/indexing policy.

Rollback is scoped to these eight generated page definitions using the recorded
backup and the guarded staging publisher. Restore the matching metadata source
and builders in a reviewed change before rebuilding. Never restore WordPress
data, payment/order records or an unrelated deployment archive to undo metadata.

## Verification

- Full local build: 116 routes, no missing sources or build errors.
- Build/content/metadata verification: 1,856/1,856 checks.
- PHP routing/indexing integration: 746/746; forms: 31/31, mail stubbed.
- Isolated publisher unit tests: 93/93; metadata-specific tests: 6/6;
  booking destination contracts: 8/8.
- Local no-JavaScript public-source checks: 196/196, including four screenshots
  at 390px/1440px with no horizontal overflow.
- Live cache-busted staging pilot: 236/236, including production controls.
- Normal staging URLs: 236/236, all 24 route/device responses MISS.
- Repeated normal staging URLs: 236/236, all 24 responses HIT.
- No additional Cloudflare purge was needed or requested.
- Full 116-route, three-device regression scan: pending final result.

Raw reports/screenshots stay in this directory locally, excluded from Git under
the repository evidence policy. They include `origin.json`, `clean-urls.json`,
`clean-repeat.json`, `local.json` and `staging-publish.json`.

The first new live text comparator failed 21 checks because Cloudflare replaces
the footer's public email with `[email protected]` in transport, whereas the
saved rendered source contains the decoded address. Preserve
`origin-initial-content-check-failure.json` and `origin-content-diagnostic.json`.
The checker now decodes only `data-cfemail` values and compares the complete
remaining text, including the actual contact address. No footer/section is
masked or removed, no application bytes were changed to resolve this harness
issue, and a wrong decoded email still fails the comparison.

## Remaining Work

The production audit still has 77 description gaps; this staging pilot resolves
eight of them only on staging. The other 69 descriptions, richer social cards,
titles where justified, sitemap/discovery, headings, storefront initial HTML,
article refreshes and the remaining roadmap are not complete. M01 and full M02
measurement work still require the separately approved GSC/OmniLodge scope.
The 128-URL read-only baseline was refreshed locally on November 12 with zero
transport errors and the same three legacy 404s. No redirect policy changed.
