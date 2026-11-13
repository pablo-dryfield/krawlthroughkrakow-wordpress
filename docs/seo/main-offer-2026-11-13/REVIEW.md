# Main Offer Review

C01/G01/D05 staging work, 13 November 2026. Homepage body copy is now a local
candidate, not deployed. Product pricing, checkout, hero artwork and production
are unchanged.

## Current Evidence

The public staging catalog's product28 (`pub-crawl-28`) currently reports:

- Regular start21:00; Adam Mickiewicz Monument, Rynek Glowny; pink umbrella.
- One-hour open bar; configured highlights include spirits, beer and soft drinks.
- VIP entrance to4-5 bars/clubs; welcome shot at each venue; guides/photographer.
- Current base price120 PLN. This is not a guarantee of every date's final quote.
-31 December2026 redirects to the separate NYE product32. Regular9PM wording
  must not be mistaken for the confirmed5PM/7:30PM NYE groups.
- Cocktail add-on availability has selected weekdays; do not imply it is always
  included/available or alter that backend configuration in a copy update.

Source: [public catalog](https://krawlthroughkrakow.com/staging/wp-json/ktk-storefront/v1/products).
These are current configuration facts, not an independently verified promise of
future availability, venue partnerships, unlimited admission or a fixed route.
Owner previously confirmed the regular9PM meeting and NYE details separately.

## Homepage Inventory

Original hero, statues, fan geometry, seasonal brand typography and top reviews
remain outside the proposed body-copy change. The page currently has13 sections.

- Sections1/5 repeat offer inclusions; details broadly match the catalog but
  “5 DIFFERENT VENUES” overstates a4-5 range. Avoid guaranteed “best parties”.
- Section1 says “over14 years”, section3 “almost a decade”, section6 “more than
  a decade”. Prefer the stable, confirmed “since2008”, not a guessed rolling age.
- Section3 contains the same long games/venues paragraph twice. Replace with
  distinct practical information, not extra words to hit an SEO length target.
- Existing text encourages ordering multiple drinks at once and drinking as
  much/as strongly as possible; replace with social, optional participation and
  practical planning, not medical advice or a risk-free guarantee.
- A repeat-night wristband discount is promised without an identified current
  rule/code. Owner confirmation requested asynchronously; no pricing change.
- “Every single night of the year” needs context for special-event dates and
  actual bookable availability. The approved hero itself is not being redesigned.
- Photography is advertised as automatically uploaded to Facebook and all guests
  as “kept safe”. Avoid blanket privacy/safety assurances; do not invent a photo
  delivery/opt-out process without confirmation.
- Keep current real photos/gallery/review snapshots and useful native booking,
  joining/meeting, group and FAQ destinations. Do not add price to the hero.

## Proposed Bounded Batch

Create a source-bound body-copy revision and shared confirmed-facts source,
preserving meaningful IDs, original module styling/controls and all other sections.
Keep pricing and availability authoritative in the existing live storefront;
do not silently change checkout, discounts or upstream configuration.

Owner confirmation received: minimum age 18; bringing valid ID is recommended.
The owner corrected the return-visit procedure before release: cash return guests
speak with the leader to confirm their previous participation; online guests show
the leader their previous booking confirmation to receive a discount code, or use
the code from the previous day's WhatsApp group. No amount, actual code, universal eligibility
or new checkout logic is invented. No cancellation policy, prize value, bar
itinerary, arrival grace period or admission guarantee is assumed.

## Local Candidate

`tools/site-offer-facts.json` is the reviewed shared build input, with strict
identity/policy guards; it is not a live link to the product database. The source-
bound template changes exactly 27 homepage text targets, including three unsupported
number-one claims replaced by factual operator/history headings. Hero, photos, meaningful
IDs, heading elements/attributes, navigation, CTA buttons, review counts, all
styles and integration code are preserved. New links use the existing environment-
relative URL pipeline. Prices and actual availability stay in the storefront.

Initial source test `source-first.json` retained two test-contract failures: new
template links had not been passed through the expected staging URL mapping, and
the old `5 DIFFERENT VENUES` substring also matched the correct `4-5` range. The
test now applies the existing explicit portability step and checks the complete
new heading. No application guard or screenshot tolerance was weakened.
Initial responsive copy run: 282/282 checks, ten JS/no-JS views at 320-1920px.
Final local source20/20, corrected responsive312/312, native keyboard/reflow36/36,
shared JavaScript106/106, Python181/181 and homepage PHP integration pass. Two
axe views have zero violations and five incomplete groups requiring manual review,
not a whole-site conformance certificate. Actual mobile/desktop captures inspected.
Required CI, staging release and normal-cache verification remain pending.

The next run (`browser-corrected-policy/report.json`, 306/312) retained six
heading-line-box assertions. A 1440px clean baseline/control comparison shows
the identical font and -3px glyph ascent on both versions, visible overflow and
no collision with the following heading. The browser test now measures horizontal
containment, actual clipping ancestors and neighbouring text collisions rather
than treating normal font ascent as clipping. No font/CSS edit, hidden content,
screenshot mask or increased tolerance was used.

Validate source identity, excluded hero/media/consent, responsive text fitting,
navigation/attribution, no-JS content and guarded staging/cache delivery. Treat
new body layout changes honestly, not as pixel-identical original capture output.
Owner/production review still follows the staging plan.
