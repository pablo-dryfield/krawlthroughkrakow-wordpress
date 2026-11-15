# Private Temporary Files And Earlier Process Recovery

Status: the offline component and all five full-payload scenarios are verified.
The complete authenticated transaction/release procedure remains incomplete.
This source-only G02 work adds no website delivery or production authorization.

Source `26b00ba82a0fea0a7c824d11f189771ee0bb0e4f` / PR77 /
CI43717903799 passes both jobs. The Linux job records `Ran 290 tests` and `OK`,
with no skips, including the symlink/cross-filesystem cases. Final documentation
CI, ready-for-review transition and exact-head merge remain separate gates.

## Source Preservation

The prior snapshot work is merged as PR76 /
`93f6049ddc4c722e89893d2614674fb5ee3cc754`, exact tree
`d440d8d19bf841ff60a7bb8245b4b1f958e79262`. PR CI43716591213 and
main43716823230 pass both jobs; completed branches are removed. This branch is
`codex/staging-update-private-temporaries`.

Before editing, all3,476 tracked Git/local/ZIP blobs,3,709 ZIP entries and CRC
verify. Source archive `deploy-backups/seo-pre-rename-recovery-before-20261115.zip`
is500,002,319 bytes, SHA256
`0729fb66bdfaac1294b4fc0dc9b77a5f0d8b96075a79ca6301a3e79b24aed0f5`.
This is tracked-code preservation, not a production or whole-host backup.

## Resulting Component Behavior

The original component could leave a public dependency temporary after process
death before rename. Its deliberately strict owned-file inventory then stopped
recovery on that unknown file. Replacement temporaries now use the caller's
configured private transaction `pending/` directory. Exclusive creation has no
`tempnam` fallback into another directory. The component requires the private
temporary and destination to share a filesystem and rechecks complete temporary
bytes immediately before rename. Application/activation/protected-state guards,
backup validation and dependency ordering remain.

Uncertain private artifacts are inspected by name/hash/size and retained as
transaction evidence. They are not guessed away or recursively deleted. They
do not enter the public owned-file inventory or prevent target rollback. A
changed private temporary is refused before rename and preserved. Unknown
private directories/symlinks prevent replacement; inspection exposes uncertainty.
The existing private-root-swap/source/target/activation/conflict guards remain.

The trusted future wrapper must place private storage outside the **complete**
public web root. This filesystem component cannot infer an arbitrary host's
public root and is not an authenticated WordPress transaction entry point.
The same-filesystem checks cover replacement temporaries; private journal,
archive and HTTP/helper lifecycle still need their wrapper review. Coordinated
release control remains necessary against unrelated writers. No whole-release
atomicity, power-loss durability or automatic database recovery is claimed.

## Focused And Full-Payload Verification

All37 focused transaction cases pass locally with5 Windows skips, then all290
Python cases pass locally with6 Windows skips. Linux CI43717903799 runs all290
without skips. New cases execute early process death, full resume/restoration,
private-byte tampering, unknown pending directories and cross-filesystem refusal.
PHP syntax, rehearsal compilation, repository policy and whitespace checks pass.

The frozen full runner starts its receipt13:15:13.741764UTC and completes
13:35:40.767956UTC on15Nov. It uses only isolated local fixture directories,
with PHP network reads disabled and no Python network client/publish flag.
Current2073 candidate files and all1916 prior files are reconstructed and
checked against immutable Git/actual read-only inventory. The original
activation and separately approved14Nov endpoint expression are retained.

| Actual fixture scenario | Prior copies | Initial intents | Retained private artifacts | Result |
| --- | ---: | ---: | ---: | --- |
|Complete395 replacements|238|395|0|Exact rollback|
|Process death after first rename|238|1|0|Exact rollback|
|Process death before copying|238|1|1 empty|Exact rollback|
|Injected partial private write, then process death|238|1|1 seven-byte fragment|Exact rollback|
|Process death before rename|238|1|1 verified copy|Full resume, then exact rollback|

The partial case is controlled fault injection followed by actual process exit,
not a claim of killing the OS during `copy()` itself. The three pre-rename
cases preserve the prior target before recovery. Every final rollback restores
all1916 prior hashes, preserves all2073 source hashes and retains activation
and the fixture protected-state marker. This marker is not real WordPress data.
Private artifacts stay inspectable until the scoped fixture-directory cleanup;
all matching local fixture roots are then absent. No speculative server cleanup.

`full-independent.json` independently checks every scenario/count/flag, source
Git/local hashes, the before/after source binding, inventory binding and actual
absence of the named fixture-root prefix. It does not claim a second transaction.

- Engine SHA256: `c4c715f7279996815ad65ad48cf891d36a5927ea64e61bab5d7cfefafd278535`.
- Runner SHA256: `098b4efa4d444897ab9308cf4ac3c111990ac5aa3526fca01d4ac9e9270ed4bf`.
- Full report SHA256: `207907ced4a6b3cf7627ee3370a498d4de6c44b887f4267e781fa77f5207cb73`.

## Fresh Read-Only Production Inventory

The unchanged planner's restricted read-only FTPS adapter reads1,916 owned
files/518,479,360 bytes from12:59:59.535240 to13:14:00.925698UTC15Nov, with
zero writes and no helper/upload/rename/delete/purge capability. The actual
prior map exactly matches the earlier completed read. It is a file-by-file
inventory over that interval, not an atomic WordPress/database snapshot.

Independent verification binds all2073 Git/local candidate files to app8f836f9,
all planner/legacy source hashes and the recomputed395 changed/158 new/1678
unchanged paths. The238 required **production** prior copies are not created;
the238 verified copies above exist only in local fixtures. A production
WordPress snapshot/rollback backup remains absent and `canPublish` stays false.
Inventory SHA256:
`52abfc12c3dd712193ca4d6ba26557efcb49c316240d4b556323c8930e2d8201`.

## Remaining Release Work

Application, initial cutover/preparer, planner, publishers and the separately
verified staging snapshot component remain exact. No application/server payload,
activation, real database record, production helper or cache operation changes.
No additional website build, upload, helper rerun or purge is needed for docs.

Both roadmaps retain58 website deliveries. Authenticated transaction wrapper,
actual staging transaction/transport-failure rehearsal, verified private rollback
archives, helper lifecycle, fresh production snapshot/backup, exclusive release
coordination, separate owner approval and production checks remain. The full KTK
plan stays active; these offline fixtures do not replace those gates.

Final post-evidence roadmap317/317 and local290 Python (6 Windows filesystem
skips) pass after the last plan edit. The actual1440px overview is inspected.
All component/application/source bindings remain exact. Final docs CI/ready/
merge remain; no full rehearsal, snapshot, upload or purge needs repeating.
