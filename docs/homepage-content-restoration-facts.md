# Homepage content restoration: verified facts and copy

Checked 6 October 2026. Staging-only restoration. Sources are public KTK pages, current KTK product endpoints and Vimeo's official oEmbed service. Production and staging product endpoints agree on the facts below. No checkout was submitted.

## Brand story

[About Us](https://krawlthroughkrakow.com/about-us/) and the [existing production homepage](https://krawlthroughkrakow.com/) both state that the business has operated since 2008. The public WordPress record for About Us was last modified on 18 August 2026. Treat this as the business's published history, not an independently verified incorporation date. Do not retain the stale "over 14 years" calculation or the unsubstantiated original/best/#1 claims.

Recommended heading: **Krakow nights since 2008**

Recommended copy: "Krawl Through Krakow brings travellers together for nights around the Old Town. Our guides host the evening and lead the way between bars and clubs. Come with friends or join on your own."

The hosting, venues and photographer are also supported by the [current regular-crawl configuration](https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products/pub-crawl-28); solo guests are expressly welcomed in the [official FAQ](https://krawlthroughkrakow.com/faqs/). Link the story to `/about-us/`. Avoid guaranteed safety, attendance numbers, universal availability and a fixed total tour duration.

## Student groups

The [official student page](https://krawlthroughkrakow.com/student-trips-poland/) addresses university societies, classes, sports teams and students visiting Krakow. Its enquiry form asks for the university/society, group size and intended activities.

Recommended heading: **Student trips to Krakow**

Recommended copy: "Planning a society trip, sports-team weekend or student group visit? Tell us your group size and what you would like to do. Our team can help put together an offer for your trip."

CTA: **Plan your group trip**, linking to `/student-trips-poland/`. Do not reproduce unverified student totals, lowest-price promises or unconditional 24/7 support. No specific discount amount is established.

## Current secondary products

| Product | Verified facts | Suggested homepage copy |
| --- | --- | --- |
| [Private Pub Crawl API](https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products/private-pub-crawl-31) | 120 PLN; minimum 10 participants; hourly start options from 17:00 through 22:00; one-hour open bar; 4-5 bars/clubs; welcome shot at each venue; guides and photographer. | "Bring your own group. Choose a start time and explore Krakow's nightlife together, with a one-hour open bar and entry to 4-5 bars and clubs. For groups of 10 or more." |
| [NYE Pub Crawl API](https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products/nye-pub-crawl-32) | 250 PLN; fixed 31 December 2026; 17:00 or 19:30; two-hour open bar; buffet with vegetarian/vegan options; three bars/clubs; welcome shots, guides and photographer; meeting point TBA. | "Celebrate 31 December with two hours of open bar, a buffet and a night across three bars and clubs. Choose the 17:00 or 19:30 start." |
| [Bottomless Brunch API](https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products/bottomless-brunch-29) | 250 PLN; image and product name present, but `config` is empty. The official homepage and [current legacy brunch listing](https://krawlthroughkrakow.com/store/2-Hour-Bottomless-Brunch-with-3-Course-Meal-And-Drinks-p808765006) advertise a three-course meal with two hours of unlimited drinks. | "Make time for a three-course meal and two hours of unlimited drinks. A get-together for friends, celebrations and group trips." |

Use environment-aware current routes: `/staging/store2/private-pub-crawl-31/`, `/staging/store2/nye-pub-crawl-32/`, `/staging/store2/bottomless-brunch-29/`. Prices are current observations, not future guarantees; do not add "from" unless a meaningful price range exists.

Important boundaries:

- Private crawl does not establish exclusive hire of every venue, custom itineraries or free hotel collection. Its current meeting point is Adam Mickiewicz Monument, with the pink umbrella.
- The [legacy NYE page](https://krawlthroughkrakow.com/new-years-eve/) still says 2025/2026. Do not copy its year, venue itinerary, euro conversion, remaining-place claim or 30-minute re-entry limit into the new section. Use the 2026-12-31 product configuration; do not substitute the regular crawl's meeting location for TBA.
- The legacy brunch listing describes specific dishes, spirits/cocktails and photo deliverables, but none are configured on product 29. Keep homepage copy to the corroborated meal/drink offer. No start time, venue or participant minimum is verified for the new brunch product.
- The old homepage brunch button `/store/Bottomless-Brunch-p661114244` returns 404. Do not restore it.

## Gallery and video

The exported original `staging/wp-content/mu-plugins/ktk-homepage-shortcode-content.php` contains the gallery/social imagery and this exact Vimeo embed:

`https://player.vimeo.com/video/892352668?h=df4cdc75d0`

The same embed exists on the current About Us page. [Vimeo oEmbed response](https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F892352668%2Fdf4cdc75d0&width=1280) successfully returned:

- Video ID: `892352668`; title: `Promo`; author: `Krawl through krakow`.
- Duration: 31 seconds; dimensions: 1280 by 720; uploaded 7 December 2023.
- Exact poster URL: `https://i.vimeocdn.com/video/1789191543-01b474c13a1d3407f0fb359954eb33b9e6e2d821c62a2815df18cfb7956d504c-d_1280?region=us`.
- Poster HEAD check: HTTP 200, `image/jpeg`, 41,663 bytes.

This is a verified downloadable poster source, not a guessed thumbnail ID. Fetch during asset preparation, optimize locally and serve the local image with explicit 16:9 dimensions. No runtime oEmbed request or initial Vimeo iframe is necessary for a linked preview. A regular link to `https://vimeo.com/892352668/df4cdc75d0` can work without homepage JavaScript; retain the hash if embedding on deliberate activation. Vimeo's [oEmbed documentation](https://developer.vimeo.com/api/oembed/videos) describes the metadata fields, and its [privacy documentation](https://help.vimeo.com/hc/en-us/articles/12426199699985-About-video-privacy-settings) explains why unlisted sharing/embed hashes must be retained. Successful metadata retrieval is not a full playback test.

Suggested gallery heading: **Nights from the Krawl**. Video link label: **Watch the Krawl**, with **31 seconds** as optional supporting text. Link more photos to the [official gallery](https://krawlthroughkrakow.com/gallery/) or [official Instagram](https://www.instagram.com/krawlthroughkrakow/). Use verified KTK images, inspect them before writing alt text, and do not imply that older gallery photos show the current week's guests or guaranteed future venues.
