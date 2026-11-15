# Private Temporary Files And Earlier Process Recovery

G02 offline transaction-component continuation, not a website delivery or a
production writer. Prior snapshot work is merged as PR76 /
`93f6049ddc4c722e89893d2614674fb5ee3cc754`, exact tree
`d440d8d19bf841ff60a7bb8245b4b1f958e79262`. Final PR CI43716591213 and
main43716823230 pass both jobs; completed branches are removed. Current branch
is `codex/staging-update-private-temporaries`.

Before editing, all3,476 tracked Git/local/ZIP blobs,3,709 ZIP entries and CRC
verify. Source archive `deploy-backups/seo-pre-rename-recovery-before-20261115.zip`
is500,002,319 bytes, SHA256
`0729fb66bdfaac1294b4fc0dc9b77a5f0d8b96075a79ca6301a3e79b24aed0f5`.
This is source preservation, not a production or whole-host backup.

## Current Source Candidate

The original component could leave a public dependency temporary after process
death before rename. Its deliberately strict owned-file inventory then stopped
recovery on that unknown file. The candidate instead creates replacement
temporaries inside the caller's configured private transaction `pending/`
directory. Exclusive creation has no `tempnam` fallback into another directory.
It requires the private temporary and destination to share a filesystem and
rechecks complete bytes immediately before rename. Application/activation and
protected-state guards, backup checks and dependency ordering remain.

Actual process-death fixtures cover an empty private temporary before copy,
an injected partial private write followed by process death, and a complete
verified private copy before rename. The partial case is controlled fault
injection, not a claim of killing the operating system during `copy()` itself.
Target bytes remain prior bytes in these cases. The pre-rename case can also
resume the full candidate and then restore the exact prior tree.

Uncertain private artifacts are inspected by name/hash/size and retained as
transaction evidence. They are not guessed away or recursively deleted. They
do not enter the public owned-file inventory or prevent target rollback. A
changed private temporary is refused before rename and preserved. Unknown
private directories/symlinks prevent replacement; inspection exposes uncertainty.
The existing private-root-swap and source/target/activation/conflict guards stay.

The trusted future wrapper must put the private root outside the **complete**
public web root. This filesystem component cannot infer an arbitrary host's
public root and is not an authenticated WordPress transaction entry point.
Separate coordinated release control remains necessary against unrelated
writers. Cross-directory rename is allowed only after a same-filesystem check;
there is no whole-release atomicity, power-loss durability or database recovery
claim.

## Verification In Progress

The existing31 transaction cases pass before extending them. The reviewed37
focused cases then pass locally, with5 Windows skips (four symlink cases and
the cross-filesystem case). New cases execute the three early process deaths,
full resume/restoration, private-byte tampering, unknown pending directory and
cross-filesystem refusal. Linux CI must run the filesystem cases before this
candidate is accepted. PHP syntax and Python rehearsal compilation pass.

`tools/rehearse-code-pages-update.py` is extended to five full-payload scenarios:
complete apply/rollback, death after first rename, death before copy, injected
partial private write/death, and death before rename/full resume/rollback. It
still builds only isolated local fixture directories and has no network client
or publish flag. Engine/runner hashes must remain frozen during that rehearsal.
The new five-scenario full run has **not yet started**.

The existing production planner is separately refreshing the owned inventory
through its restricted read-only FTPS adapter, bound to application8f836f9 and
the completed embed staging/origin/normal/warmed reports. It uploads no helper
and cannot write, rename, delete or purge. That finite inventory is still
running; partial file counts are not a completed verification. Application,
planner, initial cutover/preparer, legacy publishers and the verified snapshot
component remain exact.

Full290 Python, updated roadmap checks, complete inventory, all five full
rehearsal scenarios, independent source/evidence verification, CI and merge
remain. Both roadmaps retain58 website deliveries; this is source-only G02
progress. Actual authenticated transaction wrapper/staging transaction
rehearsal, private production rollback, coordination, owner approval and
production checks remain open. No production helper or payload mutation.

The full local Python suite subsequently passes290 cases with6 Windows skips;
source-bound roadmap checks pass317/317. Diff/repository checks and protected
application/planner/publisher/snapshot-component comparisons pass. Inventory
remains in progress (last observed1,600 files/499,515,760 bytes/zero writes);
that partial count is not a completed inventory. No five-scenario full run or
Linux CI result is claimed at this checkpoint.
