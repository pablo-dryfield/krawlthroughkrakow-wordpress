# Public Storefront HTML

## Scope And State

Staging-only T02/T08/G01/T10 work. The catalog and all 24 public products now have
real server-delivered headings, existing descriptions/inclusions, actual available
photos and practical details before JavaScript. Public PHP and React use the same
validated fallback data, including the existing Bubble Football content. Missing
offer facts/photos remain missing; no availability, price or operational facts
were invented. The [catalog review](../staging-catalog-review-2026-11-12/README.md)
still governs its 18 held discovery decisions.

Native product links work normally, including modifier-clicks; ordinary clicks
retain SPA navigation. The initial content remains visible while React loads,
then is removed as the ready application is revealed. The no-JS view offers a
contact link, not a pretend working booking form. Interactive checkout still
requires JavaScript. Catalog's pre-JS title is descriptive; the existing client
hero title `Your Story.` is deliberately retained, not an SEO heading rewrite.

Cart, checkout, confirmation and legacy Ecwid routes never get this public copy.
Existing cart, journey, attribution, consent, Stripe and pricing logic is
unchanged. The exact staging home/site guard prevents the new renderer activating
on production. No production/OmniLodge deployment, account change or sitemap
submission is authorized by this batch.

## Sources And Deployment

Public renderer: `includes/class-ktk-storefront-public-content.php`; shared data:
`includes/product-content-fallbacks.json`; client handoff: `frontend/src/public-content.js`.
The core class loads its new dependency; main plugin entrypoint remains unchanged.
The plugin payload now explicitly owns **12 files**, not ten. Frontend source and
node_modules are not deployed. Existing production promotion was updated to know
the dependency files, but was not run and must not be used to bypass staging-only
approval or the current renderer guard.

`tools/publish-storefront-staging.ps1` is manual FTPS/DPAPI, staging only, default
local dry run. Publishing requires fresh passing payload-bound browser evidence,
an exact reviewed baseline (or explicit verified previous staging release), a
verified ZIP backup, protected state and production hashes. Upload dependencies
before core/template; scoped rollback restores old readers before removing new
dependencies. Temporary probes are token-protected, expiring and removed. No
saved WordPress settings are rewritten. GitHub checks never deploy.

Pre-edit source checkpoint: `deploy-backups/seo-public-html-before-20261112.zip`,
SHA-256 `0f70d16a3c12b820d0d4d253a764830cd325c43580d4fec72b927949430e39e0`.

Initial release completed 18:33:18 UTC: 12 hashes match, seven changed; main and
four fonts unchanged. All 2,155 protected staging hashes, 2,158 production hashes
and saved WordPress state match; helper removed. Only staging/store2 origin cache
was cleared. Backup `storefront-public-staging-20261112-183237-902901.zip`, SHA-256
`c9b54364508ccb0e24a0a2b74d50c93c3168e8d0aa493efe556aa5489fabe79f`.

The `.2` optimizer follow-up completed 18:44:13 UTC with the same guards. It marks
only the owned storefront stylesheet `data-no-minify="1"` and the first product
photo `data-no-lazy="1"`/high priority. No saved optimizer options, unrelated
styles or tracking/consent exclusions change. Backup
`storefront-public-staging-20261112-184344-560406.zip`, SHA-256
`7f07a3a7831a7c1b27605082c6e61c6f15493ccdd02fe98f8754659556328ef1`.
Final no-JS booking-heading contrast follow-up completed at 19:00:31 UTC,
again verifying all 12 owned, 2,155 protected staging and 2,158 production hashes
and saved state. Only CSS changed to
`c6dd72fb2278b078ee6bf7f85bb443cbfff3048dd717ec749a60ba7c4e4ff4dc`;
JS remains `9929845bd3ed45c9eea45235feced9781d15144e72ea4570f2b7e295d5e2cf56`.
Backup `storefront-public-staging-20261112-190015-110800.zip`, SHA-256
`8b739a792b73d7e252b3bd12b69508b66a3d6a6e06a535f02ccb14e606c72d07`.
New payload-bound local browser evidence is `heading-followup.json` (811/811).

## Verification And Honest Limits

- Local matrix: **811/811** across all 24 products/catalog, four no-JS widths and
  two JS widths, native navigation, identical public-data resolution, responsive
  bounds and eight selected real-photo comparisons. Actual app geometry is
  retained in all eight; strict pixel equality varies (four or five of eight).
  Do not call this a fully pixel-identical screenshot suite; photo-region
  differences have not been conclusively attributed to a specific cause.
- Cart regression: **18/18**, isolated, no real mutations. Frontend unit suite:
  **54/54**; public PHP contracts **39/39**; existing proxy **8/8**.
- `.2` origin source contracts: **692/692** across catalog plus all 24 products on
  desktop/Android/iPad, including current renderer, owned CSS exclusion and real
  non-lazy first images. Production renderer/assets remain original.
- Live browser checks cover catalog, regular crawl, NYE and Bubble Football with
  and without JS at 320/390/768/1440. They block all mutations and external
  tracking; this is not an end-to-end payment, consent or field-CWV certification.
  Final heading-follow-up origin run passes **240/240**, with zero application
  errors/mutations and 16 inherited Facebook errors recorded separately. Its
  screenshots verify the corrected no-JS heading colour/font and real first
  photos. The initial pre-correction screenshot remains in the earlier report.
- Final normal/cache-repeat verification awaits the staging-prefix purge.
  The first final clean-URL attempt, `final-normal-urls.json`, passes only
  311/692: all 75 responses are HIT, desktop still has the pre-release template,
  and Android/iPad mix previous revisions. This genuine failure is preserved;
  `.2` origin checks do not clear or validate Cloudflare's cached variants.
- Full offline Python suite: 137/137; shared JS contracts 16/16; code-page PHP
  746/746, form contracts 31/31, Clarity policy 26/26, discovery 65/65 and shared
  integrations 69/69. These do not certify third-party tracking or field CWV.

Preserved failures are important: `local.json` originally passed 775/811 due to
an incomplete preview body class, transformed-text/font timing assumptions and
fallback-font clipping (the latter received a bounded wrapping improvement).
The first unit test used a wrong relative PHP-fixture path; it was corrected.
`clean-urls.json` passed only 311/617 before the optimizer follow-up, with mixed
stale edge responses and existing CSS/lazy-load rewriting. Do not overwrite it.
Initial live browser report passed 224/228: it assumed the pre-JS catalog heading
should equal the deliberately unchanged client hero title. All 16 pre-existing
`fbq is not defined` integration errors are retained separately in later runs,
not called fixed. Screenshot review also identified the new contact-panel
heading's inherited dark colour; that is the focused final CSS correction.

## Next Steps And Rollback

Complete final source/browser/cache checks, owner review and separate production
approval before any live promotion. Preserve original plugin backups. For this
batch's rollback, restore the previous template/core before removing newly added
dependency files, then restore the matching compiled assets and clear only the
affected staging caches. No database restore is needed.

This improves the availability of public content to non-JS readers/crawlers, not
a promise of rankings or measured speed gains. Primary guidance:
[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[WP Rocket stylesheet exclusions](https://docs.wp-rocket.me/article/1765-minify-css-files),
[WP Rocket per-image lazy-load exclusions](https://docs.wp-rocket.me/article/15-disable-lazy-load-on-specific-images),
[WordPress style tag filter](https://developer.wordpress.org/reference/hooks/style_loader_tag/).
