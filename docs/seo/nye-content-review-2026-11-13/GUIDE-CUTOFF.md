# Remaining NYE Guide Promotion

Verified on staging only. The same approved 1 January 2027 noon Warsaw cutoff
must cover the remaining checkout promotion in `/new-years-eve-in-krakow/`.
The hero and sales-page automation was already verified; this is a small extension,
not a change to store availability, orders, consent, pricing or a new event.

## Checkpoint

Branch `codex/staging-nye-guide-cutoff` from PR34 merge `a4f7e33`. Final source
`d45c88f5a9c39df5545cc5a9d7fd9f4fd9aacf8a` passed both required CI jobs in
run `43515556329`; merge and feature trees matched exactly. Its task reference
servers, clean worktree and completed local/remote branch were removed in order.
Root preview servers on 5184/5185 remain available and return HTTP200.

Before edits, all 3,149 tracked files, ZIP CRC and every source byte were verified
in `deploy-backups/seo-nye-guide-cutoff-before-20261113.zip`, SHA-256
`f99a27411ee7c8338d114ced1e6b9cee0d57211716e31ec7337adf761f6296d1`.
Own clean reference: `deploy-backups/seo-nye-guide-baseline`.

## Scope

The complete current content inventory contains NYE product32 links only in the
sales page and this one guide. The homepage hero is separately managed and already
covered. This guide has one exact CTA under its existing `#book-nye` heading.

The build recipe must validate its exact location, text, destination and count
before any mutation. Before the cutoff, its visible text and destination remain
exact. At/after cutoff, show **Next NYE dates to be announced** and link to
`/new-years-eve/#nye-updates`. Keep its heading/anchor, article text, images,
publication/byline, descriptions, sharing metadata and schema unchanged. No future
Article date or event is invented. Other guide and regular-product links remain.

The existing native lifecycle code is reused without a new runtime or CSS.
The server renderer admits only the two exact owned page identities and leaves
article head metadata unchanged when no alternate head is compiled.

## Local Verification

Build116/116 and build verification2,320/2,320 pass. The immutable original asset
manifest remains `f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691`.
Source preservation2,309/2,309 proves only this body/definition and the exact two
renderer conditions changed: all other115 bodies/definitions, the entire home
payload, runtime JS/CSS, media, forms and protected sources remain exact.

Focused browser checks260/260 include nine positive/negative DOM fixtures with
atomic rejection, four widths before/at/after, cached JS, fresh server with and
without JS, slow browser clocks, unchanged head metadata and actual native
navigation to the sales page's future notice. Final PHP143/143 includes all
previous hero/sales-page/guide contracts plus a complete registered-page link
inventory: all nine content checkout controls are covered and none remains
after the cutoff. The hero is separately verified. Shared JS123/123, Python184/184,
existing PHP763/763, stubbed forms31/31 and attribution136/136 pass.

All four current layout/text/typography comparisons are exact. The strict PNG
matrix is8/9, retaining one768px photograph difference (73,525 differing pixels
inside77,257..690,666). All original image bytes and geometry are exact; the
actual images were inspected and no visible framing/content change was found.
The unchanged-reference control is also8/9, but its24 differing pixels are in
the320px menu icon, not the same photograph. Neither is a total pixel pass;
no tolerance, mask, photo, artwork or CSS was changed to hide the differences.

Current and future four-view axe matrices each have zero violations and eight
incomplete rule groups. This is not full conformance, provider or consent proof.
The owner explicitly kept the medical article on specialist-review hold; its
body/definition remain exact, and that decision is recorded separately.

## Staging Release

Application `6e0f369d39b9f4a27b0d19d867578b8c0ba7e14f` / PR35 passed both required
CI jobs in `43518129421` before either guarded publisher ran. No application
bytes changed afterward; final source updates contain tests/docs only.

- Content2,073 independent hashes match; saved WordPress state, homepage and
  storefront unchanged, helper removed. Completed22:20:12UTC. Backup
  `ktk-code-pages-staging-20261113-221952.zip`, SHA-256
  `802f7f9ca20278f7e7080f0a2663d5cd6f91130806855b88471ff244b8046555`.
- Discovery3 hashes match; protected2,322 staging /2,158 production files and
  saved state unchanged, helpers removed. Completed22:20:59UTC. Backup
  `seo-discovery-staging-20261113-222049-401130.zip`, SHA-256
  `6b12e5ab38c642c33b5b57928827c07a6b0a648eeeb0d692a69dc9fb2d3bc7c7`.
- The public catalog review still selects the same6 products and catalog,123
  intended URLs. Only this definition's sitemap binding was refreshed.
- Full6,193 origin22:30:26UTC / normal22:32:43UTC / repeat22:37:58UTC all pass,
  zero transport retries. Normal345 HIT /3 MISS; repeat348/348 HIT, all119 assets
  current. The source scan includes the held article's unchanged original state.
- Focused browser98/98 origin and98/98 normal pass, including actual native
  arrival at the future sales-page notice. Future origin/normal four-view axe
  each have zero violations and eight incomplete rule groups. Mobile screenshots
  inspected; attribution136/136 and discovery243 origin /216 normal /216 repeat
  pass. Unchanged homepage all ten active assets match on all three HIT variants.
- After exact zone/account validation and current API-spec retrieval, Cloudflare
  accepted only `krawlthroughkrakow.com/staging/new-years-eve-in-krakow/` at
  `2026-11-13T22:31:14.286Z`, `success:true`, result ID
  `4303f6a45f815c5570bb4bba5f86a423`. No other staging path, store or production
  prefix was purged. No production, consent, commerce, account-setting or
  OmniLodge change.

Both roadmaps now record24 verified staging deliveries. This is not the entire
plan completed. Rollback restores only the three changed content payload files
and previous discovery binding from their checkpoints, preserving unrelated
files and saved data. Never restore a global database for this file-only change.

The stale pre-cutoff no-JS cache boundary documented in `PROMOTION-EXPIRY.md`
still applies; no cron, future purge task or Cloudflare setting is installed.
