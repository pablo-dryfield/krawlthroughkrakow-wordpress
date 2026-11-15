# Bounded Transactions And Private Recovery Receipts

Status: source-only G02 component verification is underway. The authenticated
transaction wrapper and actual staging transport/recovery rehearsal remain open.
No additional website delivery, production write or production approval.

The current website application remains `8db2fd909b7ca43aef1bfed5be437ac62642036a`.
PR79 is merged as `0ec0cf7efc9da3720d69f436c1269361272c5207`, exact tree
`3675fda3cb315e9bd1b4a6d3ce7decfda6af7a01`. PR CI43729642961 and
main43729822848 pass both jobs; the completed branch is removed. This work uses
`codex/staging-bounded-transactions`.

## Preservation Before Editing

All3,491 tracked Git/local/archive blobs and3,730 ZIP entries independently
verify, including CRC. Archive
`deploy-backups/seo-bounded-transactions-before-20261115.zip` is500,060,288 bytes,
SHA256 `23df41d5782c48d47b3f1ca08d7411eca883ebac637c93d9daf2610638975090`.
This preserves tracked source, not WordPress data or a whole host.

## Candidate Behavior

`apply($limit)` and `rollback($limit)` accept only an integer1..100 or null.
Null preserves the existing complete-call interface. Limits count actual file
replacements/restorations/removals; already correct paths consume no allowance.
An incomplete call retains `applying` or `rolling-back`. Complete inventory and
protected-state checks are required before `applied` or `rolled-back`.
Inspection reports pending paths; these lists do not authorize overwriting a
foreign change. Each next action still performs its guards and backup checks.

Rollback restores existing dependencies, registry and renderer before removing
introduced dependencies. This prevents bounded rollback from deleting a new
dependency while the new definitions still reference it. Mixed releases remain
possible between individual file operations; this is not whole-release atomicity.

Private plan/journal writes now exclusively create random files in the private
transaction's `receipts/` directory, without `tempnam` fallback. Files use0600
and the directory0700 on POSIX. Complete bytes, same filesystem, root paths and
the previously observed destination hash are checked before rename. A foreign
committed receipt is preserved. Partial or changed temporaries remain inspectable
by name/hash/size, without guessed cleanup. An interrupted preparation with a
plan but no committed journal requires inspection and a fresh transaction;
automatic reuse is refused.

The caller remains responsible for placing private storage outside the complete
public web root. A file-count limit does not bound elapsed time or bytes: full
source/target/backup inventory checks still run. The future authenticated wrapper
must measure actual host request limits. No host power-loss durability,
adversarial-owner isolation or automatic database restoration is claimed.

## Local Verification; Full Rehearsal And CI Pending

Initial53 focused tests pass locally with7 Windows skips. The initial full306
Python cases report OK with8 Windows skips. PowerShell's native stderr
redirection returned an error status despite that test result; its original
`python-initial.log` is retained, and final verification uses a subprocess
capture with the child's actual return code. Expanded56 focused cases report OK with8 Windows skips. Final309 Python cases
pass with9 Windows filesystem skips and actual child return code0. This includes
interrupted preparation, bounded-rollback lost response and private symlink cases.
A subsequent source review makes failed filesystem metadata an explicit refusal;
the final309-case rerun, PHP syntax, policy, whitespace and exact application
preservation all pass in `local-checks-final.json`.

New cases execute one-file progress through complete apply/rollback, strict
invalid-bound refusal, interrupted private receipt writes, intent-preserving
recovery after actual replacement, lost responses and concurrent changes.
POSIX modes and symlink behavior require Linux CI; Windows skips are explicit.
`--bounded` selects two full2073-file local scenarios, including injected partial
journal writing followed by actual process exit. The run is not yet certified.

A fresh restricted read-only production inventory is running against the frozen
application and completed origin/normal/warmed staging receipts. It cannot
upload a helper, mutate files or purge caches. Production WordPress state and
production rollback copies remain absent.

Both roadmaps retain60 verified website staging deliveries. Application,
activation, planner, legacy cutover/preparer, publishers, commerce, consent,
forms and the separately verified staging snapshot component remain unchanged.
Full fixtures, independent bindings, Linux CI and final source review remain
before this component can be marked verified. G02 still needs its authenticated
wrapper, actual staging transport failure/recovery, private archive/helper
lifecycle, production snapshot/backup, coordinated release window, separate
owner approval and production verification. The complete improvement goal stays
active; remaining content/navigation/performance work remains feasible.
