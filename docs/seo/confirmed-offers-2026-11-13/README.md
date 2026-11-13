# Confirmed Offer Corrections

Staging only. Owner confirmed Food Tour13-14 tastings and keeping Halloween's
existing URL as a past-event page with next dates TBA. No OmniLodge product
configuration, production, prices, payments, consent or customer data is changed.

## Checkpoint

Base `eb82911e122f8aca64272adc4cd71619c9870e4b`, merged accessibility PR11.
Final PR11 source786156d passed required CI43346833381; exact feature/merge
trees match. Its task branch was removed; only the root worktree remains.

Pre-edit `deploy-backups/storefront-confirmed-offers-before-20261113.zip`:
61 tracked entries independently verified, SHA-256
`ec71cf13c7d91c7a946e653db271cf70f3ce7d9d3aa60950eeeacc52bf263fd5`.

## Owned Changes

- Shared website fallback data fills Food Tour's absent summary with13-14 Polish
  food tastings; authoritative configured summaries retain precedence. Current
  highlights already have the correct count. The conflicting10 is in an unused
  upstream `content.card.stats` entry, not an actual rendered generic summary.
  It remains an upstream cleanup item; no shared backend configuration was edited.
- Halloween keeps its exact URL, name, photos and historical inclusions/meeting
  details, labelled2026. Initial PHP and client show the event-finished/TBA copy.
  The old current-price display and booking configurator are replaced with a
  native regular-Pub-Crawl link. The catalogue labels the retained past event.
- One JSON source supplies both renderers. The notice requires product51, its
  exact confirmed29-31 October2026 date configuration, and a later Warsaw date.
  Changed/new campaign dates or a current/future available override release the
  old editorial hold; missing/unknown configuration never invents a campaign.
  Server availability, quote/cart, payment and stored product data are untouched.
- Past-page metadata leads with the finished/TBA statement. It emits a WebPage
  graph rather than an active Product/Offer and omits current social price/stock
  claims. Other products and the existing non-staging metadata policy are unchanged.
  This is not a rich-result eligibility guarantee or a whole-store schema audit.

The past-event schema choice follows Google's requirement for current,
representative [structured data](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
No future Event, price, dates, review rating or stock value is fabricated.

## Verification

Local focused initial/client checks120/120 across320/390/768/1440, PHP public70/70,
proxy8/8, frontend60/60 and Python152/152 pass. Four local enhanced Food/Halloween
axe views have zero automated violations, with incomplete checks retained.
Stubbed cart/payment-lock18/18 and short-window104/104 pass without real writes.
The local first104/120 report is retained: its16 failures compared CSS-uppercase
`innerText` with the original mixed-case H1. The corrected check requires exact
original `textContent`; no application heading or tolerance was changed for it.

Mobile/desktop screenshots inspected, including real first photos. Initial
mobile CTA text wrapped; a scoped14px link style centres its label separately
from the arrow and removes the default anchor underline. Historical inclusions
and meeting labels explicitly carry2026. No claim that every lazy thumbnail was
loaded in a full-page capture is made.

Final payload-bound public matrix811/811 and general accessibility176/176 pass.
The eight sampled normal-height geometry comparisons remain unchanged; screenshot
bytes differ from the earlier pre-contrast baseline, not a claim of pixel identity.

## Staging Delivery

Version2026.11.13.3 is deployed. Publisher finished01:53:49UTC, independently
verified all12 owned files/runtime plus unchanged protected staging, production
and saved state; temporary helpers removed. Backup
`storefront-public-staging-20261113-015324-982800.zip`, SHA-256
`53bdf40ba04c4e37516d00db7985e790d72b84ce52ca93170d36b29f56eff5e7`.

Actual origin public HTTP692/692, focused initial/client144/144 (including live
schema, social metadata, canonical and noindex), general accessibility176/176
and short-window104/104 pass. Four enhanced origin Food/Halloween views have zero automated violations
and retain incomplete checks. The inherited blocked-Facebook-provider fbq errors
are recorded, not hidden or repaired by changing tracking. Actual mobile/desktop
screenshots inspected, including the clearer historical labels and centred CTA.

Normal edge-cache verification awaits the already requested owner staging-prefix
purge; origin checks are cache-busting evidence only. No production SEO release
or OmniLodge configuration change is included. Use the existing12-file staging
publisher with this verified checkpoint for any scoped follow-up, never the
default production storefront publisher.
