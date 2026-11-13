# Jazz And Live-Music Choices

## Scope

Staging-only C05/C08/D05 batch, 13 November 2026. The existing jazz and live-music
URLs remain distinct: focused jazz choices versus comparison of performance
formats. No consolidation, redirects, new current-price promises or invented
personal visits. Original H1/title/byline/publication/canonicals/schema stay
unchanged. The medical article and the other 114 content bodies stay exact.

Before edits: `seo-music-choices-before-20261113.zip`, SHA256
`7232ea681dbc6767fe9d4a90ad080cc4eee121f9f7dedc4d032647188032abeb`.
Baseline is PR26 merge `7e195bbca92b1d828cef5bb0e0e94cda2720b515`, exact
tree `8489a6af1b5147738c195c0bf99ee41152f65d43` following final CI43467906903.

## Editorial Decisions

- Jazz: Harris, PIEC Art, The Piano Rouge, Alchemia and U Muniaka have named
  operator links and practical event/admission/seating guidance. Unsupported
  historical, menu and architectural promises are removed.
- The owner confirmed HEVRE remains a recommended music-night option. Attribute
  that recommendation to KTK; its current jazz programme is not independently
  confirmed. Website-to-Facebook/login behavior is not evidence of closure.
- Live music: distinguish jazz, cabaret/recitals, restaurant performances,
  seasonal restaurant events and club nights. Hard Rock is not presented as a
  specialist jazz venue. Older or unclear-year Forty listings are not new gigs.
- Native contents replace broken/repetitive navigation. All 15 jazz and 12
  live-music meaningful section fragments remain exactly once; only the live
  article's known generated `*-toc` and duplicate numeric list IDs are removed.
- Each guide retains one identifiable original inline photograph (Harris or
  Hard Rock); all original media files/public URLs and featured headers remain.
  Inline references fall from 6/7 to 1 each. This is not a measured transfer-size
  or field-performance claim.
- A separate visible source-review date does not rewrite the original 2023
  publication day. Source templates/helpers are maintained in `tools/content/`
  and `tools/music-editorial.mjs`, never by editing generated article output.

## Primary Sources

Checked online on 13 November 2026; no external photographs copied.

- [Harris history/contact](https://harris.krakow.pl/o-nas/): Rynek Glowny28,
  January1997, multiple musical styles; old announcements do not establish a
  new performance.
- [PIEC Art](https://www.piecart.pl/?lang=pl): bar versus cellar/concert spaces,
  dated programme; confirm room and admission.
- [U Muniaka programme](https://jazzumuniaka.club/) and
  [reservation terms](https://jazzumuniaka.club/regulamin/): ticket reservation
  versus a reserved seated place.
- [Alchemia contact](https://alchemia.com.pl/kontakt/) and
  [programme](https://alchemia.com.pl/program/): Estery5, multiple genres. Do not
  turn relative-date labels or past listings into current promises.
- [Piano Rouge](https://www.thepianorouge.com.pl/en/home-page/): restaurant at
  Main Market Square46, concert dining-room format; verify table/performance.
- [HEVRE](https://www.hevre.pl/): current redirect to its Facebook presence;
  no independently verified public programme. Owner recommendation retained.
- [Hard Rock Krakow](https://cafe.hardrock.com/krakow/) and its
  [calendar](https://cafe.hardrock.com/krakow/event-calendar.aspx): seasonal live
  performances, DJ sets and special events, not a nightly jazz guarantee.
- [Piwnica pod Baranami](https://piwnicapodbaranami.pl/) and
  [programme](https://piwnicapodbaranami.pl/nowo%C5%9Bci): cabaret, recitals and
  concerts; check year, language and actual event tickets.
- [Forty Kleparz music club](https://fortykleparz.pl/music-club/): Kamienna2,
  concerts/DJ events; historical material and unclear-year entries require
  current confirmation. No copied room-layout/capacity or nightly guarantees.

## Verification

- [x] Exact source captures and original publication/photo/fragment identities
  guarded before mutation. Unknown markup, destinations, photo slots and stale
  source fail atomically; unrelated and medical keys are untouched.
- [x] Final local source407/build2320/native browser156/Python180/shared JS81/
  PHP760/forms31 stubbed pass. Eight320/390/768/1440 axe views have0 violations
  and8 incomplete groups, not full conformance. Actual mobile/desktop screenshots
  inspected; visible booking tab, native fragments and original photo identities
  pass. Roadmap browser311 passes. Immutable asset manifest remains exact.
- [x] Source4dc08ed / PR27 required CI43471154012 passes both jobs. Guarded
  staging publisher verifies2072 owned hashes and unchanged saved WordPress
  state/home/storefront; helper removed. Completed17:18:04UTC. Backup
  `ktk-code-pages-staging-20261113-171745.zip`, SHA256
  `aaf8a748534def8ba2181117b311cfd24a18065b3265ed7ca5467c60885c3251`.
- [x] Actual origin and normal browser156 each, isolated attribution59 with no
  navigation/orders/writes, discovery243 origin and normal8-view axe0 violations/
  8 incomplete groups pass. Normal live mobile screenshots inspected. Homepage
  active assets pass; full-route and warmed-cache verification remain below.
- [x] Staging-only Cloudflare prefix purge accepted17:18:57.668UTC. No production
  purge/settings change. API acceptance alone is not cache proof.
- [x] Full content5848 origin/normal/repeat each pass,119 assets/tokens current.
  Final repeat17:26:00UTC:348/348 content HIT across desktop/Android/iPad.
  First normal261 MISS/87 HIT is retained, not described as all-HIT.
- [x] Graph142 pages/6214 edges/no unknowns/same6 held tag archives; discovery
  243 origin/216 normal/216 repeat and homepage10 assets/all3 HIT repeat pass.
  Initial homepage repeat warming is separate from final content-cache proof.
- [x] Both roadmaps advance this batch only:16 staging-verified,1 wider music
  review underway,1 OmniLodge live delivery. All40 wider ticket states remain;
  C05/C08 are not finished. No website SEO production release.

Reports use `music-` names in this directory; full shared content reports are
`music-choices-origin/clean/repeat-20261113.json`. App payload remains exactly
4dc08ed; subsequent documentation/roadmap changes require no second deployment.
Definitions/discovery bytes are exact, so no separate discovery/home/storefront
publisher was run. All finite scans/publishers and task previews are closed;
ports5184/5185 have no listeners. Final docs CI/merge/own reference cleanup is
recorded in PR27, not inferred from the application CI alone.

Initial diagnostics retained: source405/407 caught fixture filtering of the
`main-toc` ID itself, then corrected to exclude only auxiliary IDs; browser
152/156 expected the Harris subsection although the native contents link
correctly targets the enclosing jazz-choice section. Corrected expected native
target without changing the link or relaxing geometry. A first unit fixture
assumed identical wording for the two personal-visit disclaimers (3/4); both
existing disclaimers are now explicitly checked. These are not passing reports.

No production/commerce/OmniLodge/consent/plugin/account changes. Tests block
non-read requests and do not submit orders, quotes, forms, messages or payments.
Whole C05/C08, remaining music articles, owner review and production remain open.
