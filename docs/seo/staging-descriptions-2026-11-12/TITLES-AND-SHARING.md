# Titles And Sharing Follow-up

Read-only preparation13 November2026. No title, head tag, page body or production
file changes in this preparation. Next T05 scope will be separately checkpointed.

The116 generated page definitions all have empty inherited `metadata` strings.
The staging renderer supplies four basic Open Graph tags as a fallback, but no
social image, site name or Twitter card. The current production renderer retains
its original captured policy; this audit does not silently change that policy.
Homepage already has its own Open Graph/Twitter implementation and is not part
of the proposed content-only batch.

There are48 existing source-backed article images in the current schema graphs.
They are candidate sharing images, not permission to invent an image for the
remaining articles. The health article stays held. Existing article images,
alt descriptions and exact localized asset hashes should be reused where valid;
do not substitute an unrelated logo or illustration for a real featured image.

## Confirmed Review Targets

- Author pagination repeats the same title across DPBowman pages1-9 and the
  second PubThroughKrakow page. Category pagination also repeats titles.
- Category and tag Drinking Games titles collide; tag Krakow Nightlife collides
  with the nightlife hub. Distinguish archive type and page number without
  renaming URLs, modifying canonical/indexing policy or padding keywords.
- Review commercial/article title relevance against existing visible content,
  not an arbitrary character limit. Keep historical years where meaningful.
- Generate consistent, escaped Open Graph/Twitter fields from actual title,
  description, URL and real featured image. Staging links stay staging-local;
  eventual production must contain no staging resources.
- Preserve original H1, article date/byline, schema facts, body, forms, consent,
  medical hold and original captures. No fabricated social account handle.
- Test head-only definition differences, duplicate identity, malicious inputs,
  image dimensions/actual file binding, no-JS source and cached device variants.

These are website sharing/clarity improvements, not a promise of Google's title
choice, social-platform cache refresh or a direct ranking gain.

## Local Implementation

Branch `codex/staging-titles-sharing` from971cd2a (PR29 final1cc7a5d,
CI43482542602 both jobs passed; exact merge tree verified and own reference/
branches removed). New pre-edit Git archive `seo-titles-sharing-before-20261113.zip`,
SHA256 `cfb54d9847c616503df7195837b7438ca0e86ac9c76fe5aa0d077a915cb59cd2`.

Source `tools/code-page-sharing.mjs`:

-39 archive titles now distinguish category/tag/author and page number, binding
  exact captured labels/titles. The other77 titles remain unchanged; all116 are
  unique. No canonical, archive index/exclusion or URL changes.
-39 archive descriptions replace the exact captured `Category/Tag/Author:
  <span>label</span>` strings with useful plain text and explicit page numbers.
  Their existing CollectionPage descriptions follow that same value; all other
  schema entities/facts remain exact. No article publication/modified date added.
-115 page heads gain consistent escaped Open Graph/Twitter tags. Health hold
  definition remains exact.48 article image uses reuse47 unique, real featured
  files; dimensions/MIME come from PHP `getimagesize`, with original file hashes
  bound to the immutable image-review manifest. No guessed author/social handle,
  unrelated fallback image, recreated photo or unsupported SVG sharing image.
- Pages without validated images keep text-only summary hints; no promise of a
  fully image-complete OG card for those pages. Actual social-provider fetch/cache/
  crop behavior still requires later public production review, not staging proof.
- The original main bodies/shells, CSS/runtime/media, forms, homepage/storefront
  and production files are unchanged. Only115 generated definition files differ.

Initial full build correctly stopped39 archive rows because their inherited
descriptions contain literal span markup. Preserve `sharing-first-build-failure.json`.
The reviewed exact-identity description correction fixed the input, not the
plain-text/security guard. Successful116-route rebuild restores the exact
immutable manifest SHA256
`f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691`.

Local build2320/source371/head-and-image510 checks pass. The510 checks include
all116 initial heads, duplicate titles, exact tags and47 actual image GET/type/
hash/dimensions. Seven source tests cover the39 identities, hold, escaping,
unexpected inherited markup, real bytes/dimensions, stale and ambiguous images;
shared JavaScript102 pass, PHP content760/forms31 stubbed pass.

The first Python suite181 tests found the deliberately stale sitemap source
binding, not a failed application test. Fresh public24-product review and
123-URL discovery build retain exact entries/exclusions/robots/policy and update
only115 definition source hashes. The catalog audit is read-only; no offer data
changed. Full Python repeat, native browser checks, CI and staging release remain.

Primary guidance checked13 November: [Open Graph](https://ogp.me/) and
[Google title links](https://developers.google.com/search/docs/appearance/title-link).
The former X Cards documentation redirects to its general developer overview;
do not claim an external X validation/certification from that page.
