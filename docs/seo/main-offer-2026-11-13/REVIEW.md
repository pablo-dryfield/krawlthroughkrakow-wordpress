# Main Offer Review

C01/G01/D05 staging work, 13 November 2026. Homepage copy and the mobile-clearance
follow-up are deployed and verified on normal cached staging pages.
Product pricing, checkout, hero artwork and production are unchanged.

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
IDs, heading elements/attributes, navigation, CTA buttons, review counts, captured
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

## First Staging Release And Mobile Follow-up

Application45714e8 / PR31 passed both required jobs in CI43490619753. The manual
assets-only publisher completed19:19:53UTC with232 independent hash matches,
origin cache cleared and helper removed. It does not rewrite saved posts/settings;
this is not a whole-database snapshot audit. Backup:
`deploy-backups/ktk-homepage-shortcode-staging-20261113-191841.zip`, SHA256
`94797dd97f2cf38c2406283b7a4cf664eb59bd48930f30e518412a6cfaca596d`.

Origin/normal initial-copy checks87/87 and browser322/322 pass; staged attribution
115/115 includes the two new native homepage links, correctly withheld journey
records before consent and clean labelled destinations afterwards. No navigation,
cart, order or payment is submitted. MCP staging-only prefix purge accepted
19:21:11.647UTC; all three device variants MISS then HIT. Home10 asset hashes and
native36/36 pass; two normal axe views have zero violations/five incomplete groups.
Initial graph142 pages/6217 edges/no unknown paths retains the same six held tags.

Actual mobile inspection then found copy close enough to the existing floating
tab to be obscured, despite the initial fit assertions. The initial reports and
screenshots are retained, not treated as final visual success. A narrow homepage-
only <=600px clearance block now covers the revised modules; no other original
runtime rule, captured CSS, artwork or wide layout changes. The test now checks
actual intersections with both booking tabs. Local source24/24, browser312/312,
native36/36 and two axe views with zero violations pass. The new mobile screenshot
is inspected. This follow-up needs required CI, its own backup/manual deployment
and new normal cached-device verification before the delivery is marked verified.

## Final Verified Staging Delivery

Application0a00906 passed both required jobs in CI43492193402. The second manual
assets-only publisher completed19:29:51UTC with232 independent SHA256 matches,
origin cache cleared and its helper removed; saved posts/settings are not rewritten
(not a full database-state snapshot). Follow-up backup:
`deploy-backups/ktk-homepage-shortcode-staging-20261113-192834.zip`, SHA256
`dfa70fcfc241db4aee66cac36ecabc84cf7610336acfa0ceb05f270c306cef52`.
For full feature rollback use the original191841 checkpoint, not just this
intermediate copy-without-clearance checkpoint. Restore only owned feature files.

Final checks:

- Source24/24: all asset inventory retained; only body PHP and one exact, scoped
  runtime-CSS block differ. Original runtime bytes outside that block are exact.
- Responsive312/312 local;322/322 origin and normal staging, ten JS/no-JS views,
  320-1920px. These include text intersections with both floating tabs.
- Native keyboard/reflow36/36 origin and normal; actual mobile/desktop screenshots
  inspected. The final390px rules screenshot is also exactly identical in decoded
  pixels to the inspected local clearance view (zero changed pixels). This is one
  view, not whole-page or original-copy pixel identity.
- Shared JavaScript107/107, Python181/181 and homepage PHP integration pass.
- Two normal axe views: zero violations, five incomplete groups; no full-WCAG,
  assistive-technology, cookie-safety or payment certification claimed.
- Copy87/87 origin, clean and repeat: all27 targets and new native links, canonical
  and noindex checked on desktop, Android and iPad. Final normal variants are HIT.
- Home10 active asset hashes/version tokens and all six icon hints21/21 current.
- Attribution115/115 on the final cached pages: two new body links hand off incoming
  attribution, no hardcoded values, denied journey withheld and consented labelled
  clicks recorded only in isolated browser storage. Zero writes/navigation/orders.

The first follow-up browser/asset sample started while the publisher was finishing;
it is preserved but not used as release proof. Fresh `*-clearance-final` origin
reports were started only after publisher exit0. The final staging-only Cloudflare
prefix purge was accepted19:31:36.804UTC; `offer-clean-clearance.json` has three
MISS responses, `offer-repeat-clearance.json` three HIT. API acceptance alone was
not treated as eviction proof. Both publishers and all finite test sessions are
closed. Baseline PHP86617 is closed; root previews remain for the next batch.

No website production, product/coupon configuration, storefront application,
commerce, forms, consent, account or OmniLodge change. The homepage URL and its
metadata/indexing contract remain intact. Joining/meeting/FAQ consistency is the
next reviewed scope, not already delivered by this homepage release.

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
