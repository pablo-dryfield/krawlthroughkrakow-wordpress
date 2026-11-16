# Controller initialization recovery and staging rehearsal

Started 16 November 2026. This is G02 release engineering following verified website delivery 65. It does not add a website delivery or complete G02. Production, commerce/Ecwid, forms, functional consent, the medical hold, the active competition and OmniLodge remain preserved.

## Baseline and rollback source

PR88 is merged as `8f67c488ed5b030c5338519e319aa2644621095b`, reviewed tree `9989838fbbe9e33a8b571b464bb0ddcdba08dcf5`. Final-source CI43797739471 and main CI43798023739 pass all three jobs. The staged application remains `93aa88a19a3956788e80fe7e9c7c16bb986b980f`; both roadmaps remain at 65 verified website deliveries and C08 is unchanged.

The 03:30:27.496583 UTC pre-edit checkpoint verifies all 3569 Git/local files and every reconstructed composite byte. Both archives are required and retained:

- Parent `deploy-backups/seo-guarded-release-controller-before-20261115.zip`, SHA256 `50a70f592f68d4f427aa0bbfbfb20ce206562bfc34340a62f17ef3b6f61b4bd2`.
- 46-file overlay `deploy-backups/seo-controller-initialization-recovery-before-20261116.zip`, 976663 bytes, SHA256 `aab138b44ade88843c0f45d64349c3a3219e5458c9b1364e3df8f26a447490aa`.

Fresh SHA, ZIP CRC, membership and complete reconstruction checks pass. Neither archive is a hosting or WordPress backup. Branch: `codex/staging-controller-initialization-recovery`. Private machine evidence: `source-backup.json` and `verify-engine-inverse.py` in this folder.

## Recovery behavior

The ordinary prepare action still refuses repeated or incomplete initialization. Explicit `inspect-preparation` and state-fenced `recover-preparation` handle an absent namespace or an authenticated, owned namespace containing only known preparation artifacts. A missing or unauthenticated ownership marker is preserved and refused. Existing activation, complete source/target inventory, protected-state, archive acknowledgement and later lifecycle guards remain.

The engine change is an additive 125-line block. Removing it recovers every old engine byte exactly, including ordinary prepare/apply/rollback guards; all 2373 application Git files remain exact. Recovery completes only matching private backup/receipt prefixes. Active corrupted receipts, unknown files, duplicate temporaries, symlinks, hardlinks, stale inspection state and later transaction phases refuse before mutation. Once receipt creation starts, every prior backup must already be complete.

Original snapshot records retain their actual capture time. New pending snapshot filenames authenticate that timestamp even when only a short prefix exists. Final signed record format is unchanged. Complete legacy pending snapshots remain supported; partial legacy snapshots lacking an authenticated timestamp are preserved and refused. Private source/target seed recovery uses its own complete inventory fence and exact expected bytes. No public application, activation, database or cache write is part of preparation recovery.

The compiled staging helper has a server-only fault option that exits after owned original/plan records and the source directory exist, before seed files/target initialization. It is not an HTTP field or production mode. The optional fault choice is retained inside the CurrentUser-DPAPI recovery packet for exact helper recompilation.

## Local evidence so far

- Engine recovery: 17 tests pass in 31.481s, one local Windows symlink skip; original engine/controller/compiler contracts: 84 pass in 98.995s, eight filesystem skips.
- Signed preparation records plus existing archive/compiler contracts: 52 pass in 31.534s, three skips. Seed recovery: 11 pass in 6.156s, one symlink skip. Existing wired request/controller/client/transport contracts: 68 pass in 99.279s.
- Compiled controller recovery: 10 pass in 51.568s, covering interrupted original/plan/seed/backup/receipt writes, preserved cross-second capture time, lost replies, stale/protected/unknown/corrupt state and unchanged archive/apply/rollback/close flow. The first run failed four cases because the Windows test fixture path exceeded its local path limit; shortening only that temporary fixture prefix fixes it. Product guards and filenames remain intact; the failed log is retained.
- Authorization and strict metadata-only client contracts: five pass in 3.235s. Real compiled initialization exit plus existing recovery packet tests: 14 pass in 11.199s, one Windows symlink skip.
- New runner protocol/cleanup tests: six pass in 12.010s, no skips. This executes the actual compiled fault, recovery, archive acknowledgement, five private applies, five rollbacks, signed closure and 19-file disposal retaining seven metadata records. An initial import error was corrected to the existing transport class name before any hosting operation; its log remains.

These are local results. Full unchanged-source regression and CI remain before host installation. Local environmental skips are not reported as coverage from this machine; Linux and native Windows CI supply their own results.

The final runner-focused suite expands to 12 passing tests in 16.658s with no skips. Actual temporary Git repositories prove clean exact-source/dynamic-inventory acceptance and wrong-head, dirty and ignored-but-untracked public-file refusal. Lost helper deletion replies receive read-only absence inspection; an uncertain unexecuted deletion is never automatically repeated. The earlier ten-case gate run passes in 17.071s. The broader local suite started before these six additional gate/cleanup cases; final CI must include them all.

Roadmap Python/source checks and 317 browser contracts pass after regeneration. The first browser run retains six evidence-text failures caused by a newly introduced typographic apostrophe being read using the existing builder's Windows-default encoding. Plain ASCII wording fixes the source; no guard or browser test was relaxed. Actual 390px overview and 1440px workstream PNGs were inspected, plus the G02 progress text in a separate browser tab. Six axe contexts have zero violations; overview aria review and task-dialog contrast incompletes remain. The owned review tab is closed; the original user tab is preserved. An initial incorrect invocation of the browser harness without its mandatory output argument is retained separately.

## Staging runner and remaining gates

`tools/rehearse-staging-content-controller.py` defaults offline. Explicit `--rehearse-staging` requires a clean exact tooling commit, the exact application commit, verified dynamic public inventory and reviewed dependency hashes. Its PowerShell wrapper decrypts the existing FTPS secret into the child environment, clears it and zeroes the temporary BSTR. No password/token/key is written into source, documentation, command arguments or reports.

The runner archives two matching protected snapshots and removes that helper before compiling the controller. It persists and decrypt-verifies the encrypted recovery packet before helper upload; uses exact helper bytes and raw FTPS without automatic mutation retries; observes the controlled exit; explicitly inspects and recovers; downloads and independently verifies the seven-entry rollback ZIP; acknowledges it; applies five synthetic changes one file per call; rolls back five; closes; removes its exact helper; disposes only the 19 declared archived private payload files while retaining seven signed/ownership metadata records; and takes two fresh snapshots. Public/selected WordPress/protected-file state must remain exact. Reports contain metadata and archive hashes, never raw WordPress content or credentials.

Unknown or changed helper/private data is preserved. Uncertain mutation responses stop without automatic retry, leaving the encrypted packet and verified archive for explicit inspection/recovery. This runner is a bounded private five-change acceptance fixture, not a full public-inventory host transaction or a production installer. No actual new host packet/helper/rehearsal exists yet.

G02 still needs actual acceptance of this runner, broader/full private-host scalability, complete installer/recovery orchestration and coordination/retention work. Private production backup, separate owner approval and production checks remain distinct production gates. No whole-release atomicity, complete database restoration, arbitrary-writer safety or hardware/power-loss guarantee is claimed. The complete SEO/website goal remains active.

Primary PHP references retrieved 16 November: [fsync](https://www.php.net/manual/en/function.fsync.php) and [fstat](https://www.php.net/manual/en/function.fstat.php). Handle identity checks and flushes support the explicit integrity fences; they do not establish those broader guarantees.
