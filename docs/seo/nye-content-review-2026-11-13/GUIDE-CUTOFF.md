# Remaining NYE Guide Promotion

In progress, staging-only. The same approved 1 January 2027 noon Warsaw cutoff
must cover the remaining checkout promotion in `/new-years-eve-in-krakow/`.
The hero and sales-page automation is already verified; this is a small extension,
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
navigation to the sales page's future notice. PHP118/118 includes all previous
hero/sales-page contracts plus the guide; shared JS123/123, Python184/184,
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

Both guarded publisher dry runs validate the exact source. Not deployed yet:
required CI, guarded staging/origin checks, scoped purge and normal/HIT checks
remain. The complete public catalog review still selects the same6 products and
catalog,123 intended URLs; only this definition's sitemap binding is refreshed.
The stale pre-cutoff no-JS cache boundary documented in `PROMOTION-EXPIRY.md`
still applies; no cron, future purge task or Cloudflare setting is installed.
