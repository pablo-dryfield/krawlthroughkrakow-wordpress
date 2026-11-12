# Homepage redesign: offer evidence

Checked 6 October 2026. Live product configuration takes priority over legacy marketing pages. This is an implementation reference, not new operating policy.

## Current offer

Primary source: [production Pub Crawl API](https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products/pub-crawl-28). The [staging endpoint](https://krawlthroughkrakow.com/staging/wp-json/ktk-storefront/v1/products/pub-crawl-28) currently agrees on the main offer and availability configuration.

| Fact | Verified value / copy decision |
| --- | --- |
| Product | ID 28, slug `pub-crawl-28`, name Pub Crawl |
| Base ticket | 120 PLN per person; no gender-specific price in the product configuration |
| Start | Fixed 21:00, shown as 9 PM for English-language visitors |
| Open bar | One hour; rum, vodka, whiskey, gin, beer and soft drinks |
| Venues | VIP entrance to 4-5 bars/clubs |
| Shots | One welcome shot at each venue |
| Hosts / photos | Professional guides and photographer included |
| Meeting | Adam Mickiewicz Monument, Rynek Glowny, 31-042 Krakow; look for the pink umbrella |
| Directions | [Current product map](https://maps.app.goo.gl/S3kQZC5rdABdpA1G9) |
| Special dates | Normal product blocks 31 December 2026 and redirects to product 32, `nye-pub-crawl-32` |
| Cancellation | Full refund or credit with 24 hours' notice. Operator cancellation also allows refund/credit. Requests inside 24 hours and no-shows are not refundable under the active policy |
| Support | +48 791 847 981; pubthroughkrakow@gmail.com |
| Upgrade | Cocktail upgrade: +30 PLN per selected attendee for the one-hour open bar |
| Other add-ons | T-shirts 44 PLN; instant photo packages priced separately. Do not describe the paid instant-photo package as included |

The product API supplies cancellation policy in `storefrontConfig.cancellationPolicy`, so that is the stronger source than general WordPress terms. Its important-information array is empty; it does not specify age, physical ID, dress restrictions or a total tour duration.

## Corroboration and conflicts

| Topic | Evidence and treatment |
| --- | --- |
| Joining | [How to join](https://krawlthroughkrakow.com/about-us/how-to-join/) confirms online booking, 120 PLN, 9 PM and the pink umbrella. Use current `/store2/pub-crawl-28/#book`, not old FareHarbor/Ecwid links. |
| Location | [Meeting point](https://krawlthroughkrakow.com/meeting-point/) confirms Adam's statue at 9 PM; describes a pink sign. Prefer the current API's pink umbrella wording. This is a meeting landmark, not verified business premises. |
| Duration | [Official FAQ](https://krawlthroughkrakow.com/faqs/) says the last club is usually reached around 1 AM. Tripadvisor's product listing says 5-6 hours. No duration in live configuration. Omit an exact duration from headline/offer/schema; optional FAQ can attribute the approximate arrival at the final club, or omit pending confirmation. |
| Solo travellers | Official FAQ explicitly welcomes solo travellers and describes games and mingling. Safe to welcome solo travellers, couples and groups without inventing guest demographics or attendance guarantees. |
| Dress | FAQ says casual or dressed-up clothing is fine, but some clubs restrict costumes. Avoid an unconditional "no dress code" promise. |
| Late arrivals | Official FAQ advises contacting the team, preferably Facebook, for the starting bar. [Contact page](https://krawlthroughkrakow.com/contact/) confirms the phone number. Use a phone/contact action, not a made-up late-arrival grace period. |
| Legacy pricing | FAQ top says 120 PLN but lower sections say 95 PLN and gender-specific 89/95 PLN. Discard those stale prices. |
| Every night | Official pages describe daily departures; current API contains a NYE exception. "Nightly at 9 PM" with a date-check booking action is reasonable, but do not promise every date is available or the ordinary ticket covers NYE. |
| Age / ID | No explicit regular-crawl age/physical-ID rule found in active product, joining page, meeting page or FAQ. [Privacy policy](https://krawlthroughkrakow.com/privacy-policy/) says services are not intended for under-18s, but that is not a verified venue admission policy. Keep exact age/ID requirements out of customer copy pending confirmation. |
| Ranking / history | [Old homepage](https://krawlthroughkrakow.com/) claims #1 and since 2008. Do not repeat #1 as an independently established ranking. If history is useful, "Krakow nights since 2008" is an existing business claim, not externally verified founding evidence. |
| Review totals | Old homepage displays 900+, 2,297 Tripadvisor and 582 Google counts; FAQ says 3,000+ across platforms. These disagree and are not a current combined aggregate. The owner's later hero request prompted fresh platform-specific research: see [review-count evidence](homepage-review-counts.md) for conservative Tripadvisor/GetYourGuide totals and the unconfirmed Google count. Do not reuse the old figures or sum platforms. |

## Traceable social proof

[Tripadvisor business listing](https://www.tripadvisor.com/Attraction_Review-g274772-d2725527-Reviews-Krawl_Through_Krakow_Pub_Crawl-Krakow_Lesser_Poland_Province_Southern_Poland.html) was accessible through the web reader, which labels its cached content eight months old. It shows 4.9/5, 2,979 business reviews and a 2025 Travelers' Choice award, while its individual regular-crawl product shows a different review count. Do not publish these as freshly verified October 2026 totals. Link visitors to read the current reviews instead.

One traceable short excerpt is James B, Tripadvisor, written 18 March 2023: "you meet some great people from all walks of life." Link to the listing/review and show the author/date if used. Do not fabricate a fresh testimonial or combine platform ratings.

[Facebook photos](https://www.facebook.com/krawlthroughkrakow/photos) and [Instagram](https://www.instagram.com/krawlthroughkrakow/) are the official social destinations linked by the FAQ. The FAQ says edited photos generally appear after several days; avoid guaranteeing a delivery deadline.

## Secondary destinations and media

Confirmed by the [current product catalogue](https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products). Prefix paths with the environment-appropriate `/store2/` route.

| Journey | Current destination |
| --- | --- |
| Private pub crawl | `private-pub-crawl-31/` |
| NYE | `nye-pub-crawl-32/` |
| Bottomless brunch | `bottomless-brunch-29/` |
| Food tour | `food-tour-krakow-48/` |
| Boat party | `boat-party-41/` |
| Student trips | [Existing established page](https://krawlthroughkrakow.com/student-trips-poland/) |
| Stags / hens | [Existing established page](https://krawlthroughkrakow.com/stagshens/) |

Regular-crawl authentic photo URLs are in the product API's ordered `images` list under `https://media.krawlthroughkrakow.com/products/28/`. The first six are `01-e2e9c1ac57e0.jpg`, `02-bfca29e0a910.jpg`, `03-a29f6fa70f31.jpg`, `04-6464975d9c00.jpg`, `05-412d9fc0a63e.jpg`, and `07-97eb1d9cb507.jpg`; two additional WebP uploads follow. Alt text is generic and does not prove who appears or which venue is pictured. Inspect actual images before selecting crops or writing descriptive alternatives.

## Proportionate competitor benchmark

[Krakow Animals Crawl](https://www.krakowanimalscrawl.com/) makes product, price, departure, location and booking visible early; groups inclusion, sequence, practical FAQ and real photo evidence. Its offer is 10:15 PM at St. Wojciech Church, so neither those operating details nor its review evidence belong in KTK copy. Category lesson: visitors should not hunt for the practical facts, and meeting people is as important as drinks.

[Krakow Crawl](https://krakowcrawl.com/) exposes price and start time early, then inclusion icons, a meeting section, FAQ, venue examples and secondary tours. Its long repeated marketing and broad sidebar journeys create an opportunity for KTK to be more concise. Its 9:45 PM meeting and cancellation promise are different; do not import them.

KTK's defensible differentiation is its authentic event imagery, recognizable pink umbrella, 9 PM start, hosted Old Town experience and straightforward value explanation. Do not claim a competitor comparison proves better conversions.

## Items genuinely requiring owner confirmation

- Regular-crawl minimum age and required form of ID.
- Whether an approximate total hosted duration should be promised; published sources conflict.
- A current review score/count or specific review source if numerical proof is desired.
- Any stronger rescheduling policy; the verified policy only covers cancellations.

None of these prevents a complete homepage using the verified offer and source-linked review evidence.
