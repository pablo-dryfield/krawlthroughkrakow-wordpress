# Complete Non-Ecwid Migration Plan

Approved on 2026-11-05: migrate all audited non-Ecwid pages, blog articles, archives and aliases to staging. Preserve production and all Ecwid routes. WordPress remains the server; Divi rendering/JavaScript is removed from migrated frontend routes.

Later on 2026-11-05 the owner approved staging visually and explicitly authorized production. That cutover is now verified for all 116 routes and ten aliases; original WordPress data, both stores and OmniLodge remain outside the content changes. Final production evidence: `../production-release/README.md`.

## Coverage

- 116 content routes: 21 page designs (including the existing pilot), 56 article routes and 39 archive variants.
- 10 aliases: preserve existing redirect status/destination or the existing code-managed homepage canonical alias.
- Forms, galleries, sliders, FAQ toggles, countdowns, maps/video consent, blog layout/pagination, booking attribution and keyboard controls remain functional.
- Broken incoming links and stale offer-copy issues are tracked explicitly; Ecwid endpoints and legal text are not silently rewritten.

## Release Gates

1. [x] Pre-edit backup and complete route inventory.
2. [x] Capture production HTML/CSS/metadata and desktop/mobile baselines for every content route.
3. [x] Build an explicit, staging-only shared route registry and localized assets.
4. [x] Implement/test native interactive components and secure form handling.
5. [x] Measure content, metadata, responsive geometry/pixels, links and exclusions locally; record strict visual failures/exceptions in VISUAL-REVIEW.md.
6. [x] Back up staging; deploy dependency-first and verify every SHA-256.
7. [x] Verify every live staging route, alias, form contract and SEO boundary.
8. [x] Refresh only scoped staging caches and verify device variants.
9. [x] Obtain owner visual approval and separate production authorization.
10. [x] Back up original production state, verify dependencies/homepage promotion and activate production last.
11. [x] Verify production routes, metadata, forms, tracking, booking destinations and responsive layouts.
12. [x] Verify normal production URLs and all three cached device variants after the owner-confirmed domain purge.

## Route Checklist

| Route | Kind | Status |
| --- | --- | --- |
| /2020-krakow-nightlife-guide/ | blog post | Production verified; owner-approved visual differences |
| /all-you-need-to-know-about-visiting-auschwitz/ | blog post | Production verified; owner-approved visual differences |
| /bachelor-party-organisers-krakow/ | blog post | Production verified; owner-approved visual differences |
| /best-drinking-games/ | blog post | Production verified; owner-approved visual differences |
| /best-hotels-in-krakow-2019-2020/ | blog post | Production verified; owner-approved visual differences |
| /best-places-to-eat/ | blog post | Production verified; owner-approved visual differences |
| /best-pub-crawls-in-europe/ | blog post | Production verified; owner-approved visual differences |
| /budapest-or-krakow-nightlife/ | blog post | Production verified; owner-approved visual differences |
| /escape-rooms-for-a-stag-do-in-krakow/ | blog post | Production verified; owner-approved visual differences |
| /go-karting-krakow/ | blog post | Production verified; owner-approved visual differences |
| /hen-do-ideas-abroad/ | blog post | Production verified; owner-approved visual differences |
| /hostel-etiquette-tips/ | blog post | Production verified; owner-approved visual differences |
| /hostel-hangover-cure/ | blog post | Production verified; owner-approved visual differences |
| /irish-bars-krakow/ | blog post | Production verified; owner-approved visual differences |
| /is-krakow-safe-for-stag/ | blog post | Production verified; owner-approved visual differences |
| /jazz-bars-in-krakow/ | blog post | Production verified; owner-approved visual differences |
| /karaoke-bars-in-krakow/ | blog post | Production verified; owner-approved visual differences |
| /krakow-bars-jewish-quarter/ | blog post | Production verified; owner-approved visual differences |
| /krakow-budget-activities/ | blog post | Production verified; owner-approved visual differences |
| /krakow-food-truck-parks/ | blog post | Production verified; owner-approved visual differences |
| /krakow-free-activities-2/ | blog post | Production verified; owner-approved visual differences |
| /krakow-go-karting/ | blog post | Production verified; owner-approved visual differences |
| /krakow-hen-party-reviews/ | blog post | Production verified; owner-approved visual differences |
| /krakow-live-music/ | blog post | Production verified; owner-approved visual differences |
| /krakow-milkbars/ | blog post | Production verified; owner-approved visual differences |
| /krakow-money-saving-tips/ | blog post | Production verified; owner-approved visual differences |
| /krakow-new-years-eve/ | blog post | Production verified; owner-approved visual differences |
| /krakow-nightclubs/ | blog post | Production verified; owner-approved visual differences |
| /krakow-safety-guide/ | blog post | Production verified; owner-approved visual differences |
| /krakow-shooting-range/ | blog post | Production verified; owner-approved visual differences |
| /krakow-shot-bar/ | blog post | Production verified; owner-approved visual differences |
| /krakow-stag-activities/ | blog post | Production verified; owner-approved visual differences |
| /krakow-team-building-activities/ | blog post | Production verified; owner-approved visual differences |
| /krakow-techno-clubs-2/ | blog post | Production verified; owner-approved visual differences |
| /krakow-techno-clubs/ | blog post | Production verified; owner-approved visual differences |
| /krakow-weather-guide/ | blog post | Production verified; owner-approved visual differences |
| /krakow-wine-bars/ | blog post | Production verified; owner-approved visual differences |
| /krakow-winter-activities/ | blog post | Production verified; owner-approved visual differences |
| /krawl-through-krakow-winter-newsletter/ | blog post | Production verified; owner-approved visual differences |
| /life-professional-drunk/ | blog post | Production verified; owner-approved visual differences |
| /new-years-eve-in-krakow/ | blog post | Production verified; owner-approved visual differences |
| /party-krakow/ | blog post | Production verified; owner-approved visual differences |
| /six-reasons-you-need-to-party-with-the-krawl-through-krakow/ | blog post | Production verified; owner-approved visual differences |
| /spa-hotels-krakow/ | blog post | Production verified; owner-approved visual differences |
| /spooktacular-krakow-unveil-the-mysteries-of-halloween/ | blog post | Production verified; owner-approved visual differences |
| /sports-bar-krakow/ | blog post | Production verified; owner-approved visual differences |
| /stag-do-costume/ | blog post | Production verified; owner-approved visual differences |
| /stag-pranks/ | blog post | Production verified; owner-approved visual differences |
| /stages-of-drunkenness/ | blog post | Production verified; owner-approved visual differences |
| /survive-pub-crawl/ | blog post | Production verified; owner-approved visual differences |
| /the-ultimate-guide-to-dating-in-nightlife-krakow/ | blog post | Production verified; owner-approved visual differences |
| /the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/ | blog post | Production verified; owner-approved visual differences |
| /travel-krakow-your-comprehensive-city-guide/ | blog post | Production verified; owner-approved visual differences |
| /weekend-in-krakow/ | blog post | Production verified; owner-approved visual differences |
| /welcome-to-alcohol/ | blog post | Production verified; owner-approved visual differences |
| /wheres-the-cheap-places-to-drink-in-krakow/ | blog post | Production verified; owner-approved visual differences |
| /category/drinking-games/ | category archive | Production verified; owner-approved visual differences |
| /category/hen-do/ | category archive | Production verified; owner-approved visual differences |
| /category/krakow-guides/ | category archive | Production verified; owner-approved visual differences |
| /category/krakow-nightlife/ | category archive | Production verified; owner-approved visual differences |
| /category/party-tips/ | category archive | Production verified; owner-approved visual differences |
| /category/stag-do/ | category archive | Production verified; owner-approved visual differences |
| /category/uncategorized/ | category archive | Production verified; owner-approved visual differences |
| /author/dpbowman/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/2/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/3/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/4/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/5/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/6/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/7/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/8/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/dpbowman/page/9/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/jessie/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/pubthroughkrakow/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/pubthroughkrakow/page/2/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /author/thirsty/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/krakow-guides/page/2/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/krakow-guides/page/3/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/krakow-nightlife/page/2/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/party-tips/page/2/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/uncategorized/page/2/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/uncategorized/page/3/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/uncategorized/page/4/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /category/uncategorized/page/5/ | linked URL outside sitemap/API | Production verified; owner-approved visual differences |
| /about-us/ | page | Production verified; owner-approved visual differences |
| /about-us/how-to-join/ | page | Production verified; owner-approved visual differences |
| /blog/ | page | Production verified; owner-approved visual differences |
| /contact/ | page | Production verified; owner-approved visual differences |
| /faqs/ | page | Production verified; owner-approved visual differences |
| /gallery/ | page | Production verified; owner-approved visual differences |
| /krakow-hen-do/ | page | Production verified; owner-approved visual differences |
| /krakow-nightlife/ | page | Production verified; owner-approved visual differences |
| /krakow-stag-do/ | page | Production verified; owner-approved visual differences |
| /meeting-point/ | page | Production verified; owner-approved visual differences |
| /new-years-eve/ | page | Production verified; owner-approved visual differences |
| /other-tours/ | page | Production verified; owner-approved visual differences |
| /otherbarcrawls/ | page | Production verified; owner-approved visual differences |
| /privacy-policy/ | page | Production verified; owner-approved visual differences |
| /pub-crawl-drinking-games/ | page | Production verified; owner-approved visual differences |
| /pub-crawl-jobs/ | page | Production verified; owner-approved visual differences |
| /stagshens/ | page | Production verified; owner-approved visual differences |
| /student-trips-poland/ | page | Production verified; owner-approved visual differences |
| /terms-and-conditions/ | page | Production verified; owner-approved visual differences |
| /testimonials/ | page | Production verified; owner-approved visual differences |
| /tour-service-disclaimer/ | page | Production verified; owner-approved visual differences |
| /tag/drinking-games/ | tag archive | Production verified; owner-approved visual differences |
| /tag/krakow-food/ | tag archive | Production verified; owner-approved visual differences |
| /tag/krakow-nightlife/ | tag archive | Production verified; owner-approved visual differences |
| /tag/krakow-party/ | tag archive | Production verified; owner-approved visual differences |
| /tag/krakow/ | tag archive | Production verified; owner-approved visual differences |
| /tag/krawl-through-krakow/ | tag archive | Production verified; owner-approved visual differences |
| /tag/party-ideas/ | tag archive | Production verified; owner-approved visual differences |
| /tag/pub-crawl/ | tag archive | Production verified; owner-approved visual differences |
| /tag/tips/ | tag archive | Production verified; owner-approved visual differences |
| /tag/to-do-list/ | tag archive | Production verified; owner-approved visual differences |
| /tag/why-choose-us/ | tag archive | Production verified; owner-approved visual differences |

Machine-readable progress and evidence: manifest.json. A route is not complete merely because it is listed; capture/build/test/deployment evidence is required.
