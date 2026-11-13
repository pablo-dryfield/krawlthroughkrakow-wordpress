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
