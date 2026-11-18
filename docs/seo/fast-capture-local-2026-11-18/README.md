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
