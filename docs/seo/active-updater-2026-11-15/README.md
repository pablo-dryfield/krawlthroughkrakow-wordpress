# Active Content Transaction Component

G02 continuation from the read-only planner, not another website delivery or
production authorization. Branch `codex/staging-active-content-updater` starts
from PR72 merge `7ad562f9f6c5de445228da3f34b1c9f29a5598f1`, exact tree
`339d01cd324a14cd230eac803219681f8afe1ee7`. PR CI43705372544 and main
CI43705705212 both pass; the completed prior branch is removed.

Before editing, `deploy-backups/seo-active-updater-before-20261115.zip` verifies
all3,459 tracked Git/local blobs, all3,688 ZIP entries and CRC. Its499,917,636
bytes have SHA256
`694c624e5e927dde72bd5741680166bf4933a7d91703ec076ecb7f673725eaec`.

Current source: commit `80cb685f002946b15430c54381fee05ab43ac82c` / PR73.
Linux CI43707563843 passes both jobs and all264 Python cases without skips,
including all31 transaction cases. Local264 cases run with260 pass/4 Windows
symlink skips. The final full payload rehearsal passes both complete and
interrupted rollback scenarios; engine/runner/report bindings independently
match. This remains a component, not production readiness. Final documentation
CI and merge are separate from website delivery; no upload or purge is required.

## Scope And Limits

The new `tools/code-pages-update-engine.php` is a local filesystem transaction
component. It has no WordPress hook, HTTP endpoint, FTP connection, production
command or cache API. An explicit trusted caller must configure distinct source,
target and private backup directories and a protected-state callback. Fixture
targets are temporary directories, never the website. Existing planner, initial
cutover/preparation tools, activation marker and application files stay exact.

The component binds an immutable application commit, complete old/new inventories,
transaction ID, exact active marker and a protected-state hash. It verifies prior
file copies before application writes, records intent before each replacement,
and supports inspecting and recovering the same interrupted transaction.
Registry/renderer install and restoration follow their dependencies. Rollback
removes a new file only if this transaction recorded intent and its current hash
still matches the proposed bytes. It never restores a database or disables routing.

The private file backup is not yet a verified production ZIP containing a fresh
WordPress snapshot. The guard callback needs a separately reviewed authenticated
WordPress implementation; fixture hashes do not prove real account state. A
future wrapper must keep the private directory outside the complete public web
root, not merely outside the content directories.

An advisory lock excludes cooperating calls using the same private directory.
Atomic rename prevents partial file bytes; compare-before-write detects changes
up to its immediate check. It cannot atomically exclude an unrelated external
writer between that check and rename/unlink. An exclusive coordinated release
window remains required. No whole-release atomicity, power-loss durability or
automatic database recovery is claimed.

An unclean process exit before rename can also leave a temporary content file.
Unknown files deliberately stop inventory checks; there is no recursive or
speculative cleanup. The tested process-death scenario is specifically after a
successful replacement. A future wrapper still needs a reviewed procedure for
earlier process termination, temporary-helper cleanup failures, authenticated
request expiry and actual WordPress/protected-file state. The local component
and its tests do not certify those deployment concerns.

## Isolated Integration Fixtures

The initial PHP component executes in28 Python integration cases. Locally25
pass and3 symlink cases skip because this Windows account cannot create fixture
symlinks. Initial full Python261 cases pass with those same3 skips. The reviewed
source adds3 cases:31 locally,27 pass/4 symlink skips. Linux CI43707563843 subsequently executes all264 cases with no skips, including
the four symlink cases. The job log records `Ran 264 tests` and `OK`. CI explicitly
requires PHP and lints the component before running the suite.

The cases exercise a complete install/exact rollback, dependency ordering,
response loss after a replacement, actual process termination after rename,
same-transaction recovery, source/target/activation/protected-state conflicts,
an unrelated writer installing even the same proposed bytes without our intent,
new-file deletion races, corrupt backup/journal, unsafe roots/paths, unknown
files and competing transaction IDs. No provider, customer or production data
is used. Inspection reports current backup/protected-state verification, rather
than implying that a previously valid receipt remains valid after corruption.

## Full Payload Rehearsal

`tools/rehearse-code-pages-update.py` has no publish flag or network client.
It reconstructs an isolated old tree from immutable Git root commit
`0cec9853877d06eb1ffee21bba296b76553828c2`, whose1,914 owned files exactly match
the completed production inventory. The only other application file is
`runtime.js`: the exact original minified endpoint expression is replaced by
the separately approved14Nov hotfix and its result must match actual prior SHA
`47ae06b74471bef02205bd07e18958cddf1cccabed5a2aa2466463051491937f`.
The recognized activation bytes complete all1,916 prior files. All2,073 local
source files must match the immutable verified staging commit.

The first rehearsal stops before constructing the engine because its
reconstruction anchor incorrectly includes spaces absent from the minified JS.
Closing the Git pipe then masks that initial error with the archive exit error.
The exact full expression and original runtime SHA are now required; archive
cleanup preserves the original exception. `full-rehearsal-initial-failed.json`
retains this preflight failure, with zero fixture application or remote writes.
Temporary directories are removed. This is not a production defect or fix.

The first complete rehearsal, `full-rehearsal-final.json`, passes both complete
apply/rollback and process-death/rollback, ending11:06:55.406272UTC with exact
final old/source inventories. Its engine SHA is
`59b5fe1149866b1ca12163e57d711a712edd7aca238d10eea771279f80dd58eb`.
This is an intermediate version, not proof for subsequent engine changes.
The previous [writer contract](../incremental-updater-2026-11-15/UPDATER-DESIGN.md)
continues to apply. No production helper, write, deletion or purge occurs.


## Follow-up Source Review Before Final Verification

Both first-version2,073-file scenarios pass, including395 recorded replacements
in the complete apply,238 verified prior files and exact old/source inventories.
Source review then adds three checks: revalidate private roots at mutation time,
report current expected/prior inventory matches during inspection, and cancel an
intent when a known failure occurs before replacement.
The last avoids treating an explicitly detected foreign same-byte installation
as our file for rollback. All31 focused cases pass locally with4 declared
symlink skips. `full-rehearsal-reviewed.json` completes11:16:30.337613UTC after starting
11:07:57.113602UTC. Both sources remain frozen throughout. The complete run
records395 intended replacements; the actual process-death case records one.
Both verify238 prior-file copies, restore all1,916 old hashes and retain all2,073
staged files, marker and protected fixture state. Both temporary trees are removed.

Final engine SHA256:
`940a27590887495021db129220274c751323edd0c3ff5c0dac767e94148d9abb`.
Runner SHA256:
`16f14adbf90b68862f78e05bb5f983367c82ae61d4ad5176bfde6104e9018447`.
Raw report SHA256:
`dab1f5f73aa746c3268a687f91c27aae201444087a99f323750321aecc57a942`.
`full-rehearsal-independent.json` independently checks these bindings, the prior
inventory input SHA, scenario receipt consistency and empty Git diff for all
application/planner/legacy tools. It is a receipt consistency check, not an
additional production snapshot or separate rehearsal execution.

Both roadmaps remain57 staging deliveries and G02 partial. The preliminary
roadmap component report passes317 assertions; actual1440px overview and390px
detail images are inspected. Final regenerated-roadmap report `roadmap-final.json` passes317 assertions
after the last plan edit; its actual1440px overview is also inspected. No application build, upload, production helper/write or purge occurs.
