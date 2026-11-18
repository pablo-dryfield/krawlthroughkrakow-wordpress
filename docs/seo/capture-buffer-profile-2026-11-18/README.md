# Complete capture eligibility calibration: isolated measurement

This branch measures whether extending SHA256 buffer eligibility from32MiB to64MiB helps on GitHub's Ubuntu runner. The earlier six-capture Windows experiment preserves complete state but shows only a small inconsistent timing difference and higher memory. It does not justify changing the helper. The current helper, its36 reviewed compiler/runtime inputs, all2424 application files and the raw production/staging capture sources remain unchanged here.

The parent is46c2313fc12c12842b336315a8a5870cb8999e9c/tree9e32e1c17d7e9e1a823cb0f8401c7b3481d46dd7, the separate partial-evidence fixture follow-up. All3837 initial worktree files match Git and the independently reconstructed60ba0d00cb8eb61d51b3ae8e6b1068a6119f9ae6797e31ccff0d945e2cd9edfc source overlay using only the full03ec496e baseline. The fixture worktree remains frozen for its own native CI and audit; this calibration uses `.worktrees/ktk-capture-buffer-candidate` on `codex/local-linux-capture-buffer-profile`.

## Exact experiment

The existing default `raw-vs-bounded32` profile retains the complete raw and reviewed32MiB components. The explicit new `bounded32-vs-bounded64` profile changes one numeric eligibility cap in a temporary measurement component. Replacing that cap recovers the whole reviewed32MiB component, whose inverse recovers the immutable raw core. The256M memory limit, current-allocation plus twice-file-size plus16MiB headroom check, exact complete read-length check, SHA256 format and original complete streaming fallback remain byte-exact. No digest is cached, and no file, selected table or field is omitted.

Both temporary components stay outside the synthetic public/private namespaces. Their complete PHP bytes and hashes are retained with the raw observations. The candidate component is not written into the reviewed compiler or application. Exactly one existing35,437,747-byte video becomes newly eligible. All original media bytes remain.

The existing complete-calibration loop still uses all2074 Git/current public files/550639063 bytes, seven raw fake database tables (including the existing9MiB fake row), three balanced pairs, native elapsed/peak metrics and complete public before/after checks. Every field and SQL query must equal the baseline apart from separately retained capture timestamps. All six raw observations and both component sources enter the new profile's independently reopened ZIP. The15-minute job bound and original memory/observation rules stay unchanged.

Only the calibration tool, its tests, this README and the calibration workflow change. That workflow gains the exact new measurement branch and selects the profile from its fixed branch identity; the old branch keeps its raw/32 comparison. It uses read-only repository permission and no hosting/account credentials. Pushing the new branch starts one calibration job; it does not start the full cleanup workflow.

## Verification and limits

Seventeen local native/evidence contracts pass without skips. New tests preserve the complete default arms, prove the64-to32-to-raw inverse, reject unknown profiles, hash the entire newly eligible video using the prototype, and exercise the unchanged low-memory streaming fallback under the actual256M process limit. The first run has two harness errors from decoding an already-string constant; those are corrected without changing the experiment and the failed log is retained.

The local tests do not establish an Ubuntu timing benefit or exercise the new complete-comparison loop on the runner. Source-bound CI, all six complete captures, archive/readback, source/workflow/public-map checks and retained native runtime metrics remain before any conclusion. No standalone capture gain would establish complete cleanup/hosting recovery, and this measurement alone does not authorize a4149-file retry.

Actual staging stays APP530/image delivery70. Security, hosting quota/coordination, owner/manual and production gates remain. Native Computer Use is stopped for Windows browser-URL confidence; no alternate native control is used. No helper installation, hosting/account change, real form/message/order, purge, production or OmniLodge operation occurs. Six batches and the full goal remain open.
