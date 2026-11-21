# Configured add-on dates and native staging cache - delivery81

Verified on staging on21November2026. Production and D08 are excluded.

## Customer behavior

The actual staging form offered cocktails on Friday and Saturday and added30PLN
to its estimate, although the current public configuration permits ISO weekdays
1,2,3,4,7. Four mismatches reproduce at390/1440widths across seven experience
dates. The configured data, source price/quantity functions and backend are the
authority; this change does not choose new business rules.

The form now follows that existing configuration. It requests a date when
needed, shows unavailable/invalid-rule guidance in14px text, removes a selection
that becomes unavailable, announces that removal and excludes it from the
estimate and local submitted payload. Sunday remains available as configured.
Cart, discount, payment, provider/consent, PHP and homepage source stay exact.
Other2468existing application files remain exact. Two new frontend files hold
the date-rule interpreter and its tests; only compiledJS/CSS change on hosting.

## Local evidence

- Six helper contracts cover all seven weekdays, Sunday/Monday, three buyer
  timezones/DST, impossible dates, disabled/missing rules and malformed inputs.
  All69frontend tests pass. An independent Vite build reproduces all six assets.
- Four isolated actual-page wrappers with the candidate assets pass28weekday
  cases, four missing-date cases and selection-reset/status-notice checks.
  Actual phone/desktop form PNGs are inspected.
- Two synthetic local cart/quote captures exclude the removed add-on, preserve
  the date/guest/base estimate and intercept the quote before the network.
  Both changed-state axe scans have0violations; manual incompletes remain.
- The full public matrix passes812checks against all24current products, with
  the child-frame/nonread guard preflight, zero real mutations and exact37-file
  payload binding accepted by the unchanged publisher QA gate. All eight
  before/after geometry pairs agree. Four PNG pairs are byte-identical and four
  differ without a proven pixel-level cause; no whole-page pixel identity claim.
  All owned loopback processes and browsers close.
- Thirty native-cache, publisher-transaction and legacy cache-scope contracts
  pass. Actual PHP cases test identity/auth/method/path/expiry and missing/failing
  native API guards. Transaction cases prove success recording and complete
  rollback when native cache invalidation refuses. Existing QA, namespace,
  snapshot, backup, runtime and production protection guards remain enforced.

Fresh public API GETs at08:09:31UTC reproduce the complete24-product capture,
34200bytes/SHA-256
`bd8a9b6c8b734e07553a00db903525ad2cdd447894b843574940ae8f2842308d`.
No product/account setting is changed.

## Failed release and verified rollback

The first guarded publication reached cache cleanup, then FTPRMD returned550,
directory not empty. The publisher rolled the runtime back. Its original failed
report is retained, including the after-upload snapshot and rollback witness.
Independent fresh readback verifies all37original runtime bodies,17additional
selected files,78saved posts/selected options/Ecwid page and2116code-page hashes.
The2060380-byte first original archive reopens with CRCs/all37bodies; SHA-256
`7cef93ed678ebd3bd29c1285043ed75de885d119540214fde65b1ce73b82f5d8`.
A scoped rollback edge purge and ordinary desktop HTTP reads reproduce the old
JS/CSS hashes. An unbranded urllib request returned403; it is retained separately,
with no WAF/authentication change or broad access claim.

Read-only cache inventory shows known product directories with modification
times during/after cleanup, consistent with cache regeneration. The precise
actor and original failing directory are not proved. This is not relabelled as
a successful release or followed by an unchanged application retry.

## Changed cache mechanism and final publication

The staging-only publisher now uses
[`rocket_clean_files`](https://docs.wp-rocket.me/article/91-rocketcleanfiles)
with exactly `https://krawlthroughkrakow.com/staging/store2/`. WP Rocket documents
this API as applying to the URL and its descendants. Legacy production
publication and FTP cache functions remain unchanged; no global purge, settings
change, broad filesystem deletion or production request is added.

The temporary staging helper authenticates with a request header and expires after 600 seconds,
exact home/site/filesystem/request-path and GET guards, a bounded45-second
response, refusal of redirects and verified removal of its exact own file.
There is no native/global/FTP fallback when it refuses. A cache-only pilot on the
restored runtime passes before the changed-source application transaction.
Each operation makes one authenticated request and removes its own helper.
This is separate from the expired B03 recovery engine; no recovery authority is
refreshed or replayed and no retained originals/metadata are cleaned up.

The changed-source publication completes08:32:58–08:34:17UTC. Only the two
compiled runtime assets differ; the other35owned bodies and17additional selected
files are exact. Publisher before/after protected/production fingerprints and
fresh78post/options/Ecwid/2116code-page probes match. Temporary helpers remove
themselves and their absence is checked. The final original37-file hosting
archive reopens with CRC/all-member hashes, SHA-256
`f50f25f8f94ee403262a8114d397193206cc616f3f6d2919982a98a6af8e2610`.

Three nonce/origin views pass noindex/self-canonical and exact new assets.
After fresh zone/account checks, only the two staging asset prefixes and staging
store2 prefix are edge-purged. Three clean desktop/phone/tablet views are MISS
and their repeats HIT. All18asset bodies match:

- JS `76fa3ebcee07547d3dfde52d0d8a44ac2be81b897d38da7831b1c5b4b079493b`
- CSS `9050f5eb76998d2dcc7b1f352662beb7342ee37343e503ebe09ffa09c3e891ec`

Installed normal-page checks use actual public product GETs. All28weekday cases
at320/390/768/1440widths, missing-date behavior and notice/reset states pass,
with0page errors. Four normal noJS catalogue/regular-product views retain
visible initial content, one heading, hidden client root and no horizontal
overflow. All owned browsers close and outside/nonread requests are blocked.
Browser interception changes caching; the separate HTTP reads establish HIT.
HTML hashes differ and no whole-page byte identity or cause is inferred.

## Remaining scope and publication

Invalid/expired-code client recovery is also observed at390/1440under isolated
responses: announced error, removable code, full total restoration and one valid
replacement. The initial harness's aborted synthetic checkout caused the
existing fallback; it is retained. The corrected harness returns a local400
checkout denial. Four existing Meta dependency page errors remain recorded;
these observations are not full error/provider/consent acceptance.

No genuine cart, order, payment, customer message or provider event is sent by
verification. Deployed backend rejection/arithmetic, paid-state/provider
receipt, physical-device/native zoom/screen-reader and whole-page criteria
remain. Selected-state proof is not a fresh raw seven-table/whole-host witness;
ordinary cache housekeeping is not whole-database immutability. Original noJS
provider markup and functional consent remain unchanged under the D08 exclusion.

The candidate rebases without byte changes onto actual main
`dfb4c91eb60be48bbab6081ea1a92fc8f23b307d`, exact reviewed tree
`ded4e0a2c9de1ede1f8a7073ec6091e7d4551079`, after
[PR139](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/pull/139).
Its candidate passes1305Python/21platform skips,45Windows and all65Linux steps
in1902seconds within the original40-minute cap; actual main44885604236 is
tracked separately. PR138actualmain44881907273 independently passes the same
counts in1946seconds. The historical L01 main cancellation stays failed.
Associated exact-source PR/main checks establish this delivery's publication.

Both roadmaps record81website deliveries/85records while preserving all40
original criteria/statuses, eight original batch objects, milestones and
84earlier delivery objects. Google location/hours/no-contact, medical and
recovery retention decisions stay intact. Raw receipts, failed observers,
screenshots and reopened source/runtime archives remain private; no new source
push/PR precedes the staging verification above.
