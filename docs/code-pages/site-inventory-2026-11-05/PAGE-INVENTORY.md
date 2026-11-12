# Website Page Inventory

Checked: 2026-11-05T13:14:08.0388484+01:00 (Europe/Warsaw).

Read-only public REST API + complete WordPress sitemap index + internal-link discovery + rendered HTML ownership markers. No authentication, uploads, content edits, code deployment, order submission or cache purge.

## Coverage and Limitations

- Production is the authoritative website inventory; staging is checked separately for completed migration ownership.
- All public REST collection pagination and every sitemap in the index were read. Every listed production route received a rendered-HTML GET; internal anchor links were then followed recursively to closure within the recorded safety limit. Closure complete: True.
- Draft, private, pending, scheduled and trashed content cannot be enumerated through the public API. Those counts are unverified, not zero. This is a complete public-index/API inventory plus the recorded link discovery, not a claim of complete database access or every possible query-string/pagination combination.
- Blog posts/projects/archive URLs are separate from WordPress Page posts. Legacy Ecwid catalog URLs are platform-managed, not the new KTK code-managed storefront.
- A redirect/error/hosting challenge is not counted as a successful new content migration. Generated archive families should normally be migrated as templates, not rebuilt once for every archive URL.

## Migration Worklist

- The public API exposes 24 published WordPress Page records; 21 resolve to standalone WordPress/Divi pages rather than code-managed routes, redirects or legacy store pages.
- 1 of those production Divi page designs have a verified staging-only code-managed replica. That leaves 20 standalone page designs not yet migrated to staging. This is not permission to migrate or promote them.
- The 57 published blog Post records include 56 independently rendered legacy article routes. Code-managed destinations and canonical aliases are separately classified; they are not necessarily migrated article templates.
- The legacy `/store/` family is intentionally retained as the storefront availability fallback. Keep it separate from content-page migration and do not remove or replace it as part of this inventory.
- Forms, maps, sliders, galleries, videos, FAQ interactions and countdowns are recorded per page below. These are raw HTML detections, not a complete functional browser test of every component.

## Summary

```json
{
  "public_wordpress_pages": 24,
  "public_blog_posts": 57,
  "public_projects": 1,
  "initial_sitemap_union": 125,
  "additional_linked_routes": 34,
  "inspected_routes": 160,
  "by_kind": {
    "blog post": 57,
    "category archive": 7,
    "code-owned route": 1,
    "legacy store URL": 25,
    "linked URL outside sitemap/API": 34,
    "page": 24,
    "project": 1,
    "tag archive": 11
  },
  "by_renderer": {
    "WordPress/Divi": 125,
    "code-managed homepage": 2,
    "code-managed storefront": 4,
    "legacy Ecwid store (not KTK code-managed)": 29
  },
  "migration_buckets": {
    "blog article": 56,
    "redirect or canonical alias": 10,
    "generated archive": 39,
    "already code-managed": 5,
    "legacy store": 28,
    "broken/unverified route": 1,
    "standalone WordPress page": 21
  },
  "standalone_wordpress_pages_requiring_production_migration": 21,
  "standalone_pages_already_migrated_on_staging_only": 1
}
```

## Standalone Divi Pages Requiring Production Migration

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | About Us | [/about-us/](https://krawlthroughkrakow.com/about-us/) | WordPress/Divi; embedded video |
| 2 | How to Join! | [/about-us/how-to-join/](https://krawlthroughkrakow.com/about-us/how-to-join/) | WordPress/Divi; staging replica complete, production pending; Google Maps |
| 3 | The Pub Crawl Blog | [/blog/](https://krawlthroughkrakow.com/blog/) | WordPress/Divi; slider |
| 4 | Contact | [/contact/](https://krawlthroughkrakow.com/contact/) | WordPress/Divi; Google Maps, form |
| 5 | FAQ’s | [/faqs/](https://krawlthroughkrakow.com/faqs/) | WordPress/Divi; Google Maps, accordion/toggle |
| 6 | Gallery | [/gallery/](https://krawlthroughkrakow.com/gallery/) | WordPress/Divi; gallery |
| 7 | Krakow Hen do | [/krakow-hen-do/](https://krawlthroughkrakow.com/krakow-hen-do/) | WordPress/Divi; form, gallery, slider |
| 8 | Krakow Nightlife | [/krakow-nightlife/](https://krawlthroughkrakow.com/krakow-nightlife/) | WordPress/Divi |
| 9 | Krakow Stag do | [/krakow-stag-do/](https://krawlthroughkrakow.com/krakow-stag-do/) | WordPress/Divi; embedded video, form, gallery, slider |
| 10 | Meeting Point | [/meeting-point/](https://krawlthroughkrakow.com/meeting-point/) | WordPress/Divi; Google Maps |
| 11 | New Years Eve | [/new-years-eve/](https://krawlthroughkrakow.com/new-years-eve/) | WordPress/Divi; countdown, embedded video |
| 12 | Other Tours | [/other-tours/](https://krawlthroughkrakow.com/other-tours/) | WordPress/Divi; slider |
| 13 | Bar Crawls Around the World | [/otherbarcrawls/](https://krawlthroughkrakow.com/otherbarcrawls/) | WordPress/Divi |
| 14 | Privacy Policy | [/privacy-policy/](https://krawlthroughkrakow.com/privacy-policy/) | WordPress/Divi |
| 15 | Pub Crawl Drinking Games | [/pub-crawl-drinking-games/](https://krawlthroughkrakow.com/pub-crawl-drinking-games/) | WordPress/Divi |
| 16 | Pub Crawl Jobs | [/pub-crawl-jobs/](https://krawlthroughkrakow.com/pub-crawl-jobs/) | WordPress/Divi; form, gallery, slider |
| 17 | Stags & Hens | [/stagshens/](https://krawlthroughkrakow.com/stagshens/) | WordPress/Divi; Contact Form 7, form, slider |
| 18 | Student Trips Poland | [/student-trips-poland/](https://krawlthroughkrakow.com/student-trips-poland/) | WordPress/Divi; form |
| 19 | Terms and Conditions | [/terms-and-conditions/](https://krawlthroughkrakow.com/terms-and-conditions/) | WordPress/Divi |
| 20 | Testimonials | [/testimonials/](https://krawlthroughkrakow.com/testimonials/) | WordPress/Divi |
| 21 | Tour Service Disclaimer | [/tour-service-disclaimer/](https://krawlthroughkrakow.com/tour-service-disclaimer/) | WordPress/Divi; Google Maps |

## All Published Page Records Not Code-managed in Production

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | About Us | [/about-us/](https://krawlthroughkrakow.com/about-us/) | WordPress/Divi; embedded video |
| 2 | How to Join! | [/about-us/how-to-join/](https://krawlthroughkrakow.com/about-us/how-to-join/) | WordPress/Divi; staging replica complete, production pending; Google Maps |
| 3 | The Pub Crawl Blog | [/blog/](https://krawlthroughkrakow.com/blog/) | WordPress/Divi; slider |
| 4 | Contact | [/contact/](https://krawlthroughkrakow.com/contact/) | WordPress/Divi; Google Maps, form |
| 5 | FAQ’s | [/faqs/](https://krawlthroughkrakow.com/faqs/) | WordPress/Divi; Google Maps, accordion/toggle |
| 6 | Gallery | [/gallery/](https://krawlthroughkrakow.com/gallery/) | WordPress/Divi; gallery |
| 7 | Activities | [/krakow-activities/](https://krawlthroughkrakow.com/krakow-activities/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/other-tours/ (not a separate rebuild) |
| 8 | Krakow Hen do | [/krakow-hen-do/](https://krawlthroughkrakow.com/krakow-hen-do/) | WordPress/Divi; form, gallery, slider |
| 9 | Krakow Nightlife | [/krakow-nightlife/](https://krawlthroughkrakow.com/krakow-nightlife/) | WordPress/Divi |
| 10 | Krakow Stag do | [/krakow-stag-do/](https://krawlthroughkrakow.com/krakow-stag-do/) | WordPress/Divi; embedded video, form, gallery, slider |
| 11 | Meeting Point | [/meeting-point/](https://krawlthroughkrakow.com/meeting-point/) | WordPress/Divi; Google Maps |
| 12 | New Years Eve | [/new-years-eve/](https://krawlthroughkrakow.com/new-years-eve/) | WordPress/Divi; countdown, embedded video |
| 13 | Other Tours | [/other-tours/](https://krawlthroughkrakow.com/other-tours/) | WordPress/Divi; slider |
| 14 | Bar Crawls Around the World | [/otherbarcrawls/](https://krawlthroughkrakow.com/otherbarcrawls/) | WordPress/Divi |
| 15 | Privacy Policy | [/privacy-policy/](https://krawlthroughkrakow.com/privacy-policy/) | WordPress/Divi |
| 16 | Pub Crawl Drinking Games | [/pub-crawl-drinking-games/](https://krawlthroughkrakow.com/pub-crawl-drinking-games/) | WordPress/Divi |
| 17 | Pub Crawl Jobs | [/pub-crawl-jobs/](https://krawlthroughkrakow.com/pub-crawl-jobs/) | WordPress/Divi; form, gallery, slider |
| 18 | Stags & Hens | [/stagshens/](https://krawlthroughkrakow.com/stagshens/) | WordPress/Divi; Contact Form 7, form, slider |
| 19 | Store | [/store/](https://krawlthroughkrakow.com/store/) | legacy Ecwid store (not KTK code-managed) |
| 20 | Student Trips Poland | [/student-trips-poland/](https://krawlthroughkrakow.com/student-trips-poland/) | WordPress/Divi; form |
| 21 | Terms and Conditions | [/terms-and-conditions/](https://krawlthroughkrakow.com/terms-and-conditions/) | WordPress/Divi |
| 22 | Testimonials | [/testimonials/](https://krawlthroughkrakow.com/testimonials/) | WordPress/Divi |
| 23 | Tour Service Disclaimer | [/tour-service-disclaimer/](https://krawlthroughkrakow.com/tour-service-disclaimer/) | WordPress/Divi; Google Maps |

## Blog Articles

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | Ultimate 2020 Krakow Nightlife Guide | [/2020-krakow-nightlife-guide/](https://krawlthroughkrakow.com/2020-krakow-nightlife-guide/) | WordPress/Divi |
| 2 | Everything you need to know about visiting Auschwitz | [/all-you-need-to-know-about-visiting-auschwitz/](https://krawlthroughkrakow.com/all-you-need-to-know-about-visiting-auschwitz/) | WordPress/Divi |
| 3 | Bachelor Party Organisers Krakow: Unforgettable Adventures | [/bachelor-party-organisers-krakow/](https://krawlthroughkrakow.com/bachelor-party-organisers-krakow/) | WordPress/Divi |
| 4 | The Best Drinking Games Selection From The Experts | [/best-drinking-games/](https://krawlthroughkrakow.com/best-drinking-games/) | WordPress/Divi |
| 5 | Best Hotels in Krakow in 2019 | [/best-hotels-in-krakow-2019-2020/](https://krawlthroughkrakow.com/best-hotels-in-krakow-2019-2020/) | WordPress/Divi; gallery |
| 6 | The Best 2024 Places To Eat In Krakow | [/best-places-to-eat/](https://krawlthroughkrakow.com/best-places-to-eat/) | WordPress/Divi |
| 7 | Best Pub Crawls in Europe | [/best-pub-crawls-in-europe/](https://krawlthroughkrakow.com/best-pub-crawls-in-europe/) | WordPress/Divi |
| 8 | Budapest or Krakow Nightlife: A Tourist’s Ultimate Guide | [/budapest-or-krakow-nightlife/](https://krawlthroughkrakow.com/budapest-or-krakow-nightlife/) | WordPress/Divi |
| 9 | Escape Rooms for a Stag Do in Krakow: Discover The Ultimate Guide | [/escape-rooms-for-a-stag-do-in-krakow/](https://krawlthroughkrakow.com/escape-rooms-for-a-stag-do-in-krakow/) | WordPress/Divi |
| 10 | Unleash Your Inner Racer with Go Karting Krakow! | [/go-karting-krakow/](https://krawlthroughkrakow.com/go-karting-krakow/) | WordPress/Divi |
| 11 | Krakow: Ultimate Hen Do Ideas Abroad for a Party | [/hen-do-ideas-abroad/](https://krawlthroughkrakow.com/hen-do-ideas-abroad/) | WordPress/Divi |
| 12 | 7 Essential Hostel Etiquette Tips for a Memorable Stay | [/hostel-etiquette-tips/](https://krawlthroughkrakow.com/hostel-etiquette-tips/) | WordPress/Divi |
| 13 | Hostel Hangover Cure: Surviving the Morning After in Krakow | [/hostel-hangover-cure/](https://krawlthroughkrakow.com/hostel-hangover-cure/) | WordPress/Divi |
| 14 | Irish Bars Krakow: Krawl Through Krakow’s Exciting Nightlife | [/irish-bars-krakow/](https://krawlthroughkrakow.com/irish-bars-krakow/) | WordPress/Divi |
| 15 | Is Krakow Safe for Stag? Nightlife, Safety Tips & More | [/is-krakow-safe-for-stag/](https://krawlthroughkrakow.com/is-krakow-safe-for-stag/) | WordPress/Divi |
| 16 | Jazz Bars in Krakow: Experience Vibrant Nightlife & Charm | [/jazz-bars-in-krakow/](https://krawlthroughkrakow.com/jazz-bars-in-krakow/) | WordPress/Divi |
| 17 | Discover the Best Karaoke Bars in Krakow for a Fun Night Out | [/karaoke-bars-in-krakow/](https://krawlthroughkrakow.com/karaoke-bars-in-krakow/) | WordPress/Divi |
| 18 | Discover Krakow Bars: Jewish Quarter Nightlife and Culture | [/krakow-bars-jewish-quarter/](https://krawlthroughkrakow.com/krakow-bars-jewish-quarter/) | WordPress/Divi |
| 19 | Krakow Budget Activities: Fun and Affordable Explorations | [/krakow-budget-activities/](https://krawlthroughkrakow.com/krakow-budget-activities/) | WordPress/Divi |
| 20 | Discover Krakow Food Truck Parks for a Tasty Adventure | [/krakow-food-truck-parks/](https://krawlthroughkrakow.com/krakow-food-truck-parks/) | WordPress/Divi |
| 21 | Krakow Free Activities: Budget-Friendly Exploration and Fun | [/krakow-free-activities-2/](https://krawlthroughkrakow.com/krakow-free-activities-2/) | WordPress/Divi |
| 22 | Krakow Go Karting: Ultimate Guide for a Thrilling Night | [/krakow-go-karting/](https://krawlthroughkrakow.com/krakow-go-karting/) | WordPress/Divi |
| 23 | Krakow Hen Party Reviews: Ultimate Nightlife and Activities | [/krakow-hen-party-reviews/](https://krawlthroughkrakow.com/krakow-hen-party-reviews/) | WordPress/Divi |
| 24 | Krakow Live Music: Explore Top Venues & Unforgettable Nights | [/krakow-live-music/](https://krawlthroughkrakow.com/krakow-live-music/) | WordPress/Divi |
| 25 | Discover Krakow Milkbars: A Revival of Authentic Polish Cuisine | [/krakow-milkbars/](https://krawlthroughkrakow.com/krakow-milkbars/) | WordPress/Divi |
| 26 | Krakow Money Saving Tips: Affordable Travel Guide | [/krakow-money-saving-tips/](https://krawlthroughkrakow.com/krakow-money-saving-tips/) | WordPress/Divi |
| 27 | Why Kraków is awesome for New Years Eve | [/krakow-new-years-eve/](https://krawlthroughkrakow.com/krakow-new-years-eve/) | WordPress/Divi |
| 28 | Discover Krakow Nightclubs: Ultimate Guide for Party-Goers | [/krakow-nightclubs/](https://krawlthroughkrakow.com/krakow-nightclubs/) | WordPress/Divi |
| 29 | Krakow Pub Crawl: Nightlife, Games & Insider Tips | [/krakow-pub-crawl/](https://krawlthroughkrakow.com/krakow-pub-crawl/) | code-managed homepage; alias/redirect to https://krawlthroughkrakow.com/ (not a separate rebuild) |
| 30 | Kraków Safety Guide: Tips for a Fun and Secure Experience | [/krakow-safety-guide/](https://krawlthroughkrakow.com/krakow-safety-guide/) | WordPress/Divi |
| 31 | Krakow Shooting Range: Ultimate Tourist Guide | [/krakow-shooting-range/](https://krawlthroughkrakow.com/krakow-shooting-range/) | WordPress/Divi |
| 32 | Discover Krakow Shot Bar Gems: Ultimate Nightlife Guide | [/krakow-shot-bar/](https://krawlthroughkrakow.com/krakow-shot-bar/) | WordPress/Divi |
| 33 | Ultimate Guide to Krakow Stag Activities: Nightlife and More | [/krakow-stag-activities/](https://krawlthroughkrakow.com/krakow-stag-activities/) | WordPress/Divi |
| 34 | 8 Exciting Krakow Team Building Activities for Tourists | [/krakow-team-building-activities/](https://krawlthroughkrakow.com/krakow-team-building-activities/) | WordPress/Divi |
| 35 | Experience Krakow Techno Clubs: A Partygoer’s Guide | [/krakow-techno-clubs-2/](https://krawlthroughkrakow.com/krakow-techno-clubs-2/) | WordPress/Divi |
| 36 | Experience Krakow Techno Clubs: Ultimate Party Guide | [/krakow-techno-clubs/](https://krawlthroughkrakow.com/krakow-techno-clubs/) | WordPress/Divi |
| 37 | The Ultimate Krakow Weather Guide! | [/krakow-weather-guide/](https://krawlthroughkrakow.com/krakow-weather-guide/) | WordPress/Divi |
| 38 | Discover the Best Krakow Wine Bars for a Memorable Night Out | [/krakow-wine-bars/](https://krawlthroughkrakow.com/krakow-wine-bars/) | WordPress/Divi |
| 39 | Discover Krakow Winter Activities: Nightlife, Food & Fun | [/krakow-winter-activities/](https://krawlthroughkrakow.com/krakow-winter-activities/) | WordPress/Divi |
| 40 | Krawl Through Kraków Winter Newsletter | [/krawl-through-krakow-winter-newsletter/](https://krawlthroughkrakow.com/krawl-through-krakow-winter-newsletter/) | WordPress/Divi; gallery, slider |
| 41 | Life As A Professional Drunk | [/life-professional-drunk/](https://krawlthroughkrakow.com/life-professional-drunk/) | WordPress/Divi |
| 42 | Celebrate the Magic: Krakow’s Unforgettable Christmas, New Year’s Eve, and Vibrant Nightlife | [/new-years-eve-in-krakow/](https://krawlthroughkrakow.com/new-years-eve-in-krakow/) | WordPress/Divi; embedded video, gallery |
| 43 | How to party in Krakow | [/party-krakow/](https://krawlthroughkrakow.com/party-krakow/) | WordPress/Divi |
| 44 | Six reasons you need to party with the Krawl Through Krakow! | [/six-reasons-you-need-to-party-with-the-krawl-through-krakow/](https://krawlthroughkrakow.com/six-reasons-you-need-to-party-with-the-krawl-through-krakow/) | WordPress/Divi |
| 45 | Unwind in Style: A Tour of Spa Hotels Krakow | [/spa-hotels-krakow/](https://krawlthroughkrakow.com/spa-hotels-krakow/) | WordPress/Divi |
| 46 | Spooktacular Krakow: Unveil the Mysteries of Halloween | [/spooktacular-krakow-unveil-the-mysteries-of-halloween/](https://krawlthroughkrakow.com/spooktacular-krakow-unveil-the-mysteries-of-halloween/) | WordPress/Divi; video |
| 47 | Exploring the Best Sports Bar Krakow: A Guide for Tourists | [/sports-bar-krakow/](https://krawlthroughkrakow.com/sports-bar-krakow/) | WordPress/Divi |
| 48 | Krakow Stag Do: Unleashing Fun with Creative Stag Do Costume Ideas | [/stag-do-costume/](https://krawlthroughkrakow.com/stag-do-costume/) | WordPress/Divi |
| 49 | Epic Stag Pranks: Unforgettable Night in Krakow | [/stag-pranks/](https://krawlthroughkrakow.com/stag-pranks/) | WordPress/Divi |
| 50 | Eleven Stages of Drunkenness | [/stages-of-drunkenness/](https://krawlthroughkrakow.com/stages-of-drunkenness/) | WordPress/Divi |
| 51 | How to Survive a Pub Crawl | [/survive-pub-crawl/](https://krawlthroughkrakow.com/survive-pub-crawl/) | WordPress/Divi |
| 52 | The Ultimate Guide to Dating in nightlife & krakow  | [/the-ultimate-guide-to-dating-in-nightlife-krakow/](https://krawlthroughkrakow.com/the-ultimate-guide-to-dating-in-nightlife-krakow/) | WordPress/Divi |
| 53 | The Ultimate Guide to the Best Bars and Clubs in Krakow in 2019 | [/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/](https://krawlthroughkrakow.com/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/) | WordPress/Divi |
| 54 | Travel Krakow – your comprehensive city guide! | [/travel-krakow-your-comprehensive-city-guide/](https://krawlthroughkrakow.com/travel-krakow-your-comprehensive-city-guide/) | WordPress/Divi |
| 55 | Weekend In Krakow: Partying And Other 15 Top Things To Do | [/weekend-in-krakow/](https://krawlthroughkrakow.com/weekend-in-krakow/) | WordPress/Divi |
| 56 | The Big Prize Competition | [/welcome-to-alcohol/](https://krawlthroughkrakow.com/welcome-to-alcohol/) | WordPress/Divi; Contact Form 7, accordion/toggle, embedded video, form |
| 57 | Where’s the Cheap Places to Drink in Krakow: Insider Tips | [/wheres-the-cheap-places-to-drink-in-krakow/](https://krawlthroughkrakow.com/wheres-the-cheap-places-to-drink-in-krakow/) | WordPress/Divi |

## Project Pages

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | Life Drawing with Unlimited Prosecco | [/project/life-drawing-session/](https://krawlthroughkrakow.com/project/life-drawing-session/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-hen-do/ (not a separate rebuild) |

## Category Archives

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | Drinking Games \| Krawl Through Krakow | [/category/drinking-games/](https://krawlthroughkrakow.com/category/drinking-games/) | WordPress/Divi |
| 2 | Hen do \| Krawl Through Krakow | [/category/hen-do/](https://krawlthroughkrakow.com/category/hen-do/) | WordPress/Divi |
| 3 | Krakow Guides \| Krawl Through Krakow | [/category/krakow-guides/](https://krawlthroughkrakow.com/category/krakow-guides/) | WordPress/Divi |
| 4 | Kraków Nightlife \| Krawl Through Krakow | [/category/krakow-nightlife/](https://krawlthroughkrakow.com/category/krakow-nightlife/) | WordPress/Divi |
| 5 | Party Tips \| Krawl Through Krakow | [/category/party-tips/](https://krawlthroughkrakow.com/category/party-tips/) | WordPress/Divi |
| 6 | Stag do \| Krawl Through Krakow | [/category/stag-do/](https://krawlthroughkrakow.com/category/stag-do/) | WordPress/Divi |
| 7 | Uncategorized \| Krawl Through Krakow | [/category/uncategorized/](https://krawlthroughkrakow.com/category/uncategorized/) | WordPress/Divi |

## Tag Archives

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | Drinking Games \| Krawl Through Krakow | [/tag/drinking-games/](https://krawlthroughkrakow.com/tag/drinking-games/) | WordPress/Divi |
| 2 | Krakow Food \| Krawl Through Krakow | [/tag/krakow-food/](https://krawlthroughkrakow.com/tag/krakow-food/) | WordPress/Divi |
| 3 | Krakow Nightlife \| Krawl Through Krakow | [/tag/krakow-nightlife/](https://krawlthroughkrakow.com/tag/krakow-nightlife/) | WordPress/Divi |
| 4 | Krakow Party \| Krawl Through Krakow | [/tag/krakow-party/](https://krawlthroughkrakow.com/tag/krakow-party/) | WordPress/Divi |
| 5 | Krakow \| Krawl Through Krakow | [/tag/krakow/](https://krawlthroughkrakow.com/tag/krakow/) | WordPress/Divi |
| 6 | Krawl Through Krakow \| Krawl Through Krakow | [/tag/krawl-through-krakow/](https://krawlthroughkrakow.com/tag/krawl-through-krakow/) | WordPress/Divi |
| 7 | party ideas \| Krawl Through Krakow | [/tag/party-ideas/](https://krawlthroughkrakow.com/tag/party-ideas/) | WordPress/Divi |
| 8 | Pub Crawl \| Krawl Through Krakow | [/tag/pub-crawl/](https://krawlthroughkrakow.com/tag/pub-crawl/) | WordPress/Divi |
| 9 | tips \| Krawl Through Krakow | [/tag/tips/](https://krawlthroughkrakow.com/tag/tips/) | WordPress/Divi |
| 10 | to do list \| Krawl Through Krakow | [/tag/to-do-list/](https://krawlthroughkrakow.com/tag/to-do-list/) | WordPress/Divi |
| 11 | Why Choose Us \| Krawl Through Krakow | [/tag/why-choose-us/](https://krawlthroughkrakow.com/tag/why-choose-us/) | WordPress/Divi |

## Legacy Store Catalog URLs

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | 2 Hour Bottomless Brunch with 3 Course Meal And Drinks \| Krawl Through Krakow | [/store/2-Hour-Bottomless-Brunch-with-3-Course-Meal-And-Drinks-p808765006](https://krawlthroughkrakow.com/store/2-Hour-Bottomless-Brunch-with-3-Course-Meal-And-Drinks-p808765006) | legacy Ecwid store (not KTK code-managed); gallery |
| 2 | Airport Transfer - Limo & Stripper \| Krawl Through Krakow | [/store/Airport-Transfer-Limo-&-Stripper-p726406492](https://krawlthroughkrakow.com/store/Airport-Transfer-Limo-&-Stripper-p726406492) | legacy Ecwid store (not KTK code-managed); gallery |
| 3 | Airport Transfer - Normal \| Krawl Through Krakow | [/store/Airport-Transfer-Normal-p740813107](https://krawlthroughkrakow.com/store/Airport-Transfer-Normal-p740813107) | legacy Ecwid store (not KTK code-managed); gallery |
| 4 | Beauty & the Beast Stag \| Krawl Through Krakow | [/store/Beauty-&-the-Beast-Stag-p816624537](https://krawlthroughkrakow.com/store/Beauty-&-the-Beast-Stag-p816624537) | legacy Ecwid store (not KTK code-managed); gallery |
| 5 | Boat Party / Private Boat \| Krawl Through Krakow | [/store/Boat-Party-Private-Boat-p637239272](https://krawlthroughkrakow.com/store/Boat-Party-Private-Boat-p637239272) | legacy Ecwid store (not KTK code-managed); gallery |
| 6 | Brewery Tour \| Krawl Through Krakow | [/store/Brewery-Tour-p637056338](https://krawlthroughkrakow.com/store/Brewery-Tour-p637056338) | legacy Ecwid store (not KTK code-managed); gallery |
| 7 | Bubble Football \| Krawl Through Krakow | [/store/Bubble-Football-p637225330](https://krawlthroughkrakow.com/store/Bubble-Football-p637225330) | legacy Ecwid store (not KTK code-managed); gallery |
| 8 | Cycle Tour \| Krawl Through Krakow | [/store/Cycle-Tour-p850960793](https://krawlthroughkrakow.com/store/Cycle-Tour-p850960793) | legacy Ecwid store (not KTK code-managed); gallery |
| 9 | Dwarf Arrest \| Krawl Through Krakow | [/store/Dwarf-Arrest-p808765256](https://krawlthroughkrakow.com/store/Dwarf-Arrest-p808765256) | legacy Ecwid store (not KTK code-managed); gallery |
| 10 | Gift card \| Krawl Through Krakow | [/store/Gift-card-p797667243](https://krawlthroughkrakow.com/store/Gift-card-p797667243) | legacy Ecwid store (not KTK code-managed); gallery |
| 11 | Hen Do Activities \| Krawl Through Krakow | [/store/Hen-Do-Activities-c165232789](https://krawlthroughkrakow.com/store/Hen-Do-Activities-c165232789) | legacy Ecwid store (not KTK code-managed) |
| 12 | Kidnapping Stag Prank \| Krawl Through Krakow | [/store/Kidnapping-Stag-Prank-p740772463](https://krawlthroughkrakow.com/store/Kidnapping-Stag-Prank-p740772463) | legacy Ecwid store (not KTK code-managed); gallery |
| 13 | Krakow Food Tour \| Krawl Through Krakow | [/store/Krakow-Food-Tour-p637227366](https://krawlthroughkrakow.com/store/Krakow-Food-Tour-p637227366) | legacy Ecwid store (not KTK code-managed); gallery |
| 14 | Krakow Go-Karting \| Krawl Through Krakow | [/store/Krakow-Go-Karting-p637221989](https://krawlthroughkrakow.com/store/Krakow-Go-Karting-p637221989) | legacy Ecwid store (not KTK code-managed); gallery |
| 15 | Krakow Paintball \| Krawl Through Krakow | [/store/Krakow-Paintball-p637240753](https://krawlthroughkrakow.com/store/Krakow-Paintball-p637240753) | legacy Ecwid store (not KTK code-managed); gallery |
| 16 | Krakow Pub Crawl with Krawl Through Krakow \| Krawl Through Krakow | [/store/Krakow-Pub-Crawl-with-Krawl-Through-Krakow-p637047413](https://krawlthroughkrakow.com/store/Krakow-Pub-Crawl-with-Krawl-Through-Krakow-p637047413) | legacy Ecwid store (not KTK code-managed); gallery |
| 17 | Krakow Shooting Range Package \| Krawl Through Krakow | [/store/Krakow-Shooting-Range-Package-p637227393](https://krawlthroughkrakow.com/store/Krakow-Shooting-Range-Package-p637227393) | legacy Ecwid store (not KTK code-managed); gallery |
| 18 | Life Drawing Session \| Krawl Through Krakow | [/store/Life-Drawing-Session-p637227458](https://krawlthroughkrakow.com/store/Life-Drawing-Session-p637227458) | legacy Ecwid store (not KTK code-managed); gallery |
| 19 | Morning Wake Up \| Krawl Through Krakow | [/store/Morning-Wake-Up-p828444580](https://krawlthroughkrakow.com/store/Morning-Wake-Up-p828444580) | legacy Ecwid store (not KTK code-managed); gallery |
| 20 | New Years Eve Krakow Pub Crawl \| Krawl Through Krakow | [/store/New-Years-Eve-Krakow-Pub-Crawl-p800134329](https://krawlthroughkrakow.com/store/New-Years-Eve-Krakow-Pub-Crawl-p800134329) | legacy Ecwid store (not KTK code-managed); gallery |
| 21 | Party Bus \| Krawl Through Krakow | [/store/Party-Bus-p821424470](https://krawlthroughkrakow.com/store/Party-Bus-p821424470) | legacy Ecwid store (not KTK code-managed); gallery |
| 22 | Polish Vodka Tasting \| Krawl Through Krakow | [/store/Polish-Vodka-Tasting-p637205219](https://krawlthroughkrakow.com/store/Polish-Vodka-Tasting-p637205219) | legacy Ecwid store (not KTK code-managed); gallery |
| 23 | Private Pub Crawl \| Krawl Through Krakow | [/store/Private-Pub-Crawl-p835613122](https://krawlthroughkrakow.com/store/Private-Pub-Crawl-p835613122) | legacy Ecwid store (not KTK code-managed); gallery |
| 24 | Stag Do Activities \| Krawl Through Krakow | [/store/Stag-Do-Activities-c165236286](https://krawlthroughkrakow.com/store/Stag-Do-Activities-c165236286) | legacy Ecwid store (not KTK code-managed) |
| 25 | Strip Club \| Krawl Through Krakow | [/store/Strip-Club-p637239277](https://krawlthroughkrakow.com/store/Strip-Club-p637239277) | legacy Ecwid store (not KTK code-managed); gallery |

## Additional Linked Routes

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | Discover Krakow Nightclubs: Ultimate Guide for Party-Goers \| Krawl Through Krakow | [/2017/12/13/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/](https://krawlthroughkrakow.com/2017/12/13/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-nightclubs/ (not a separate rebuild) |
| 2 | Krakow Free Activities: Budget-Friendly Exploration and Fun \| Krawl Through Krakow | [/2019/08/07/ultimate-seasonal-guide-to-the-best-activities-in-krakow/](https://krawlthroughkrakow.com/2019/08/07/ultimate-seasonal-guide-to-the-best-activities-in-krakow/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-free-activities-2/ (not a separate rebuild) |
| 3 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/](https://krawlthroughkrakow.com/author/dpbowman/) | WordPress/Divi |
| 4 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/2/](https://krawlthroughkrakow.com/author/dpbowman/page/2/) | WordPress/Divi |
| 5 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/3/](https://krawlthroughkrakow.com/author/dpbowman/page/3/) | WordPress/Divi |
| 6 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/4/](https://krawlthroughkrakow.com/author/dpbowman/page/4/) | WordPress/Divi |
| 7 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/5/](https://krawlthroughkrakow.com/author/dpbowman/page/5/) | WordPress/Divi |
| 8 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/6/](https://krawlthroughkrakow.com/author/dpbowman/page/6/) | WordPress/Divi |
| 9 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/7/](https://krawlthroughkrakow.com/author/dpbowman/page/7/) | WordPress/Divi |
| 10 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/8/](https://krawlthroughkrakow.com/author/dpbowman/page/8/) | WordPress/Divi |
| 11 | DPBowman \| Krawl Through Krakow | [/author/dpbowman/page/9/](https://krawlthroughkrakow.com/author/dpbowman/page/9/) | WordPress/Divi |
| 12 | Jess Campbell \| Krawl Through Krakow | [/author/jessie/](https://krawlthroughkrakow.com/author/jessie/) | WordPress/Divi |
| 13 | pubthroughkrakow \| Krawl Through Krakow | [/author/pubthroughkrakow/](https://krawlthroughkrakow.com/author/pubthroughkrakow/) | WordPress/Divi |
| 14 | pubthroughkrakow \| Krawl Through Krakow | [/author/pubthroughkrakow/page/2/](https://krawlthroughkrakow.com/author/pubthroughkrakow/page/2/) | WordPress/Divi |
| 15 | Krusty \| Krawl Through Krakow | [/author/thirsty/](https://krawlthroughkrakow.com/author/thirsty/) | WordPress/Divi |
| 16 | Krakow Guides \| Krawl Through Krakow | [/category/krakow-guides/page/2/](https://krawlthroughkrakow.com/category/krakow-guides/page/2/) | WordPress/Divi |
| 17 | Krakow Guides \| Krawl Through Krakow | [/category/krakow-guides/page/3/](https://krawlthroughkrakow.com/category/krakow-guides/page/3/) | WordPress/Divi |
| 18 | Kraków Nightlife \| Krawl Through Krakow | [/category/krakow-nightlife/page/2/](https://krawlthroughkrakow.com/category/krakow-nightlife/page/2/) | WordPress/Divi |
| 19 | Party Tips \| Krawl Through Krakow | [/category/party-tips/page/2/](https://krawlthroughkrakow.com/category/party-tips/page/2/) | WordPress/Divi |
| 20 | Uncategorized \| Krawl Through Krakow | [/category/uncategorized/page/2/](https://krawlthroughkrakow.com/category/uncategorized/page/2/) | WordPress/Divi |
| 21 | Uncategorized \| Krawl Through Krakow | [/category/uncategorized/page/3/](https://krawlthroughkrakow.com/category/uncategorized/page/3/) | WordPress/Divi |
| 22 | Uncategorized \| Krawl Through Krakow | [/category/uncategorized/page/4/](https://krawlthroughkrakow.com/category/uncategorized/page/4/) | WordPress/Divi |
| 23 | Uncategorized \| Krawl Through Krakow | [/category/uncategorized/page/5/](https://krawlthroughkrakow.com/category/uncategorized/page/5/) | WordPress/Divi |
| 24 | How to Join! \| Krawl Through Krakow | [/how-to-join/](https://krawlthroughkrakow.com/how-to-join/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/about-us/how-to-join/ (not a separate rebuild) |
| 25 | Other Tours \| Krawl Through Krakow | [/krakow-activities](https://krawlthroughkrakow.com/krakow-activities) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/other-tours/ (not a separate rebuild) |
| 26 | Other Tours \| Krawl Through Krakow | [/project/vodka-tasting-tour/](https://krawlthroughkrakow.com/project/vodka-tasting-tour/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/other-tours/ (not a separate rebuild) |
| 27 | 404 Not Found \| Krawl Through Krakow | [/store/Bottomless-Brunch-p661114244](https://krawlthroughkrakow.com/store/Bottomless-Brunch-p661114244) | legacy Ecwid store (not KTK code-managed); HTTP 404 |
| 28 | Store \| Krawl Through Krakow | [/store/account/favorites](https://krawlthroughkrakow.com/store/account/favorites) | legacy Ecwid store (not KTK code-managed) |
| 29 | Store \| Krawl Through Krakow | [/store/cart](https://krawlthroughkrakow.com/store/cart) | legacy Ecwid store (not KTK code-managed) |
| 30 | NYE Pub Crawl \| Krawl Through Krakow | [/store2/nye-pub-crawl-32/](https://krawlthroughkrakow.com/store2/nye-pub-crawl-32/) | code-managed storefront |
| 31 | Pub Crawl \| Krawl Through Krakow | [/store2/pub-crawl-28](https://krawlthroughkrakow.com/store2/pub-crawl-28) | code-managed storefront |
| 32 | Pub Crawl \| Krawl Through Krakow | [/store2/pub-crawl-28/](https://krawlthroughkrakow.com/store2/pub-crawl-28/) | code-managed storefront |
| 33 | Terms and Conditions \| Krawl Through Krakow | [/terms-and-conditions](https://krawlthroughkrakow.com/terms-and-conditions) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/terms-and-conditions/ (not a separate rebuild) |
| 34 | The Ultimate Krakow Weather Guide! \| Krawl Through Krakow | [/ultimate-seasonal-guide-to-the-best-activities-in-krakow/](https://krawlthroughkrakow.com/ultimate-seasonal-guide-to-the-best-activities-in-krakow/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-weather-guide/ (not a separate rebuild) |

## Redirects and Canonical Aliases

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | Krakow Pub Crawl: Nightlife, Games & Insider Tips | [/krakow-pub-crawl/](https://krawlthroughkrakow.com/krakow-pub-crawl/) | code-managed homepage; alias/redirect to https://krawlthroughkrakow.com/ (not a separate rebuild) |
| 2 | Discover Krakow Nightclubs: Ultimate Guide for Party-Goers \| Krawl Through Krakow | [/2017/12/13/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/](https://krawlthroughkrakow.com/2017/12/13/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-nightclubs/ (not a separate rebuild) |
| 3 | Krakow Free Activities: Budget-Friendly Exploration and Fun \| Krawl Through Krakow | [/2019/08/07/ultimate-seasonal-guide-to-the-best-activities-in-krakow/](https://krawlthroughkrakow.com/2019/08/07/ultimate-seasonal-guide-to-the-best-activities-in-krakow/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-free-activities-2/ (not a separate rebuild) |
| 4 | How to Join! \| Krawl Through Krakow | [/how-to-join/](https://krawlthroughkrakow.com/how-to-join/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/about-us/how-to-join/ (not a separate rebuild) |
| 5 | Other Tours \| Krawl Through Krakow | [/krakow-activities](https://krawlthroughkrakow.com/krakow-activities) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/other-tours/ (not a separate rebuild) |
| 6 | Other Tours \| Krawl Through Krakow | [/project/vodka-tasting-tour/](https://krawlthroughkrakow.com/project/vodka-tasting-tour/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/other-tours/ (not a separate rebuild) |
| 7 | Terms and Conditions \| Krawl Through Krakow | [/terms-and-conditions](https://krawlthroughkrakow.com/terms-and-conditions) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/terms-and-conditions/ (not a separate rebuild) |
| 8 | The Ultimate Krakow Weather Guide! \| Krawl Through Krakow | [/ultimate-seasonal-guide-to-the-best-activities-in-krakow/](https://krawlthroughkrakow.com/ultimate-seasonal-guide-to-the-best-activities-in-krakow/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-weather-guide/ (not a separate rebuild) |
| 9 | Activities | [/krakow-activities/](https://krawlthroughkrakow.com/krakow-activities/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/other-tours/ (not a separate rebuild) |
| 10 | Life Drawing with Unlimited Prosecco | [/project/life-drawing-session/](https://krawlthroughkrakow.com/project/life-drawing-session/) | WordPress/Divi; alias/redirect to https://krawlthroughkrakow.com/krakow-hen-do/ (not a separate rebuild) |

## Already Code-managed

| # | Page | URL | Renderer / Notes |
| ---: | --- | --- | --- |
| 1 | KTK storefront | [/store2/](https://krawlthroughkrakow.com/store2/) | code-managed storefront |
| 2 | NYE Pub Crawl \| Krawl Through Krakow | [/store2/nye-pub-crawl-32/](https://krawlthroughkrakow.com/store2/nye-pub-crawl-32/) | code-managed storefront |
| 3 | Pub Crawl \| Krawl Through Krakow | [/store2/pub-crawl-28](https://krawlthroughkrakow.com/store2/pub-crawl-28) | code-managed storefront |
| 4 | Pub Crawl \| Krawl Through Krakow | [/store2/pub-crawl-28/](https://krawlthroughkrakow.com/store2/pub-crawl-28/) | code-managed storefront |
| 5 | Krawl Through Krakow \| Best Pub Crawl in Krakow | [/](https://krawlthroughkrakow.com/) | code-managed homepage; Google Maps, embedded video, gallery, slider |

## Review Flags

- `/krakow-activities/` redirects to `/other-tours/`; preserve the route/redirect rather than count it as another independent design.
- `/project/life-drawing-session/` redirects to `/krakow-hen-do/`; the project record is published, but it does not currently expose a separate project page.
- `/krakow-pub-crawl/` is exposed as a published blog Post URL by the API/sitemap but serves the code-managed homepage and root canonical. Its article content is not currently independently visible at that route.
- The legacy `/store/Bottomless-Brunch-p661114244` link returned HTTP 404. The current new-store routing is separate; this audit does not change the link.
- The separate legacy NYE page currently begins with: `Krakow New Years Eve Party 2025 / 2026`. Confirm the intended event-year/content treatment before a future migration; the current code-managed homepage NYE hero is a different route.
- Archive pagination/author routes are listed explicitly, but they share templates. Redirect/canonical aliases and trailing-slash variants are not additional page designs.
- No draft/private/archived database inventory was obtained; public absence must not be interpreted as deletion or nonexistence.


## Evidence

- `inventory.json`: source counts, full sitemap URLs, per-route HTTP/rendering facts, features and errors.
- `inventory.csv`: flat sortable migration inventory.
- Root `AGENTS.md` and the local renderer guards confirm the intended route ownership. Public HTML checks confirm the runtime markers actually served.
- Repeat with `python tools/inventory-site-pages.py --output docs/code-pages/site-inventory-YYYY-MM-DD`.
