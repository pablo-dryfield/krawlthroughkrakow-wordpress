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

Current source:31 isolated cases run locally,27 pass and4 symlink cases skip
under Windows restrictions. The first full payload rehearsal passes both
complete and interrupted rollback scenarios. Three follow-up guard improvements
are implemented and pass focused fixtures; a new full rehearsal is running
against those final engine/runner hashes. No production readiness is claimed.

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

## Isolated Integration Fixtures

The initial PHP component executes in28 Python integration cases. Locally25
pass and3 symlink cases skip because this Windows account cannot create fixture
symlinks. Initial full Python261 cases pass with those same3 skips. The reviewed
source adds3 cases:31 locally,27 pass/4 symlink skips. Linux CI must execute
the symlink cases before cross-platform coverage is claimed. CI explicitly
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
symlink skips. `full-rehearsal-reviewed.json` is running against the final
engine/runner hashes, with both sources frozen until its terminal result.
