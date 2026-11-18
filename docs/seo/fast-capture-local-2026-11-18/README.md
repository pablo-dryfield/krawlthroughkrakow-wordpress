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
