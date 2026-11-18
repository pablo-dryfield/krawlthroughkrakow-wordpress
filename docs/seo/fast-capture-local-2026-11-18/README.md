# Complete capture calibration candidate

This isolated candidate derives a staging-only capture from the immutable raw
core. No active helper or production compiler uses it. The raw core and all
existing application, recovery, expiry, memory, response and work limits remain
unchanged. This is not a hosted delivery or full recovery acceptance.

The preceding full diagnostic is terminal failure: public capture occupies
93.03% of the cleanup wall time; fixed startup already exceeds the 60-second
gate. See the [diagnostic record](../cleanup-runtime-diagnostics-2026-11-18/README.md).
Reducing the deletion count alone cannot resolve that observed startup cost.

The derivative fully reads every current file on every invocation. It uses
OpenSSL SHA-256 only for eligible files of at most 32 MiB, with a checked memory
budget, exact read length and validated digest. Otherwise it retains the
original streaming implementation. It caches no digest. Its complete inverse
recovers the original raw source; the production source pins stay exact.

Eight native candidate tests cover the inverse, native capture, complete raw
tables, exact queries, fallback paths, memory settings and changed current
bytes. Four calibration contracts cover balanced order, complete retained
observations, refusal of differing states and exclusive archive readback.
No tests skip when PHP is absent: candidate proof requires native PHP.

Earlier Windows-only calibration measured three balanced pairs across all
2,074 public files / 550,639,063 bytes and seven synthetic tables, including a
9 MiB synthetic post. Median original capture was 3.164 seconds and candidate
1.991 seconds, with maximum allocated PHP peak 27,262,976 bytes under 256 MiB.
The reproducible harness then passed a one-pair local smoke comparison at
2.982 / 1.882 seconds. All complete fields except separately retained actual
timestamps, all seven raw tables and all queries matched; all public bytes
remained exact. These measurements do not establish Linux or hosting speed.

`python -m tools.calibrate_staging_capture` verifies public inputs against the
complete build manifest and Git blobs, copies them into an isolated synthetic
fixture and retains every native observation. Its default three balanced pairs
record capture and process wall time separately, actual PHP/OpenSSL versions,
peak allocation and all timestamps. It checks the complete public tree after
each capture and never creates a private transaction. The archive is reopened
and all member bytes and CRCs verified. The CI mode also checks every compiler,
fixture, imported module and dynamic source input against the exact checkout.

The focused Ubuntu workflow measures equivalence and performance without
requiring a speed improvement. It has no npm, network client, credentials,
deployment or cleanup step. It does not rerun the unchanged long full fixture
or clear the existing standard CI/security gate. Full recovery still needs
its own bounded actual-inventory proof after source improvements.

Before calibration work, the isolated three-file prototype was preserved in
`seo-fast-capture-before-calibration-20261118.zip`, SHA-256
`a37e9e48c0f9b2afdb6db63e5cbae5c55a242a7f57073e30e561b30ab3d72069`.
It reconstructs all 3,824 current source files with the self-contained b597
baseline archive SHA-256
`03ec496e7535ef057d9568247ba91eae33404f144700595752caa0fcc6e75d6a`.
All reconstructed bytes and overlay CRCs were verified. No hosting/database
backup is claimed. The branch was subsequently rebased to the local 497dccf
documentation checkpoint; all three prototype file hashes remained exact.

## Independently verified Ubuntu result

[Focused CI44286368965](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44286368965), job134739975205, passes all twelve contracts without skips. Exact source df57eed77ae6edeaddf03f17e55361f67e424755 and actual checkout tree de8091aacf8031c8d7af45a87bb3ebe763068d6d verify independently. Six captures in three balanced pairs retain every field, timestamp and query. All20 Git source inputs, all2074 public mappings, all seven raw synthetic tables, exact metrics, outer/inner ZIP CRCs and member readbacks verify. Median capture is2.444564059 seconds original /0.858137224 candidate; process wall2.531638556 /0.945554449. Maximum PHP allocation24756224 bytes remains below256 MiB. The actual runner uses PHP8.3.6/OpenSSL3.0.13. No hosted speed or complete recovery is claimed.

The retained59,142,634-byte artifact SHA256 is f7c29173e041c57748ba27e24719d56dc956955ab0ceebc1dfbb1c18f037ff1c; its six-member inner evidence SHA256 is63a913c04110e58b5cfaf1ad74e838c46b673bb7b9acac2f503e8d16485279bf. Raw log28,492 bytes SHA2566a23f6e7b3c5b9d178569159869a06d7011225bf90a90f0e09136842928ab3ba proves12 native tests and the exact checkout. Private accepted-hash-calibration-independent-audit.json retains the independent receipt. The diagnostic inventory-map SHA uses traversal order and differs between operating systems; all complete raw maps match, and signed runtime canonical witnesses remain unchanged. This encoding detail does not justify omitting any file.

Before commit, source snapshot seo-capture-calibration-precommit-20261118.zip (505096 bytes, SHA2564ae1738262d09743562159afb012e20e3837340313c41e5e8f137a25eb138f7e) independently verifies all3829 Git/local/reconstructed source files and all14 overlay payload readbacks/CRCs, with only the full03ec baseline dependency. A strict local exact-source one-pair smoke then passes at3.154 /2.152 seconds, separately from the earlier development smoke and Ubuntu evidence.

A successor isolated branch codex/local-private-capture-budget adds a private census derivative and wires both complete-hash derivatives into its local termination compiler only. The original public/raw/production cores and raw private census remain exact. Four new census contracts plus eight public contracts, the updated native compiler contract and one real four-role lifecycle pass locally. The derivative uses the identical bounded hashing body, preserving every existing file type, identity, link count, size, timestamp, ownership, lock and double-census check. This uncommitted successor is not accepted by the older phase/full-inventory CI; no bounded scheduler has yet been implemented. It needs complete current native/source/CI and actual-size proof before integration or any permitted hosting rehearsal.

Both roadmaps revision15 retain all eight statuses, six remaining batches,70 verified website deliveries/74 records/40 workstream states and C08. Main application/runtime remain exact; actual staging stays APP530. The existing unpatched dependency gate, owner quota/coordination/retention and manual/account/production dependencies remain open. No hosting helper, upload, purge, account mutation, real form/message/order, functional consent, production or OmniLodge action occurs. Original previews and the native account-UI stop remain respected; the full goal stays active.

## Private census and cooperative cleanup successor

The successor source branch adds a reserved-work scheduler to the isolated termination helper. The complete public capture PHP remains byte-exact to the accepted Ubuntu component. Its source builder documentation now names the private compiler caller. The raw public/production captures and raw private census remain unchanged. The derived private census passes all28 native contracts, including every original read-only phase, closure-prefix, private metadata race, raw/public drift and lock-lifetime case.

The scheduler starts before the first authenticated cleanup witness. It records monotonic elapsed time and the maximum observed full witness, full census and per-item costs. Before beginning another item, it reserves a complete final census, final full witnesses and reply time inside a55-second scheduling budget. The original60-second acceptance gate remains separate and unchanged. Runtime estimates cannot guarantee an external I/O delay; actual-size native proof is still required. If startup already consumes the usable budget, it returns a fully checked pending state without deleting payload. The reply reports a typed cleanupStoppedForRuntimeBudget flag; this never turns remaining payload into completion.

Every actual payload deletion retains the original fresh complete witness, claim readback, held/file/named identity, size, link, timestamp, stream hash and final unlink-boundary checks. Both complete private censuses remain. Nonempty directories receive a read-only precheck; every attempted directory removal still repeats the original witness, claim, identity and emptiness checks. Count ceilings remain256 files and256 directories. Public, database, purge and production write counters remain zero. Token, expiry, wire, memory, authority and lost-reply behavior remain enforced.

Six timer-policy contracts cover reserve accounting, first-removal reinspection, startup costs, slower prior samples, invalid/backward clocks and invalid work sizes. Native synthetic-clock cases prove partial progress followed by a new context, rejection of consumed authority, zero deletions after excessive startup, refusal of final witness drift after partial work and preservation of a directory filled after the precheck. The initial two-case run crossed a directory-gate placement edit and is preliminary only; the final expanded selection is run again against the final source. Synthetic time is not a hosted or actual-size speed result.

The source-bound phase selection expands to128 native cases and retains all16 interrupted/lost-reply scenarios; source fingerprints are87 full /88 phase. The30-minute phase and90-minute full-job budgets,600-second local observation,60-second comparison,256M memory,2MiB reply and original work/expiry limits remain unchanged. All earlier tests remain selected. The full fixture is not restarted for an unchanged old source, and no full recovery acceptance is claimed. Calibration artifact compression is now6 so complete raw observations remain retained without the earlier redundant59MB transfer size.

This successor is isolated from the main source and every hosted helper. No real account, database, form/message/order, consent, commerce, production, cache policy or OmniLodge operation occurs. The existing dependency security and owner/manual gates remain in force.

## Preparation extension and strict progress

A separate successor branch adds an explicit bounded-sha256 capture profile to the full private seed and engine factories. Their default raw helper bytes remain exactly reproducible, including both late/early seed entry profiles. Complete compiler-source inverses verify immutable pre-extension SHA2564b9e329c431a0e8bbc6e7ba5560515d39ccde047b9da43ba8b766fe38c9cf256 and422506ccee365d1b1cb48119b705350ee7c7f2d3832f98520ace477c925fbea3. No historical Git reference is needed by these tests. Five compiler contracts reject missing/changed derivative outputs, unknown profiles and raw scope drift without overwriting anything. Three real native opt-in preparation cases verify all captured fields, original-archive gating before payload copy, interrupted-prefix continuation and preservation/refusal of unknown private prior evidence.

The staging-only seed/engine CLI callers explicitly select the reviewed profile for both new and resumed compilation and report the selection. Existing encrypted recovery source/helper bindings, ownership, quota checks and staging-only authority remain enforced; no context or token is replayed. Raw public/production captures and both immutable generated capture PHP files remain unchanged. The full fixture separately records its explicit preparation-capture choice; its default remains raw. The dedicated full-inventory workflow selects bounded-sha256 for its next reviewed source. This is source preparation, with no live/helper/account operation.

The fixture request-count guard is corrected for cooperative scheduling. Its old49-request bound assumed requests processed near their256-item ceiling; that assumption is invalid when a request yields early to reserve final verification. The new finite ceiling is the declared known payload plus source/target directories plus one confirmation. Every successful cleanup must strictly reduce that count, with exact deleted-file/directory counters, no new private entries, unchanged retained descriptors and a complete fresh signed-closure state. A zero-progress reply is a failed full-recovery proof and stops immediately. Four small evidence-reader contracts and actual partial/zero-progress native cases check these requirements. This changes the fixture's request-count calculation; it does not raise either256-item per-request ceiling or the90-minute job,60-second acceptance,600-second observation,256M memory,2MiB response or expiry limits. Full recovery still requires every payload removal and final complete public/private verification.

The expanded phase source selection contains140 native cases plus the original16 scenarios, with88 full/89 phase fingerprints. Complete current CI and actual-size runtime/recovery proof remain pending for this successor. Earlier1e7fb56 scheduler source is independently frozen on its own branch and in CI44290434004; later preparation edits cannot change that running checkout. The earlier full diagnostic remains a failure.

Retained preflight refusals include one incorrect local unittest class selector and an atomic CLI edit whose exact checkpoint anchor differed; both were corrected without a partial source write or weakened contract. The new support proof refuses metadata removal/change, unknown additions, invented counters, incomplete witnesses and zero progress. All original safety, security, owner/manual and production boundaries remain in force.

## Current saved source checkpoints

Scheduler1e7fb561154d75d1c1505182a16fb6c1a1be4617 is frozen in CI44290434004/job134753965902, still running at11:19UTC. Its128 native cases and16 scenarios are not yet accepted. Source snapshot557731B SHA2568c6b62b557f6948359d3560f81edf4352af5e9c08455e78f61db10f93b63b25e independently reconstructs all3833 files with full03ec.

Preparation successor4e0ba0a99a988c29484c6f125efc6cd805a215b9 is committed/pushed separately and passes53 final local tests without skips, with all88 inputs exact before/after. Snapshot580704B SHA2560f6b4a0d13bf88783f0a719efbddd3844c8be7be060f6d2e18303fdd9323fe2d independently reconstructs all3834 files with full03ec. Its140-case+16-scenario phase CI and full actual-inventory proof are not queued yet. No full-size fixture was restarted this turn. The main application/runtime remain unintegrated and actual staging remains APP530. Both roadmaps stay revision15/six remaining/70 website deliveries until further verified evidence. The11:13UTC official registry/advisory recheck still finds latest4.0.7 affected/no patched version.

## Accepted native scheduling proof

[CI44290434004](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44290434004), job134753965902, is now independently accepted for exact scheduler source1e7fb561154d75d1c1505182a16fb6c1a1be4617/tree56a2b570a7aa2b28bcb7fbe489f04a707b49a8bf. All128 native cases and16 scenarios pass without skips, errors or failures. All88 source fingerprints match Git; both reports share them, the actual checkout matches, and all scenario raw/public/retained metadata checks pass. Workflow SHA2564e6f0981c5c8223bc98f4763de7cf773be76cd151a11d3925655711241ee94d8 matches the raw log. The29,779-byte artifact SHA256e56272e2546a707e147fa799d098cc893ea18ee1fb8b60412b8192e9abf761fe reopens with exact two members and CRCs. Raw log72,879 bytes SHA256b37543fb8d54390e7141cd830a10eaae71ed8dfd4ba38bbeedc8db21780d4204 and the private accepted-scheduler-phase-independent-audit.json retain the audit. This is complete native component evidence, not full actual-size or hosting recovery acceptance.

The successor4e0ba0a has nine changed inputs relative to that older run, plus its additional preparation test module. Its separate [CI44294345856](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44294345856), job134767351081, is running140 native cases and16 scenarios against89 inputs as of11:24UTC. The older green run does not accept these later edits. Both source branches stay frozen; no full-size run was repeated. Both roadmaps revision16 retain six remaining batches,70 website deliveries and all existing statuses and constraints.

## Accepted current preparation proof

[CI44294345856](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44294345856), job134767351081, now independently verifies all140 native cases and16 scenarios without skips/errors/failures for exact4e0ba0a99a988c29484c6f125efc6cd805a215b9/tree8025cce2ebba5a54c4daca9b7a59eb2af3f793d8. All89 Git inputs match both reports and the current source worktree. Every scenario retains exact raw/public/metadata checks. ZIP30,087B SHA256f492559be301c3de993ea81af5622c3a2cd90e08abe30ecf9804bd7e8f18b9e3 has exact two members/CRCs; workflow SHA256891798ef37bc1cbb112466713d233ecd8c159326619f0a11f61b3f90441fb384 matches the raw76,197B log SHA256555123338f250b7386ab0dc2bfb85fe180b467b4d540a0bd2ac3845aafd7027c. Private accepted-preparation-phase-independent-audit.json retains the complete receipt.

[Full-inventory CI44298298098](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44298298098), job134781011890, is running as of12:01UTC against that same frozen source and the actual2074-public/4149-private cohort with explicit bounded preparation capture. All original request, memory, wire, expiry, observation and90-minute job gates remain. Its result, complete payload removal and final complete public/private checks are not yet accepted. No hosting action occurs. Both roadmaps revision17 retain six remaining batches and70 website deliveries.
