# Homepage booking accessibility - delivery80

Verified on staging on21November2026. Production and D08 are excluded.

## Problem and resulting behavior

The mobile review links omitted their platform names from Chrome's accessibility
tree because the text used `display:none`. The rotated BOOK NOW tab extended
past the right edge and, without JavaScript, covered parts of the NYE schedule.
The live before-check reproduces both defects; the rating refresh did not cause
them.

One maintained file, `ktk-homepage-assets/hero.css`, now keeps platform names as
clipped accessible text and reserves a44px lane for the booking tab. The whole
tab fits short screens, shows a white keyboard outline and clears the measured
schedule. The page and header reflow into the remaining width. Copy, artwork,
links, schedule facts, all JavaScript and the other2471application files remain
exact. This intentionally changes available content width; pixel identity is
not claimed. The clipped-name technique follows
[W3C C7](https://www.w3.org/WAI/WCAG22/Techniques/css/C7.html).

## Publication and verification

- Before editing, the selected originals were archived and reopened. The source
  inverse preserves every original CSS byte outside the replaced selector and
  appended homepage rules. An initial two-file experiment was reduced to this
  CSS-only change; its JavaScript was restored exactly before verification.
- Fourteen controlled JS/noJS views cover standard and short screens,41scroll
  states and14keyboard returns. The identical public HTML fixture makes no
  outbound network requests. Baseline defects reproduce separately.
- One guarded atomic staging operation completed at07:48:56UTC. Remote original
  hash matched the archived source before writing; new direct readback matches
  SHA-256 `5e68e2e692db515807a83b75e8832239b7ab6128e1f2d4621485dc63ce43491b`.
  The4639-byte original rollback archive, two members, CRCs and original hash
  reopen exactly; SHA-256
  `1096cb4774066fb77a7028f09c36314bbcf73363bde9fd0a66ba93fc71ba32ec`.
- Before/after checks match all78saved posts, selected options, Ecwid page digest,
  2116code-page file hashes and18other selected homepage/storefront files. The
  shared hero CSS is outside that older code-page map and is independently
  verified. Temporary probes/cache helpers remove themselves and absence is
  confirmed. This is selected-state proof, not a fresh seven-table/whole-host
  witness or a claim of whole-database immutability during cache housekeeping.
- Three nonce/origin HTML views retain noindex/self-canonical and load the exact
  new CSS. After current zone/account identity checks, only its staging CSS
  prefix and four homepage URL/default-device variants are purged. Both API
  requests succeed. Three ordinary clean views are MISS and their repeats HIT;
  every CSS body matches the new hash. HTML hashes differ; no cause or whole-page
  byte identity is inferred.
- The maintained `tools/test-homepage-booking-accessibility.mjs` then passes352
  assertions across16scoped live JS/noJS browser views. Six unique dimensions
  cover320/390/768/1440widths at900height and320/390widths at160height; the four
  extra390/1440views provide top-of-page captures. All16CSS responses are HIT
  and exact. Link purposes, snapshots, tab bounds, minimum target, schedule
  clearance, overflow and keyboard focus pass. Actual phone/desktop/top/focus
  PNGs are inspected. All owned browsers close;95outside/non-static requests
  are blocked before sending, with no page errors in these scoped views.

Browser interception changes browser caching behavior; normal HTTP cache
acceptance comes from the separate reads above. No actual messages, orders,
payments or provider events are sent. Functional consent/provider code stays
exact. These checks do not establish native200/400% zoom, physical-device,
screen-reader, full consent/provider or whole-page accessibility acceptance.
The original native/account automation stop and older failures remain.

The first preflight in the long-named worktree stopped locally before connecting:
three existing media paths exceeded ordinary Windows path handling. Extended
paths independently read all their exact bytes. The existing shorter frozen
source checkout, whose entire code-page cohort is identical, supplies both
successful preflight probes. No application file was missing or regenerated.
An initial text writer's newline normalization was caught and corrected before
publication. The original candidate and earlier browser reports are retained;
the final inverse verifies the original line endings exactly.

## Source and remaining scope

The follow-up rebases without byte changes onto actual main
`20b5e2dec9783230046acd8c34071b8f612c1597`, tree
`cef2f59ca059b66f8c2e9fa0c06217a2e6ba7b61`, after
[PR138](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/pull/138).
That candidate passed1305Python tests/21platform skips,45Windows tests and all65
Linux steps within the original40-minute cap. Its required main run is tracked
separately; associated current-source PR/main checks establish publication of
this follow-up. No unchanged CI retry or cap increase is performed.

Both roadmaps record80website deliveries/84records; all40original criteria and
ticket statuses, eight completed batch objects and earlier83delivery objects
remain. The [installed weekly monitor](../nonproduction-completion-2026-11-21/MONITOR-INSTALLATION.md)
adds actual operational evidence without another website delivery. Native
Search Console UI, actual inbox/paid-state/provider outcomes, broader human
accessibility, owner/specialist facts and recurring operations remain assigned
in the existing handoff. L01/location/hours, medical hold and retained recovery
data are unchanged. No expired helper replay or cleanup is requested.

Raw reports, screenshots, original failed observers and selected-state receipts
are retained privately with reopened archives under `deploy-backups`; they are
not public CI artifacts. Source publication uses one consolidated push/PR after
the staging verification above.
