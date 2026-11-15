# Authenticated Staging Protected-State Snapshot

Status: authenticated staging snapshots and their local archive are verified.
The complete transaction/release procedure remains incomplete.

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
clears/zeros the temporary secret. The FTPS credential value is never put into arguments,
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

## Actual Staging Verification

Frozen source `259e90ab9e0b6bad48490582b43b95c2fab53f32`, PR76 and
CI43716191713 pass both jobs. The Linux job log records `Ran 284 tests` and
`OK`, with no skips, including the symlink cases. The actual staging run starts
12:55:49.596620UTC and closes12:56:13.112275UTC on15Nov. No application source,
transaction engine, planner, legacy publisher or cache operation changes.

Both authenticated uncached POST captures agree exactly on the scoped records:

| Captured record set | Rows |
| --- | ---: |
|Posts/page/article/attachment/configuration|869|
|Post metadata|7742|
|Selected identity/theme/consent/Ecwid/form settings|118|
|Terms|51|
|Term taxonomy|51|
|Term relationships|361|
|Term metadata|0|

The254 protected file hashes match across captures. All2,073 owned content
files independently match immutable Git objects, current local bytes and both
actual server maps. The saved/runtime URL is strictly staging, blog_public0,
front page278 and filesystem roots match. The existing WordPress environment
type string is `production`; that string is recorded unchanged and does not
override the explicit staging URL/indexing/filesystem checks. No environment or
consent configuration is changed.

The local private backup is
`deploy-backups/staging-protected-state-20261115-125611-316354.zip`,2,671,864
bytes, three entries, SHA256
`96fe1c80d35b88e7d6ada874a056be152770a1f3b8f9002858f419de2e8eecff`.
An independent reader reopens it, checks CRC/entry set/every exact stored
snapshot and manifest hash, compares all raw record/file sets, and binds current
runner/template bytes to the reviewed Git commit. Raw records are not printed,
committed or uploaded. The archive is staging evidence, not a production
rollback or a full database/host backup.

The reviewed runner verifies the exact installed helper bytes, removes it,
checks the directory listing and verifies a final FTP retrieval is absent.
Upload-temporary cleanup also completes. The independent receipt accurately
attributes that online cleanup proof to the frozen runner; no separate second
network probe is claimed. All finite jobs are closed; no helper is retained.

Reports `staging-snapshots.json` and `staging-independent.json` are ignored
local evidence. Both roadmaps retain58 website deliveries: this component is
release-tooling progress. Its counters cover its own operations and captured
scope. Actual payload transaction/recovery, private production rollback,
coordinated release, manual checks and separate production approval remain.
Final documentation CI/exact merge are required; no repeated helper or purge
is needed for those documentation edits.

Final post-evidence roadmap317/317 and local284 Python (5 Windows symlink
skips) pass after the last plan edit; the actual1440px overview is inspected.
All source/template/application bindings remain exact. Final docs CI/merge
remain; no online snapshot rerun is needed.
