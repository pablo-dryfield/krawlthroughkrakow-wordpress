# Joining, Meeting Point And FAQ Review

Read-only follow-up inventory, 13 November 2026. These three pages are not changed
by the homepage-copy release. This is the next bounded C01/G01/D05 staging batch.

## Implementation Checkpoint

Now developing on `codex/staging-offer-companion-pages` from PR31 mergeca8d37d,
after final CI43493583707 passed and exact feature/merge trees were checked. The
previous own reference/server/branches are removed; root previews remain available.
Pre-edit archive `deploy-backups/seo-offer-companion-before-20261113.zip`, SHA256
`5aef567ae05fe08ab58036aad2c3a011ad3da322c68295fb79f166e52e181232`,
has all3120 tracked files, verified CRC and exact source bytes. The first archive
inventory check included ZIP directory records; the corrected file-only inventory
and all byte comparisons pass. No source data was changed to make it pass.

Three source-bound templates now revise19 text/answer targets. A post-build scan
found a second120 PLN blurb and old pink-sign directions in How to Join's promo;
both are now included, not left contradictory. The copy step runs after heading
classification so replacing a numeric price cannot restore a spurious H2.
Shared canonical
cash/online return instructions now feed both the homepage and companion copies;
the homepage output must remain exact. Original capture identities are pinned,
and all12 FAQ questions/controls, photos/map/forms/H1/metadata remain outside the
copy revision. Not deployed. First unit run7/8 retained a fixture mismatch between
raw apostrophes and deliberately HTML-encoded text; the fixture now checks the
required encoding. No application guard was weakened.

First full build/source checks2320/371 pass with unchanged definitions, other113
bodies, immutable media manifest and homepage payload. First focused browser
run249/253 retained a map-fixture error: actual maps use `data-ktk-embed-src`, not
only `data-ktk-map-src`. The harness now checks both supported contracts, exact
map counts on all three pages, and disallows vacuous passes for empty selections.
No consent/runtime code was changed. No-JS initial HTML contains all answers;
only the original first accordion answer is visible without JavaScript. This is
an inherited progressive-enhancement limitation, not claimed as JS-free accordion
functionality or a new regression. Revised directions and joining copy are visible.

The corrected local browser run277/277 and expanded source/atomic-negative checks
416/416 pass. All12 native FAQ controls and actual map counts/denied/granted/revoked
states are checked. Initial six-view axe scan finds four new low-contrast link
instances (two FAQ, two pink promo); retained as `companion-axe-local/report.json`.
Scoped existing darker-pink/white link colours and underlining now address those
new surfaces without changing buttons, captured CSS or the consent runtime.
Fresh accessibility/browser verification is still required; no release yet.

Latest local checks: build2320, source416 (including atomic malformed/stale target
tests), focused browser361, native keyboard/reflow118 and shared JavaScript112
pass. Six initial axe views now have zero violations and12 incomplete groups;
all12 FAQ controls and denied/allowed/revoked map states are checked separately.
Real mobile/desktop screenshots inspected. A PHP integration test still demanded
the deliberately removed120 PLN price; its content assertion now expects the new
ticket heading plus additional explicit age/ID, cash/online and obsolete-policy
checks. Preserve that initial failure; no route/consent/form guard is relaxed.
Homepage rebuild is byte-identical, definitions/discovery unchanged and only3
content bodies plus scoped runtime CSS differ. CI and staging release remain.

| Page | Current conflict | Planned correction |
| --- | --- | --- |
| How to Join | Static 120 PLN; automatic guaranteed availability; vague return discount | Native current booking/availability link, confirmed eligibility, leader/confirmation return procedure, useful meeting/FAQ links |
| Meeting Point | Pink-sign-only directions; no special-event distinction | Confirmed regular 9 PM Adam Mickiewicz Monument/pink umbrella, retain map/photos, separate NYE times/TBA meeting guidance |
| FAQ | 120/95/89 PLN and wristband rules conflict; contact form promises an automatic reservation | Current booking destination, owner-corrected return procedure, age/ID and availability guidance |
| FAQ | Every-night-of-year and regular meeting text also covers NYE | Distinguish bookable regular dates from the separate NYE event |
| FAQ | Over 20 partner venues, 900 alcohol licences, universal early-morning opening, guaranteed friends | Keep confirmed 4-5 venue range and variable route; remove unsupported numerical/guaranteed claims |
| FAQ | Photo-upload deadline and third-party praise unconfirmed; pasted Facebook roles/tabindex/tracking URLs | Keep meaningful direct photo/review links and current source-backed information, not an invented service deadline or endorsement |

## Boundaries

- Use the reviewed shared offer facts introduced with the homepage, not another
  independent set of prices or business rules. They are reviewed build inputs,
  not a live database connection.
- Preserve URLs, H1/title/descriptions/canonical/indexing, all 12 FAQ questions and
  their native accordion/keyboard behavior. Change answers, not the control model.
- Preserve original meaningful IDs, photos, the map's functional consent gate,
  captured styling, forms/backends, contacts and other 113 content-page bodies.
- Use existing code-managed booking links. Do not modify prices, coupons, orders,
  payment links, product configuration, consent or OmniLodge.
- Existing reviewed platform URLs in homepage `reviews.php` can supply review
  destinations. Do not interpret its owner-approved snapshots as live totals.
- Do not promise a finishing time, particular route, current club policy, photo
  delivery deadline, late-admission guarantee, refund/cancellation rule or discount
  value without further business evidence.

## Verification Before Delivery

Bind each original capture and changed text target; reject stale, duplicated,
injected or missing targets before mutations. Compare all generated definitions,
other bodies, CSS/media, controls and protected forms. Test real responsive/no-JS
content, all accordion controls, map withheld/allowed states and attribution in
isolated browsers, with all writes blocked. Require CI and the existing guarded
staging publisher, then normal desktop/Android/iPad cache checks. Owner review and
separate production authorization still follow.
