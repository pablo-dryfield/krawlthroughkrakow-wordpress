# Authenticated Staging Protected-State Snapshot

G02 continuation, not a website delivery or production authorization. The
browser-only priority experiment is merged as PR75 /
`e1d98a656fb2824ff02439faf20554690401d675`, exact tree
`61507718a5077730e9760c1f9a83da423a5f1721`. PR CI43715090303 and main43715193823
pass both jobs; completed branches are removed. The task's DevTools page2 is
closed, leaving the pre-existing page1 untouched. The two local preview servers
remain available.

Branch `codex/staging-protected-state` begins after a complete tracked-source
backup:3,471 Git/local/ZIP blobs,3,703 ZIP entries, CRC and every Git object
identity verified. Archive `deploy-backups/seo-protected-state-before-20261115.zip`
is499,982,001 bytes, SHA256
`804ce3299e1aa84b5331d3ace9ecf38f485fa7ff9ef142f2793d469c23f16d4a`.
This is tracked-code preservation, not a database or full-host backup.

## Bounded Source Component

`tools/staging-protected-state-template.php` compiles into one randomly named,
15-minute staging-only MU helper. Only a matching256-bit token header and POST
can read data. Its source contains the token's SHA256, never the token itself.
The saved/runtime staging home, site URL, noindex policy, host and filesystem
location are checked before data is returned. The helper never updates a
WordPress row, payload, activation file, consent setting or cache.

The snapshot includes full page/article/attachment/configuration post records,
their metadata, selected identity/Divi/WPCode/Iubenda/Ecwid/form/theme settings,
and the four term/taxonomy tables. It does not query users, comments, customer,
order or payment tables. This is a bounded website snapshot, not every database
table or an automatic database restoration procedure.

Every staging MU file is hashed, separating the owned content namespace from
protected homepage/discovery/integration/activation files. Deployed storefront
files are also protected; its `frontend/` source directory is excluded as in the
existing deployment guards. Roots, ancestors and tree entries reject symlinks.
The one exact temporary helper is excluded from the protected file map and its
actual source SHA must match independently. No production root is traversed.

The Python runner defaults to offline template validation. An explicit
`--snapshot-staging` is the only online action; no production mode, content
publish, restoration or purge flag exists. The FTP adapter permits only this
helper and its exact upload temporary. Redirects, cached/wrong-origin responses,
source drift, incomplete hashes and unknown content bytes stop the operation.
All2,073 local owned content files are checked against the verified build and
must match both server snapshots.

Snapshot HTTP POSTs carry no form fields and invoke no lead/order flow. POST
and explicit private/no-store headers avoid a publicly cached raw export; the
client also requires actual DYNAMIC/BYPASS and no-store response headers.
[Current Cloudflare cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
documents the non-GET boundary. No cache rule or Cloudflare setting is changed.
Authentication values and raw response bodies are never printed in reports.

Two complete authenticated snapshots must match before a local ignored ZIP is
created. That ZIP holds the full before/after records and an exact manifest;
CRC, every stored byte and SHA256 are checked. The public report retains only
identity, counts and hashes. The local backup contains private saved WordPress
configuration and must remain out of source/public uploads. It does not contain
production state or the future updater's changed-file rollback payload.

Cleanup runs after success or failure. A pre-existing colliding helper is never
removed. A helper whose bytes changed is preserved for explicit review; removal
failure is a failed operation with an exact remaining helper name. The new
PowerShell launcher uses the existing DPAPI-to-process-environment pattern and
clears/zeros the temporary secret. No credential value is put into arguments,
code, archives or reports.

## Local Verification Before Any Online Use

Twenty focused Python/PHP fixtures pass, with one Windows symlink skip (Linux
CI required). Executed PHP fixtures cover complete seven-query snapshots,
unchanged files, exact Unicode/line-separator hashes, missing/wrong auth, expiry,
production/wrong-site/GET/indexing identities, saved/filter identity mismatch,
query failure without private diagnostics, unsafe table names, missing roots
and symlinks. Client fixtures cover offline/no-transport behavior, restricted
FTP operations, redirects/cache response rejection, snapshot mutation and exact
private archive contents.

Success/failure lifecycle fixtures exercise actual runner cleanup: success,
snapshot failure, colliding helper, changed helper and removal failure. An
initial source review caught unconditional collision cleanup before any online
use; cleanup now requires an installation attempt and verifies exact current
helper bytes. PHP/Python syntax and the actual offline PowerShell path pass.
The actual local2,073-file manifest is exact. The transaction engine, initial
cutover, planner, all prior publishers and every application file are unchanged.

Full Python/roadmap checks, required CI, authenticated staging snapshots, private
ZIP/independent verification and real helper cleanup proof remain before this
component is called staging-verified. Both roadmaps stay58 website deliveries.
The authenticated transaction wrapper, private production rollback, earlier
process-death recovery, actual staging transaction rehearsal, exclusive release
window, separate owner production approval and production checks remain open.

The final local full suite runs284 tests with5 Windows-symlink skips; all other
cases pass. The source-bound roadmap render/check passes317/317 after the last
plan edit. A document-update quoting error stops before writing, and its first
roadmap run uses the previous source; the separate reviewed report is the final
one. The expiry fixture uses one captured epoch to avoid crossing a clock second.
PHP/Python syntax, repository policy and whitespace checks pass. CI remains
required before the first actual staging helper.

The write counters describe this helper/runner, not every WordPress/plugin
bootstrap effect. Separate SELECTs are not an atomic database snapshot; matching
captures prove the named records/files at their sample points. They do not
replace coordinated release control, a fresh production snapshot or final
protected-state rereads during a future separately approved transaction.
