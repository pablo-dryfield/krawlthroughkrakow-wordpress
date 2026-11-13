# Reviewed Image Descriptions

## Scope And Progress

Website staging only. No production, storefront commerce, OmniLodge, plugin,
consent or account changes. D03 remains partial: automated checks do not replace
screen-reader, real-device zoom or third-party testing.

- [x] Before edits, clean source d6c3ca0 (same tree as merged a19ed25) archived in
  `deploy-backups/seo-reviewed-images-before-20261113.zip`, SHA256
  `8314725acdfdcf93b4a985fe0e518494de2882a1a238547a50447543b5f3e8d5`.
- [x] All nine original contact sheets visually reviewed:209 informative sources
  described; the three images in the held medical article are excluded.
- [x] Seven explicitly empty-alt linked photos separately inspected at full
  contact-sheet size. Other decorative empty alts and existing descriptions stay.
- [x] Canonical review bound to the unchanged asset manifest and actual original
  image SHA256s. Generators reject stale reviews, changed bytes, ambiguous IDs,
  held IDs, unsupported assets and paths outside the owned media directory.
- [x] Accessible names for formerly unnamed photo, partner and map links. Link
  destinations, visible text, original CSS/media, metadata and forms unchanged.
- [x] Scoped fixes for remaining copied-article contrast and inline-link cues.
- [x] Build2320/2320; semantic/source preservation371/371; loader14/14;
  Python177/177; exact FAQ screenshot comparisons12/12.
- [x] Stable-source234-view desktop/mobile audit:485 repeated node instances to14,
  all14 confined to the held article;232 clear views. Zero scan/page errors.
  Retain265 incomplete rule groups for manual work, not a conformance claim.
- [x] Source1636d89 required CI43424850952 passed both jobs. Content2072 hashes
  and homepage232 assets-only hashes independently verified on staging, saved
  WordPress state/storefront preserved; content helper removed. Later tooling/docs
  follow-up requires fresh CI before merge.
- [x] Origin content5848/5848, keyboard324/324, discovery243/243 and homepage10
  active asset hashes/current version tokens pass. Initial image comparison has
  all348 image arrays correct;72 named-link comparisons exposed a test-side
  unexpanded home-URL token, preserved in `image-attributes-origin.json`.
  The comparator now expands the actual token, with two explicit regression tests;
  no application edits were made for that harness issue.
- [x] Staging-only Cloudflare prefix purge accepted12:36:53.561UTC through MCP.
- [x] Corrected exact image/named-link comparisons348/348 each on origin, normal
  and repeat; all348 normal-repeat content/device responses HIT. No application
  bytes changed for the comparator correction.
- [x] Full origin, normal and repeat content5848/5848 each; all348 content/device
  variants HIT on repeat. Homepage three HIT and10 current asset hashes, native
  keyboard324/324, attribution31/31, discovery216/216 normal/repeat pass.
- [x] Complete normal-URL234-view browser audit agrees with local:14 held nodes,
  232 clear views,265 incomplete groups, stable source, zero page/scan errors.

## Source And Review Method

`tools/content-image-descriptions.json` is the reviewed source, not generated
website output. `content-image-descriptions.mjs` verifies its manifest and every
image's bytes before generation. `accessibility-semantics.mjs` fills only explicitly
reviewed missing alts and the seven separately approved empty-alt cases, then names
unnamed photo links from their meaningful descriptions. Prototype properties
cannot become descriptions. Running the revision twice is idempotent.

The209-image review was performed on the original nine diagnostic sheets in
`../content-accessibility-2026-11-13/image-review/`; seven linked photos are in
`empty-image-review/`. Several old headings do not match their photographs.
Descriptions follow the actual photo rather than asserting a venue, winter scene,
identity, current price or service claim. They are not generated from filenames.
No review dates, author names or visible article text are fabricated.

The medical article main body remains byte-identical. Its14 repeated findings
across two widths are six image-alt, four link-name, two main-landmark and two
region instances. Keep that hold visible instead of blanking image alts or hiding
the article to make the audit green.

## Evidence And Limits

Private raw reports/screenshots stay ignored. `local-all/report.json` binds five
local runtime/style hashes before/after the scan, each rendered HTML hash,
violations, incomplete checks and blocked non-read/provider requests. It found
no other automated violations, not proof of universal accessibility.
`source-final.json` compares all116 generated pages against detached a19ed25,
including exact medical body, original captured styles, metadata and visible copy.

The previous batch's two strict unchanged-logo raster mismatches and manual
assistive-technology/real-mobile/provider limits remain open. No tolerance changes
or mathematical pixel-identity claim. No messages, carts, quotes, orders or
payments are submitted by these tests.

First batch PR20 final d6c3ca0 passed required CI43422932990 and merged as a19ed25
with exact tree equality3a9913239605aae2b4c16a1fe608a35dfdcf8850. Its detached
reference was stopped/removed; this batch uses its own a19ed25 reference.

## Release Checkpoint

Content backup `ktk-code-pages-staging-20261113-122550.zip`, SHA256
`6abc6d92c9841e8b54be3f47bb697f29c2fe5134e6cb706f24e6093ca8b79da2`.
Homepage backup `ktk-homepage-shortcode-staging-20261113-122824.zip`, SHA256
`b47b0de0ed30a8ca105b17481e22b13ee936b8757df2b14ac1b3272bd07bf405`.
`pages-publish.json` / `home-publish.json` retain independent checksums/state
proof; origin/full normal/repeat content reports are in
`docs/code-pages/full-migration/reviewed-images-*-20261113.json` as they complete.
The discovery payload did not change and was verified, not redeployed.

Final local Python177 and shared JS54 pass. The visual roadmap was regenerated
after actual verification, keeping D03 partial. Source review/CI/merge are recorded
in PR21; GitHub does not deploy. New internal-link audit work is a separate batch.
