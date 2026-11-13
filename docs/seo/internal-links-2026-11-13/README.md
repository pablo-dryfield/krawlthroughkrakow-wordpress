# Internal Discovery And Group Planning

## Scope And Progress

Staging-only continuation of T07/T08/C06/D05. No production, storefront commerce,
OmniLodge, plugin, consent, form-backend or account changes. Group links are not a
claim that every old article/venue/package has completed its separate fact check.

- [x] Before application edits, full tracked source58b62f7 archived in
  `deploy-backups/seo-internal-links-before-20261113.zip`, SHA256
  `10b5c2dc6b9e73d1f04b10312aa9b002d9db2bb8acebdc1e2f20df0c651f495b`.
- [x] Read all142 public initial-HTML pages: homepage,116 migrated routes,
  catalogue and all24 products from the complete public catalogue. Bind registry,
  catalogue and each response hash. No scripts/resources or business writes.
- [x] Baseline:6,182 known link edges; stag, hen and other-crawl directory have
  zero native incoming pages. Six tag archives also unreachable. One observed
  noncanonical regular-crawl link path; empty Go-Karting CTA separately confirmed.
- [x] Guarded source changes: five short contextual paragraphs, matching product30
  destination for the empty Go-Karting button, clean accessible name preserving
  its visual arrow, and exact incoming regular-crawl slash normalization.
- [x] Local graph:6,206 edges, no unknown page paths. Stag/hen reachability depth2;
  directory depth3; all24 products within depth2. Only six tag archives remain.
- [x] Final source comparison381/381, build2320/2320, targeted28-view axe audit
  zero violations and10 canonical/graph unit tests pass. Original article copy,
  forms, page metadata/schema, captured CSS/media and medical body preserved except
  the explicitly added paragraphs/corrected button. Final keyboard/reflow/control
  browser checks284/284 pass, including the clean Go-Karting accessible name.
- [x] Initial02bc7d4 required CI43429979704 passed both jobs; guarded staging
  content2072 and home232 assets-only hashes verified, saved state/storefront
  protected and content helper removed. Initial origin/normal full content5848
  each, focused native browser304 each,142-page graph and discovery216 pass.
- [x] Narrow product30 event-map follow-up602d058: CI43432108961 both jobs pass;
  new4 bootstrap contracts, refreshed build2320, Python177/shared JS65 pass.
  Guarded content-only deployment2072 hashes, unchanged saved state/home/store,
  helper removed. No second homepage change.
- [x] Final origin5848/5848, focused browser304/304 and attribution38/38 pass.
  Final normal5848/5848, browser304/304, attribution38/38,142-page graph6206
  edges/no unknowns/same6 held tags, discovery216 and current10 home assets pass.
- [x] Final warmed content5848/5848, all348 page/device variants HIT; discovery216
  and homepage3 HIT/current10 active hashes pass. Final source381 and JS65 pass.
- [ ] Final delivery-document CI/merge and temporary reference cleanup.

## Findings And Changes

| Page | Initial Native Incoming Pages | Local Candidate | Native Depth |
| --- | ---: | ---: | ---: |
| `/krakow-stag-do/` | 0 | 2 | 2 |
| `/krakow-hen-do/` | 0 | 3 | 2 |
| `/otherbarcrawls/` | 0 | 1 | 3 |

`stagshens` now links directly to the existing stag/hen pages. Three relevant
planning articles link to those pages; the European crawl article points to the
existing operator directory. No repeated keyword-heavy footer links or invented
group sizes, prices, venues, credentials or offers were added. Six isolated tags
need an intentional archive/content decision; no automatic noindex, deletion or
forced linking is performed to make a crawler score green.

The original blank `et_pb_button_16` belongs to the Go-Karting row. It now reaches
the existing product30 checkout section, not another tour or a generic enquiry.
Only the observed incoming `/store2/pub-crawl-28` path gets a trailing slash;
query/fragment attribution is retained exactly. No storefront route, legacy-store
setting, checkout implementation, quote, cart or price changes. Regenerating the
homepage also applies nine meaningful gallery link names from its existing alts;
strict source comparison proves those attributes and the canonical link are its
only body changes, with original captured CSS exact.

## Method And Limits

`tools/internal-link-graph.mjs` distinguishes canonical-host staging links from
external, non-HTTP, protected and media destinations. Query/fragment values are
never stored. Exact case/path identity is retained; only explicit registry aliases
resolve. Duplicate/self links do not inflate distinct incoming-page counts.
Native followable anchors count for reachability; script-only modules and nofollow
anchors do not. Six unit tests cover these boundaries and alias cycles.

`audit-internal-links.mjs` parses actual initial HTML with scripts/resources off.
It distinguishes shared shells/footer bands from contextual links, including21
copied footer bands inside content wrappers. The deliberate sitewide staging
nofollow guard is ignored only for structural reachability; this is not a Google
crawl/indexing verdict or proof all client-rendered states behave identically.
Local previews are explicitly labelled and may omit the production renderer's
indexing metadata; public staging still must contain noindex or the audit fails.
Products are discovered from the public catalogue, not assumed from the sitemap's
smaller editorial selection. Protected Ecwid/forms/commerce URLs are not crawled.

`contextual-links.mjs` asserts the original source paragraph/row before edits,
verifies existing additions on repeat and refuses silently changed destinations.
Builders and source/visible-text verification use the same reviewed policy.
Homepage/article metadata, publication history, original photos and statue SVGs
are unchanged. Existing enquiry fields/actions/recipients/backends remain.

## Preserved Diagnostics

- `graph-first.json` incorrectly interpreted an empty href as a literal null path;
  corrected native attribute extraction and a negative unit test fix that
  analysis artifact. The independently confirmed empty activity CTA is real.
- `graph-local.json` correctly rejected the loopback homepage's missing renderer
  noindex. Only explicitly configured previews now report that omission instead
  of requiring WordPress metadata; public staging guard remains fail-closed.
- `local-browser-final`220/272 focused links before first-Tab checks and therefore
  changed the starting point. Native first-Tab/skip tests now run first, unchanged.
- Two280/284 runs exposed the legacy pseudo-arrow's literal5 in the accessible
  name, not a wrong destination. The repaired control now gets an exact meaningful
  aria-label, preserving the visual arrow. Retain those failures and verify again.
- Initial staging attribution37/38 correctly exposed the missing product30 entry
  in the existing consent-gated event allowlist. UTM/destination/no-submission and
  denied-consent assertions all passed. The narrow runtime follow-up adds only
  that known route/ID; four bootstrap tests retain foreign/unknown rejection,
  consent withholding, unavailable-storage behavior, existing IDs and one loader.
  Before the follow-up, origin/normal content5848 each,304 browser,142-page graph
  and discovery216 passed; preserve as earlier-payload evidence, not final proof.

Previous medical, manual assistive-technology/provider and strict unchanged-logo
raster limitations still apply. No conformance, pixel-identity, traffic or ranking
improvement claim. All raw reports/screenshots are ignored, not erased.

Previous image batch PR21 finaleb9ce7a passed CI43427701904, merged58b62f7 with exact
tree9d8f92fa38a258e9998fe77a08292d48b0e04f42. Its temporary baseline was stopped
and removed before deleting its completed branches. This batch has its own58b62f7
detached source reference; clean it after verified merge/release.

## Initial Staging Checkpoint

Content backup `ktk-code-pages-staging-20261113-130307.zip`, SHA256
`79cae899adfd7f44de4ac22bc7c39c7e4d0096bb21c4d44f6b5c10c90763a8db`.
Home backup `ktk-homepage-shortcode-staging-20261113-130619.zip`, SHA256
`36f2dc6ecaee9580d2561700e238f7e05f5d0060782d4e2166c9cd9e86668811`.
Staging-only MCP prefix purge accepted13:08:18.559UTC. This checkpoint precedes
the event-map follow-up; preserve all original reports. No new homepage payload
is required for that one-line content-runtime correction.

## Runtime Follow-up Checkpoint

Content-only backup `ktk-code-pages-staging-20261113-131939.zip`, SHA256
`3e4c3dc4d5e336dbfba165e9ec2cba8419392ac419631d101235a6ae2f2083c3`.
Publisher completed13:19:57UTC with all2072 hashes verified and saved WordPress
state, homepage and storefront unchanged. Helper removed. Runtime change adds
only the known Go-Karting route/ID to the existing allowlist; rejection still
withholds that event and no other consent behavior changed.

Second MCP staging-prefix purge accepted13:23:14.337UTC. Origin and clean full
reports are `internal-links-origin-final-20261113.json` and
`internal-links-clean-final-20261113.json` under the migration evidence directory;
earlier-payload reports and the real37/38 failure are retained. Warmed repeat
`internal-links-repeat-final-20261113.json` passes5848/5848 with all348 content
variants HIT. Homepage all3 variants HIT with current10 assets; discovery normal
and repeat216 each. Final source381 passes. All finite publisher/test sessions
are closed; local previews remain in use for the following editorial work.
