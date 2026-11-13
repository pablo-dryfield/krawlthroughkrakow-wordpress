# Complete Plugin Dependency Audit

## Result

Checked the live staging and production installations on 13 November 2026 after
the owner deleted WPCode. It is absent from both installed-plugin inventories.
Production has eight installed/active regular plugins. Staging has the same eight
plus UpdraftPlus. There are no inactive regular plugins in either live inventory.
Ignored local downloads of other plugins are not proof that they remain installed
on the server.

**Do not immediately delete another plugin.** 301 Redirects is the closest next
candidate, but URL-variant behavior must be preserved first. Everything else still
has a responsibility or an explicitly protected legacy dependency. No plugin was
deactivated, deleted or reconfigured by this audit.

| Plugin | Live Version | Decision | Verified Dependency |
| --- | --- | --- | --- |
| KTK Storefront | 0.1.1 | Keep | Custom `/store2/` catalogue, product and checkout application. |
| Contact Form 7 | 6.2.5 | Keep until two forms are migrated | Current rendered forms on `/stagshens/` and `/welcome-to-alcohol/` still submit to its backend. |
| Iubenda | 3.13.7 | Keep until a tested consent replacement exists | Active consent configuration/parser and WordPress Consent API integration; existing code bridge/fallback does not authorize removal. |
| WP Rocket | 3.24 | Keep for now | Origin caching/drop-in and active CSS/JS optimization, script delay/defer and lazy loading. Code-managed content did not replace caching. |
| Wordfence Security | 9.1.1 | Keep | Firewall option and scheduled scans enabled. WordPress/admin/backend still exist. |
| 301 Redirects | 2.85 | Candidate after redirect parity work | Five active rules have matching exact-source code entries, but broader matching semantics are not identical. |
| Meta pixel for WordPress | 5.2.2 | Keep until tracking is deliberately replaced or retired | Pixel and server-side token configured; not replaced by the GTM/Clarity/UTM cutover. |
| Ecwid | 7.0.10 | Keep under existing legacy-store boundary | Published store page 8286 still uses Ecwid; `/store/` returns 200 with Ecwid markup on both environments. |
| UpdraftPlus, staging only | 1.26.14 | Do not remove on the assumption Git replaces it | Daily file/database schedules and a remote-service setting exist; actual backup freshness/recoverability needs a separate check. |

Versions above are inventory facts, not a claim that every plugin is current,
vulnerability-free or correctly configured in every respect.

## Redirect Removal Gap

All five stored rules resolve to the same destination/status as the corresponding
entry in the live code-managed registry on both environments:

| Existing Source | Destination | Status |
| --- | --- | --- |
| `/project/life-drawing-session/` | `/krakow-hen-do/` | 301 |
| `/2017/12/13/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/` | `/krakow-nightclubs/` | 301 |
| `/krakow-activities/` | `/other-tours/` | 301 |
| `/2019/08/07/ultimate-seasonal-guide-to-the-best-activities-in-krakow/` | `/krakow-free-activities-2/` | 301 |
| `/project/vodka-tasting-tour/` | `/other-tours/` | 301 |

That establishes exact stored-source coverage, **not removal equivalence**.
Read-only reflection of the installed 2.85 methods confirms that the plugin
lowercases/URL-decodes requests and trims trailing slashes for matching. The
KTK renderer looks up the parsed path exactly. In particular, four slashless
spellings do not have their own exact registry key; Activities does. Case/encoded
variants also require explicit decisions. No variant behavior was changed here.

Before removing 301 Redirects: preserve the five-rule export, implement narrowly
scoped matching in code, test status/destination/case/slash/encoding/query behavior,
then deactivate on staging and verify uncached responses with the plugin absent.
Only after that should a separately approved production removal occur. Do not
broaden normalization across unrelated paths or silently change old SEO redirects.
The vendor provides an [export/import procedure](https://wp301redirects.com/documentation/how-to-use-advanced-settings/).

## Forms And Tracking

CF7 has seven published form definitions, but two current migrated routes have
rendered CF7 forms: `/welcome-to-alcohol/` uses ID 1675 and `/stagshens/` uses ID
2219. Both retain the matching `/contact-form-7/v1/contact-forms/{id}/feedback`
endpoint. A third CF7 reference remains in the original saved Activities post,
which is currently a redirect. The five native KTK form routes are Contact, Hen
Do, Stag Do, Jobs and Student Trips. Therefore the presence of our native handler
does not mean every form has been migrated. No form was submitted or email sent.
[CF7 supports independent template embedding](https://contactform7.com/faq/can-i-embed-a-contact-form-into-my-template-file/).

Meta has a configured pixel and nonempty API credential on both sites. Only a
pixel fingerprint and credential-presence boolean were returned, never the token
or raw option value. The configured CAPI filter lists Microdata and
SubscribedButtonClick. Configuration is not delivery verification: this audit
does not certify every checkout event, account ownership, event deduplication or
consent behavior. The maintained KTK frontend/shared integration source does not
provide a replacement Meta loader/CAPI implementation. The
[official plugin description](https://wordpress.org/plugins/official-facebook-pixel/)
confirms that Pixel and Conversions API are both within its responsibilities.

Iubenda is configured in manual mode, parser on, WordPress Consent API integration
on. Its current controls and existing Clarity/journey bridge remain untouched.
The previously deferred saved-rejection Google cookie issue is not fixed or
retested by this inventory. No GTM changes, consent overrides or provider-removal
work were authorized or performed.

## Cache, Security And Backups

Both sites have `WP_CACHE` enabled and an `advanced-cache.php` drop-in. WP Rocket
options enable mobile cache, CSS/JS minification, defer/delay and image/iframe
lazy loading. Cloudflare does not by itself demonstrate that these origin duties
are redundant. An alternative needs measured cache/optimization behavior before
removal; the [vendor uninstall guide](https://docs.wp-rocket.me/article/694-uninstalling-wp-rocket)
also explains the drop-in/configuration cleanup. Do not manually delete these files
as part of a generic unused-plugin cleanup.

Wordfence settings show firewall and scheduled scans enabled. This is not a full
security assessment. Neither installation reports a Wordfence auto-prepend value,
root `wordfence-waf.php` file or Wordfence marker in its root `.htaccess`. That
observation is not proof of an optimized WAF or a reason to disable its protection.
Any replacement must consider WordPress/admin/login/backend security, not just
the frontend. See the [Wordfence firewall documentation](https://www.wordfence.com/help/firewall/).

Staging UpdraftPlus reports four backup-history entries, newest
`2026-05-15T09:31:04+00:00`, despite daily file/database settings. These may be
inherited records; this does not prove that a recent remote backup exists or that
none exists. Production has no UpdraftPlus plugin or recorded Updraft backup
history. Verify the host/offsite backup schedule and a restore test separately.
Git and the scoped publisher ZIPs are not complete backups of the live database,
uploads, form configuration or all WordPress settings. No remote backup was
started, restored, downloaded or deleted during this audit.

## Code-Managed And Other Protected Components

The shared MU plugins for homepage, content pages, integrations and Clarity are
the implementation, not unused plugins. Staging additionally has the SEO discovery
preview/indexing guard. Preserve these, the production activation file and their
assets. Also preserve the existing `maintenance.php` drop-in; its existence is not
proof that it is redundant. This review is not authorization to delete WordPress,
Divi, the legacy store, MU plugins, drop-ins or original rollback data.

## Verification And Limits

- Final read-only reports: `staging-final-plugins.json` and
  `production-final-plugins.json` in this folder, ignored/private.
- Each environment has two matching snapshots of saved WordPress/WPCode state,
  selected plugin-config hashes, installed/active inventory, redirect definitions,
  form references and owned/protected files. Counts: 2,301 protected staging files
  and 2,163 production files, not a complete server checksum inventory.
- Every expiring authenticated inventory helper was removed and removal verified.
  No cache-purge function, plugin activation/deactivation, settings update or
  database rewrite was performed. Raw API credentials were not exported.
- `browser-product-ready-after-wpcode.json`: 109/109 checks, 20 normal-URL page/viewport
  scenarios across both environments at 390/1440 px. Homepage, both CF7 pages,
  Contact and the Pub Crawl store load; canonical URLs, floating CTA rules,
  isolated UTM handoff, CF7 endpoint connections, the actual client product heading
  and native Contact form pass. Zero page errors and
  zero attempted non-read client requests. Third-party requests were blocked;
  this is not end-to-end tracking delivery or consent certification.
- Earlier 100/100 and 101/101 reports are retained. The expanded first attempt
  `browser-enhanced-after-wpcode.json` passed only 107/109: its staging-specific
  product selector/root-visible readiness assumption did not establish the
  production heading was rendered. The final guard waits for an actual heading
  inside the application root on both releases, then asserts the expected text.
  This was a test-harness correction; no application bytes changed. All earlier
  inventory reports remain. Final Python suite: 166/166, including four focused auditor tests;
  shared PHP integrations: 69/69. Generated PHP helper syntax passes.
- Source/tools/docs only. No website application or OmniLodge deployment and no
  post-deactivation test of the remaining plugins. Removal decisions still need
  the staged process described above.
