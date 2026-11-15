# Bounded Transactions And Private Recovery Receipts

Status: the offline bounded transaction behavior is verified. The authenticated
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

## Verified Component Behavior

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

## Local And Linux Verification

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
Source4279a07 / PR80 / CI43731909553 passes both jobs. The actual Linux quality
log records all309 Python cases and OK with no skips, including POSIX modes and
symlink cases. `source-independent.json` verifies every Git/local blob at that frozen source
checkpoint, all other baseline blobs, the source archive and actual CI log. Both inspected
roadmap1440px overview/390px details and317 browser checks pass. Final docs CI
remains a separate gate; Windows skips above stay explicit.
## Full-Payload Bounded Rehearsal

The frozen runner starts16:02:49.989767UTC and finishes16:29:23.162160UTC15Nov.
Both actual local scenarios reconstruct2,073 candidate and1,916 prior files,
verify238 prior-file copies, retain activation and preserve fixture protected
state. These copies/state exist only in isolated local directories, not on a
production or WordPress transaction target.

| Actual scenario | Apply calls after interruption | Rollback calls | Result |
| --- | --- | --- | --- |
| Complete bounded update |100/100/100/95|100/100/100/95|Exact prior/source hashes|
| Exit after replacement during partial journal write |100/100/100/94, plus1 prior replacement|100/100/100/95|Full resume, exact rollback|

Every intermediate call retains `applying`/`rolling-back`; only the last call
reports the complete phase after exact inventories. The second scenario retains
one seven-byte private receipt fragment through recovery. An independent
16:25:51 observation reads its actual bytes/hash while the resumed transaction
has395 intents. This is a point-in-time fragment observation, not a second full
transaction. The injected fragment is followed by actual PHP process exit;
this does not claim OS termination during an arbitrary filesystem write.

`full-independent.json` checks both actual step sequences/counts, final flags,
source/inventory/report bindings and the named temporary fixture's actual
absence after cleanup. No speculative server cleanup or real database recovery.

- Engine SHA256: `03dc1321483d9c09d57cabf845062b25844c4c0ffb8a8280000ffb338f10dadb`.
- Executed runner SHA256: `d2946071000a16e0930cdf93cbcf9443f506977246a63175c40979ef2336b1b7`.
- Raw full report SHA256: `4891a8db8d776013264845bccaaad1decdc4e6ae78e2a2e282d56d801fca765c`.

### Reporting-only Correction After The Run

The raw runner's legacy `resumedFullApplyBeforeRollback` scalar handles only
the older pre-rename scenario. It incorrectly reports false for the new receipt
scenario, despite its one interrupted replacement,394 resumed changes and
complete apply phase before rollback. The raw report is retained unchanged.
Independent step evidence explicitly derives the actual full resume.

Only that reporting expression is then extended. `report-scalar-correction.json`
proves exact inverse bytes to the executed runner; every execution/control-flow
byte remains unchanged. Current reporting-runner SHA256 is
`49f185d428fb1c8bfdf7bfc9a71ddabaec2b828960a9838c8188e43c35ed30ed`.
No additional transaction or execution of the modified runner is claimed.
PHP/runner syntax and final applicable CI remain review gates.

The unchanged restricted read-only inventory completes15:41:03.774149 to
16:01:55.805091UTC15Nov:1,916 files/518,479,360 bytes/zero writes, identical to
the earlier prior map. `inventory-independent.json` checks all2,073 Git/local
candidate hashes, six unchanged planner/legacy/publisher sources and release
receipt bindings. It recomputes395 changes (158 new),1,678 unchanged paths and
238 required production prior copies, which are not created. Inventory SHA256
`920bd4e6457f6a923c19ccc3a89fd4277aa3210269da85da8a4174998227af00`.
No production helper, WordPress snapshot or rollback backup. This interval read
is not an atomic site/database snapshot. The full fixtures above remain local.

Both roadmaps retain60 verified website staging deliveries. Application,
activation, planner, legacy cutover/preparer, publishers, commerce, consent,
forms and the separately verified staging snapshot component remain unchanged.
The bounded component behavior and independent full evidence are verified;
final documentation/CI/exact-head merge remain gates in PR80. G02 still needs its authenticated
wrapper, actual staging transport failure/recovery, private archive/helper
lifecycle, production snapshot/backup, coordinated release window, separate
owner approval and production verification. The complete improvement goal stays
active; remaining content/navigation/performance work remains feasible.


The next staging-host rehearsal must preserve the real public application:
staging lacks this engine's required active-production marker. Use a clearly
scoped private active fixture outside the whole public web root, with real
staging protected-state guards and honest payload-size limitations. Never add or
remove activation or replace staging with old production content for this test.

Separate [navigation census](../rendered-navigation-census-2026-11-15/README.md)
and [original-SVG transport/configuration follow-up](../svg-compression-followup-2026-11-15/README.md)
provide read-only leads. They do not add deliveries or certify interactive
navigation, provider behavior, a full public crawl or a performance improvement.
