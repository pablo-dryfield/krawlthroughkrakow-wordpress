# Approved NYE Promotion Transition

In progress, staging-only. Owner explicitly selected **1 January 2027 at 12:00
Europe/Warsaw**, `2027-01-01T12:00:00+01:00`, epoch1798801200. At that point,
show next dates TBA and use NYE information links, not checkout. No new2027 event,
price, availability, cart, order, consent or OmniLodge change is authorized.

## Checkpoint

Branch `codex/staging-nye-promotion-expiry` from PR33 merge3330fe6. Final shared-
facts source9789c7a passed both required CI43507202872 jobs and matched the merge
tree; own prior reference/branches removed. The shared-facts application165ef85
is already staging cache-verified, not this unfinished expiry feature.

Before edits, all3136 tracked files and ZIP CRC verified in
`deploy-backups/seo-nye-expiry-before-20261113.zip`, SHA256
`7744e37212364096d27cdcbcebf5743a9f0515c1a531b49d300293dd0324edc6`.
Clean reference: `deploy-backups/seo-nye-expiry-baseline`. Root previews5184/5185
remain task-owned. No expiry source is committed, pushed or deployed yet.

## Implementation Scope

- Shared reviewed JSON now owns the exact promotion cutoff, separately from the
  event date and midnight countdown. It does not create future dates.
- Hero PHP has explicit-clock tests and a server-side TBA/information state.
  The regular offer, original vector artwork and historical2027 welcome flag stay.
- One native lifecycle function is built into both existing owned JS runtimes.
  It handles current cached/open pages, timers, visibility and BFCache return,
  updating only marked NYE components. No network/storage/consent calls added.
- The NYE page gets a dated previous-event/TBA notice, changes all8 original
  NYE controls including its floating tab, replaces its price promotion and
  availability paragraph, and resolves description/sharing/schema after expiry.
  Forms, media, meaningful anchors and all other page bodies remain unchanged.
- Server body changes use exact source-bound fragment pairs produced by the
  existing DOM builder, with full validation before mutation and idempotence.
  No public URL parameter can override server time; clock previews are guarded
  local-only PHP tools. Current markup remains backwards-compatible while
  dependencies upload, not unresolved public placeholders.
- Future notice CSS is scoped to its own component. Its inert template uses H2,
  promoted to the sole H1 only when replacing the countdown. This avoids a second
  raw-source H1 before expiry. The detached countdown stops its interval.

## Preserved Diagnostics And Current Evidence

The first full builder stopped on the NYE target guard,115/116. Earlier heading
work deliberately made the price a P with `data-ktk-heading-origin="h1"`; the new
selector incorrectly expected H1/H2/H3. The selector now binds that exact P,
without relaxing the count/text/control guard. Failed build evidence is
`expiry-first-build-failure.json`; fresh builders subsequently completed116/116.

An initial PHP DOM assertion counted the inert template's future H1 as a second
live H1 (libxml's HTML4 tree differs from browser template semantics). The actual
implementation now uses inert H2/promotion at expiry, so even raw source has only
one H1. The notice-state XPath excludes only template descendants. Fresh server
boundary/idempotence/header/control tests pass74/74. Six new JS contracts plus10
shared-fact contracts pass16/16. Existing PHP763 and home integration pass.

Local lifecycle verification passes **552/552**: before/at/after cutoff on four
widths, fresh server/no-JS, cached JavaScript, timer/visibility/BFCache return,
clock rollback, real hero navigation attempts and all eight native event-page
fragment controls. Providers/non-read/commerce requests were blocked, and the
three information navigations were intercepted before sending. No orders made.

Source preservation passes **2,311/2,311**: all other 115 content bodies and
definitions, original styles/media/fonts/artwork and protected application
sources remain exact. Current NYE DOM is equal after removing only the owned
lifecycle attributes and inert future template. Build verification 2,320/2,320,
shared JS 123/123, Python 184/184, PHP 763/763, forms 31/31 (mail stubbed), new
PHP 74/74 and homepage integration pass. Attribution remains 136/136.

Eight current and eight simulated-future automated accessibility views each
have zero violations, with 18 incomplete rule groups retained per matrix. This
is not full accessibility, privacy or payment certification. Actual mobile
future and current screenshots were inspected.

The first strict comparison is retained as `expiry-current-layout-local`
(9/17): it sampled running original animations/images before settling. The
settled comparison is 13/17: all eight current-page geometry, typography and
meaningful text comparisons pass, as do all four homepage exact viewport PNGs.
Four NYE strict PNG differences remain; no artwork, tolerance, mask or application
CSS was changed to hide them. The unchanged-baseline control passes 17/17;
its separate source, screenshots and report are retained. All four current
NYE screenshots were reviewed: no visible content or framing change was found,
but the strict raster differences remain unexplained, not a claimed pass.
Do not call this a completely passing strict pixel suite.

CI and guarded staging release/cache verification remain pending; local test
evidence is not deployment or edge-cache proof.

## Cache Boundary To Retain

Fresh PHP renders the correct post-cutoff state without JavaScript. Existing
feature-aware cached/open pages transition with JavaScript. A stale pre-cutoff
HTML response with JavaScript disabled cannot change itself: a cutoff cache
refresh/expiry remains an operational release consideration. Do not claim every
possible no-JS edge cache is solved or smuggle Cloudflare OAuth credentials into
the website. No cron/database schedule, Cloudflare setting or future purge task
has been installed. Review this boundary before production approval.

Other guides/FAQs may retain explicitly dated historical event context; broader
incoming NYE-promotion links need a separate audit before declaring C02 complete.
