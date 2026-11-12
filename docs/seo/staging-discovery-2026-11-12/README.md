# Staging SEO Discovery And Indexing Guard

Historical first checkpoint. The later [catalog review](../staging-catalog-review-2026-11-12/README.md)
extends the current preview to 123 URLs and documents all 24 product decisions;
the original 119-URL evidence below is retained unchanged. Use the later explicit
build-report commands rather than overwriting this checkpoint's evidence.

Date: November 12, 2026. This is a partial T03/T10/D07 delivery, authorized
for staging only. Production, OmniLodge, the legacy Ecwid store, WordPress
settings, orders, carts, consent and tracking are unchanged. No ranking or
traffic improvement is claimed from a noindex staging release.

## Scope And Findings

The public staging catalog, regular pub-crawl product and NYE product had
`index, follow` metadata despite staging's existing `blog_public=0` setting.
The storefront's own robots filter removed WordPress's noindex directive.
This establishes an indexing-policy gap, not proof that Google indexed them.

The new staging-only MU plugin overrides that filter at the final priority
and adds `X-Robots-Tag: noindex, nofollow` to staging storefront requests,
including cart/checkout and resolved storefront query aliases. It changes no
storefront plugin files or production policy. API and Ecwid requests are outside
its scope. Search engines need to fetch a page to see its noindex directive;
robots.txt disallow is not a substitute. See
[Google's noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

Staging's native `/staging/wp-sitemap.xml` correctly returns 404 while its
public-blog setting is disabled. Instead of enabling public indexing, the
module supplies explicit noindex, no-store review endpoints:

- `/staging/seo-preview/sitemap.xml`: index of the two child previews.
- `/staging/seo-preview/content.xml`: 116 production canonical destinations.
- `/staging/seo-preview/storefront.xml`: the catalog and reviewed products 28/32.
- `/staging/seo-preview/robots.txt`: proposed future production discovery text.

The index links to the staging preview children; their entries are clean
production canonical URLs, never staging, aliases, attribution, cart or checkout
URLs. All 119 were read-only verified as final HTTP 200, self-canonical and not
noindex. The 116 content entries consist of the homepage and 115 registered
content routes. `/krakow-team-building-activities/` is held out because its
original declared canonical is missing; its page and existing feeds are not
changed. The remaining 22 catalog products await individual review.

XML uses the existing
[WordPress sitemap formatter](https://developer.wordpress.org/reference/classes/wp_sitemaps_renderer/).
Scoped filters omit links to staging's intentionally unavailable XSL endpoints.
No `lastmod` is invented: generated snapshots do not supply reliable significant
update dates. Clean canonical entries and accurate optional dates follow
[Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Production's existing `/wp-sitemap.xml`, six children including the Ecwid feed,
and root robots.txt remain untouched. The robots preview proposes keeping
`/wp-sitemap.xml` and adding `/sitemap-ktk.xml`. The latter is not activated on
production. These previews are not submitted sitemaps or a completed discovery
cutover.

## Source And Manual Release

- Reviewed scope: `tools/seo-discovery-policy.json`.
- Builder: `python tools/build-seo-discovery.py`. It verifies the complete
  registry, public product identities and all canonical targets before generating
  `ktk-seo-sitemap-assets/data.json`. Do not hand-edit this generated JSON.
- Runtime: `staging/wp-content/mu-plugins/ktk-seo-sitemap.php` and its two asset
  files. Exact staging home/site/host guards prevent production activation.
- Default local dry run: `./tools/publish-seo-discovery.ps1`.
- Actual scoped release: `./tools/publish-seo-discovery.ps1 --publish --report
  docs/seo/staging-discovery-2026-11-12/<new-report-name>.json`.
- The publisher has a fixed staging destination and exactly three owned files.
  It requires fresh payload-bound build evidence and matching deployed content,
  backs up first, independently checks hashes/runtime and protected saved state,
  clears only the staging storefront's origin cache, and removes expiring probes.
- FTPS remains manual, with the existing DPAPI wrapper. No hosting credentials
  enter GitHub, source or logs. GitHub checks never deploy.

Published version: `2026.11.12.1`, completed at
`2026-11-12T17:23:18.793938+00:00`. All three owned files match. All 2,162
protected staging hashes, 2,158 production hashes and the saved WordPress-state
hash are unchanged. The storefront plugin itself was not deployed.

| Payload File | SHA-256 |
| --- | --- |
| `ktk-seo-sitemap.php` | `fcc4a25d6841d07476eb0f832411fee7ca304b6002c976706b64d74d321369f5` |
| `ktk-seo-sitemap-assets/data.json` | `3544e1f24156c012a324f7ba6ef458d8719be475af72a492f0f561c9ad7edaa7` |
| `ktk-seo-sitemap-assets/.htaccess` | `fa28d421a28ed9b6f4b997d5119c2b8adbacff6e2dd119a179b71230f9664934` |

## Checkpoints And Recovery

- Pre-edit Git checkpoint: `0fbc78671c0f0fac19bbe34618eeb0c6b695cec3`.
- Scoped source archive: `deploy-backups/seo-discovery-before-20261112.zip`,
  SHA-256 `5bfd3e926476b5d9ef0b3b965649a971ef00ed077e890cc432261b628dbe62c8`.
- Successful release report: `staging-publish-complete.json`.
- Successful remote checkpoint:
  `deploy-backups/seo-discovery-staging-20261112-172302-778403.zip`, SHA-256
  `6b4dba33a3e75889dfc67b617716cacbf3465df8acfcc6d3fc40786f096399e0`.

Rollback only these three owned staging files using the recorded manifest;
deactivate/remove the entrypoint before restoring/removing dependencies. Never
restore database state or production files. Then clear only relevant staging
origin/edge caches and verify normal device URLs. Removing this module restores
the pre-existing staging indexing gap, so any rollback needs an explicit plan
for that safeguard rather than silently leaving indexable staging products.

Preserve the unsuccessful attempts too:

1. `staging-publish.json`: public catalog verification returned 403 before
   application writes. It now uses the same explicit public audit client headers
   as the successful builder; no WAF configuration was changed.
2. `staging-publish-retry.json`: file/runtime checks succeeded, but the shared
   retrying FTPS adapter lacked `rmd` for existing bounded origin-cache cleanup.
   Automatic rollback verified all owned files restored/removed. Its checkpoint
   `seo-discovery-staging-20261112-171955-572134.zip` has SHA-256
   `ea1f77adb2d6acb16b749305cb8d8c3dcc8dc29187b0c04ce1f38e45d27a7c48`.
   The adapter now delegates `rmd` through its existing retry mechanism. A test
   exercises the real adapter and unchanged bounded staging-cache cleanup.

## Verification

- Canonical public target audit: 119/119, with no script execution/submissions.
- Python publisher/builder/regression suites: 112/112.
- PHP sitemap/environment/indexing contracts: 65/65, now included in CI.
- Final cache-busted live checks: 171/171 (`origin-final.json`). These include
  native XML, headers, exact entries, HEAD requests, data protection, no production
  preview activation, unchanged production/Ecwid controls and three device types.
- Existing eight-page metadata pilot live regression: 236/236.
- Initial normal URLs: 138/147. The nine failures were stale Cloudflare catalog
  and product index/follow metadata, not a passing release. Preserve
  `clean-urls.json`; do not loosen the noindex assertions.
- After the owner's confirmed `krawlthroughkrakow.com/staging/store2/` prefix
  purge, normal URLs passed 156/156 at `2026-11-12T17:31:12.266371+00:00`
  (`post-purge-clean.json`). All nine catalog/product device responses were MISS.
- The repeat passed 156/156 at `2026-11-12T17:32:38.191067+00:00`
  (`post-purge-repeat.json`), with all nine catalog/product responses HIT and
  correct noindex/nofollow metadata. Cart/checkout remain correctly noindex;
  checkout's DYNAMIC cache status is expected, not forced to HIT.
- Tracked-file/build-input policy passed with all 358 required inputs. The exact
  staged checkout passed checksum-pinned Gitleaks8.30.1 with no leaks.

Cached responses may omit X-Robots-Tag at the existing edge layer, but must have
one correct noindex/nofollow HTML directive and never a contradictory header.
Fresh origin responses must supply both. XML previews always require noindex
and no-store headers. These source/HTTP tests are not field-performance,
consent-timing, Google indexing or private Search Console certification.

Reports/screenshots/checkpoints remain local and excluded from Git. Maintained
source, generated runtime data, isolated tests and this summary are tracked.

## Remaining Work

T03 is partial, not checked off. Review the remaining catalog, the one missing
canonical, inherited alias/noncanonical entries and legacy-feed equivalence.
Then prepare a separately approved production handler/discovery cutover and
Search Console submission/inspection. No legacy sitemap is deleted and no
Google account configuration changes in this batch. The broader roadmap,
storefront initial HTML, heading cleanup, reporting and content work remain.
