# Incremental Release Procedure: Local Preparation

## Verified Starting Point

Operator/trust PR71 merges as `f2ae2195df2085c074d9ab3653006576b9334a44`,
matching final `7a55bbdd70da98aa51ed119bcd8ceb9207ba1066` and exact tree
`c39ca217007cd306827e71b97b07d381558c5557`. Final CI43702149228 and
main43702261497 both pass both jobs. Completed local/remote branch removed;
root worktree only. All finite release checks are closed, previews5184/5185
retained. Delivery57 is verified; production and OmniLodge are unchanged.

New branch `codex/staging-release-updater` starts from that merge. Before any
new edits, `deploy-backups/seo-production-updater-before-20261115.zip` closes,
passes CRC and exact equality for all3,454 Git/local files and all3,682 entries.
Archive SHA256
`546d8fc01389492ef8c54849f9e5adcd8ddf74f527b8b1d25907da6f66b59e1d`.

## Scope And Existing Guard

G02 requires a reviewed incremental release procedure. The existing
`promote-code-pages-production.py` is an initial cutover: it requires production
activation to be absent/disabled and deliberately rejects an active site. Keep
that guard and publisher unchanged. Do not delete the activation file, disable
production routing or blindly rerun that cutover to publish later SEO changes.
The historical preparation tool also requires old fixed report paths and an
initial disabled-production release sequence; it is not a current update plan.

The first local phase prepares an exact, read-only update plan from current
verified staging evidence. Its default must not connect to the server. Optional
production inventory may only list/retrieve the explicitly owned code-page
namespace, with the existing activation marker retained and checked. No helper,
upload, rename, delete, WordPress mutation, homepage/storefront/discovery update
or cache purge belongs to that read-only phase. Offline/security fixtures must
prove these boundaries before optional inventory is used.

An actual updater still needs scoped atomic-copy/rollback implementation,
protected WordPress/meta/forms/settings and application checks, a concrete
reviewed release plan, and separate owner production authorization. No current
production action is proposed or authorized by this local preparation. A source
backup is not a fresh production rollback or WordPress state snapshot.

Both roadmaps remain57 verified staging deliveries. This source-tool work does
not count as another website delivery. No application build or publication yet.

## Local Source Proof

`tools/plan-code-pages-update.py` now exists with a DPAPI wrapper and16 focused
security/evidence tests. All231 Python tests pass. The actual2073-file offline
preparation succeeds twice, including a run with `socket.create_connection`
prohibited. It binds application `adf735679c9d6c18fce411a6bbb56c351761e4fd`,
checks every local Git blob, current staging/remote hashes, original protected
staging state, staged rollback ZIP CRC/SHA, exact116-route/three-device coverage
and all passing origin/normal/warmed checks with348 warmed HITs.

The default report explicitly says `canPublish:false`, zero remote writes, no
production inventory, no production WordPress snapshot and no production backup.
The CLI has no `--publish` option. The read-only adapter denies mutation methods,
cross-namespace reads, traversal, symlinks and unexpected files. A listed file
that cannot be read fails closed instead of being treated as a new/absent file.

Optional production inventory starts only after those fixtures pass. It uses
scoped FTPS MLSD/RETR only and checks the existing activation bytes against the
unchanged legacy source. Current payload size is550,611,445 bytes across2073
files, so reading it is a substantial transfer; no web benchmark runs alongside
it. Session3809 is running. Do not edit the planner while this evidence run is
active. Source/application/legacy-promoter/initial-preparer bytes are otherwise
unchanged. PowerShell parsing passes; no secret is copied into source or logs.

Both roadmaps record this as local preparation in progress, not another verified
website delivery or a working production updater. CI/commit and current source
roadmap rendering remain pending after the inventory result.

## Interrupted Read And Corrected Transport

First inventory3809 closes with a remote ConnectionResetError/WinError10054
during RETR, before any completed report. It performs no writes and is not
accepted as an inventory. `inventory-attempt1-failed.json` records the outcome.
Source hash observation is after launch/before the terminal handle is collected;
it does not establish an independently observed process-exit time.

The second source version reuses the existing tested `StagingFTP` transport
under the strict read-only capability. Despite its historical name, that class
is the generic reconnecting transport; its raw mutation methods stay inaccessible
through the outer wrapper. It reconnects after32 transfers and retries at most
twice, buffering each retry from byte zero before delivering any consumer bytes.
New isolated interruption/progress and duplicate-listing tests bring focused
coverage to18 and the full Python suite to233, all passing. A real offline
2073-file run still passes with socket creation prohibited.

Each100 verified reads now records local-only progress. Failure produces an
explicit unverified failure receipt; successful inventory requires unchanged
planner/wrapper/legacy/transport source hashes and the exact retained activation
marker. No namespace, symlink, unexpected-file, unreadable-file, activation or
write guard is relaxed. The fresh retry is running; do not edit planner source
before its terminal result. Production WordPress state/backup and actual updater
implementation remain unperformed.

The [active-site update contract](UPDATER-DESIGN.md) records the reviewed sequence
and concrete failure/rollback fixtures still required for a writer. It preserves
the activation marker throughout success/failure, requires compare-before-write,
keeps private WordPress snapshots local and separates file ownership from route
behavior approval. This design is not a running updater or production approval.

## Completed Read-Only Inventory

Retry58958 closes successfully, reading1,916 owned production files/518,479,360
bytes from10:19:24.608274 through10:32:45.057693UTC. Its report is
`production-inventory-retry.json`, SHA256
`435072e629b72c97f675f5a5fe6e1ff6d82d7ee04588914ea16301efe53a27c0`.
All planner/wrapper/legacy/transport source hashes remain unchanged throughout
this completed attempt. The existing activation marker is retained exactly, SHA
`b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833`.
No helper or remote mutation occurs. `canPublish:false`, no production WordPress
state verification and no production rollback backup remain explicit.

Independent verification recomputes the complete change/new/unchanged sets,
every current local staging SHA, retained activation and required-backup hashes.
The proposed content-only update has395 candidate changes:237 existing files
and158 new files, with1,678 unchanged. New files are42 shells and116 styles.
A future rollback would require238 prior files (237 existing changes plus the
activation marker); that is a requirement, not an already-created backup.
`inventory-independent.json` records these checks and the input report SHA.

### Medical Hold Boundary Review

Two proposed paths include the held article's body and compiled page data.
Rather than assume byte identity from its hold label, the old Git baseline
`0cec9853877d06eb1ffee21bba296b76553828c2` is independently matched to the
fresh production SHA for each file. The staging counterparts match the verified
application receipt. A network-disabled DOM audit finds the same134 elements,
identical whole/article text, image elements, forms and links. Its two changes
are the earlier shared semantic marker and a widget footer H4-to-H2 conversion;
reversing those two reproduces the complete old DOM exactly.

The compiled page data differs only in `shell_file` and `css` references. Title,
description, metadata, schema, original source/history, forms, Ecwid and indexing
fields remain exact. Reports `medical-proposed-diff-final.json` and
`medical-page-data-diff.json` retain this precise comparison. The generic shell/
CSS/renderer effects still belong to eventual production review; no medical
claim is rewritten, endorsed or presented as specialist-approved.

### Current Delivery State

This verifies a read-only plan and a concrete writer contract. The actual
compare-before-write/rollback program, fresh protected WordPress/meta/forms
snapshot, production rollback and owner production approval remain unperformed.
All application files and old cutover/preparation tools are unchanged. Both
roadmaps remain57 verified website staging deliveries; no upload or purge is
needed for this source-only work. Final roadmap rendering/tests/CI/commit remain
before this preparation phase can be merged.


## Subsequent Component Verification

PR72 merges as `7ad562f9f6c5de445228da3f34b1c9f29a5598f1`, exact tree
`339d01cd324a14cd230eac803219681f8afe1ee7`; CI43705372544 and main43705705212
both pass. The unchanged read-only planner remains incapable of publishing.
The separate [offline transaction component](../active-updater-2026-11-15/README.md)
subsequently passes31 Linux integration cases, full264 Python tests without
skips and both full2,073-file apply/rollback and actual post-rename process-death
recovery. Its authenticated WordPress/protected-file wrapper, actual private
production backup, deployment rehearsals and approval remain unfinished. This
updates the earlier preparation-phase status without implying a production run.
