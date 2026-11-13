# WordPress Plugin Removal Review

Owner asked whether WPCode can be removed before further SEO work. This review
does not deactivate/uninstall anything, rewrite settings, clear caches or approve
removing other plugins. Code-managed pages still run on WordPress infrastructure.

## WPCode: Removal Candidate

Fresh read-only audits of staging and production on13 November2026 find:

| Check | Staging | Production |
| --- | --- | --- |
|WPCode Lite|2.4.2, active|2.4.2, active|
|Stored snippet posts|Two inactive drafts|None|
|Active/scheduled snippet code|None|None|
|Global Header / Body / Footer code|All empty|All empty|
|Cached snippet code|None|None|
|Published WPCode shortcode references|None|None|
|Per-page WPCode metadata|None|None|
|Delete all plugin data on uninstall setting|Off|Off|

Staging retains only8798 (Floating Right CTA - Book Now) and9132 (UTM Tags),
both drafts with zero effective code. The owner has removed the production
snippet records, not merely disabled them. The shared MU plugin and its JS/CSS
match all three local source hashes independently on both sites. UTM handling,
floating CTA and the shared integrations do not require WPCode to be active.
The remaining WPCode hook registrations are compatibility filters, not a loader
dependency. Existing isolated shared-integration contracts pass69/69.

Recommendation: deactivate WPCode on staging first, check homepage/product/CTA,
attribution, consent banner and contact-form rendering, then delete it. Repeat
the controlled process in production only when authorized. No post-deactivation
test or actual uninstall is claimed by this audit. Leave the delete-all-data
setting off while retaining rollback options; do not delete unrelated data.

WPCode has [separate global injection fields](https://wpcode.com/docs/how-to-find-where-a-script-or-code-is-coming-from-in-wpcode/),
so an empty snippet list alone would not have been sufficient. The official2.4.2
package and existing local plugin source confirm the three `ihaf_insert_*` option
names and that snippets are active when their post status is publish. Its uninstall
script uses `wpcode_settings.uninstall_data` for the optional comprehensive purge.

## Other Installed Plugins

Fresh active-plugin inventory matches the owner's nine-plugin screenshot.

| Plugin | Current Decision |
| --- | --- |
|KTK Storefront|Keep: serves the code-managed store.|
|Contact Form7|Keep: existing form backends remain protected; not replaced globally.|
|Iubenda|Keep: current consent controls/bridge remain in use; replacement work is deferred.|
|WP Rocket|Keep: caching/optimization is not replaced by content migration. Runtime version3.24; this is not a security audit.|
|Wordfence|Keep: WordPress still needs its security layer.|
|301 Redirects|Audit rules before removal; do not lose existing SEO redirects.|
|Meta pixel for WordPress|Audit tracking ownership/behavior first; not covered by the WPCode cutover.|
|Ecwid|Preserve the explicitly protected legacy store/fallback until separately approved.|
|WPCode Lite|Removal candidate based on the completed inventory above.|

These decisions are not blanket approval to delete plugins, Divi or WordPress.

## Audit Evidence And Recovery

`tools/audit-wpcode.ps1` reuses the existing DPAPI credential wrapper and expiring,
authenticated FTPS snapshot helpers. It has no publish/deactivate/delete command.
Each environment has two matching snapshots: saved WordPress/WPCode state,
active-plugin inventory and protected content/storefront/shared-integration files
are unchanged. Both temporary helpers were removed and removal verified. Protected
file counts are2296 on staging and2158 on production, not the entire server.

Raw reports stay ignored/private under this directory. Independently verified
private WPCode data checkpoints:

- Staging: `wpcode-audit-staging-20261113-095950-776341.zip`, SHA-256
  `5504dcdb3bd6509caaf8bffd4c45890bf17cbea774929a6e5bc7bd37c4a805a5`.
- Production: `wpcode-audit-production-20261113-100049-355655.zip`, SHA-256
  `8b0446c6d840fee5340819814f86ea93ed819d537e24442e915288032fac938b`.

The checkpoints contain WPCode options/snippet records/metadata, not a full plugin
or whole-site backup. Never copy their raw contents, access tokens or FTP secrets
into source/chat. Restoring WPCode after deletion requires its plugin files plus
only the relevant saved state if data was intentionally removed, not a global
database rollback. Full Python162/162 and focused auditor3/3 tests pass; audit
assessment rejects other active/future code, global injections, shortcode/page
references and unsuppressed replacements. No website application was deployed.
