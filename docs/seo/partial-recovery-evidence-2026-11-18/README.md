# Partial recovery evidence: isolated fixture follow-up

Full run44298298098 ended at its original90-minute job limit while a helper call was unfinished. Its upload retained the partial JSON report but none of the raw helper replies or diagnostic archives. The final state remains unknown. This change addresses that evidence gap; it does not make cleanup faster, complete recovery, grant hosting acceptance or justify rerunning the full test unchanged in substance.

The isolated branch `codex/local-private-evidence-checkpoints` starts from4e0ba0a99a988c29484c6f125efc6cd805a215b9/tree8025cce2ebba5a54c4daca9b7a59eb2af3f793d8. Before editing, all3834 source files match Git and the independently reconstructed source backup0f6b4a0d13bf88783f0a719efbddd3844c8be7be060f6d2e18303fdd9323fe2d, which needs only the self-contained03ec496e baseline. These are source backups, not hosting/database backups.

## Behavior and limits

The local full-fixture observer builds a separate `.checkpoint.zip` after each returned helper call and on a retained timeout observation. Only exact numbered raw replies, complete closed diagnostic-stream ZIPs and a report snapshot enter it. Relative-path, size, digest, ZIP membership/CRC and complete readback checks run before replacement. The archive manifest explicitly denies full recovery and hosting acceptance; it records observed calls and any unfinished call without inventing a reply.

A new sibling temporary file is closed and independently read back before an atomic replacement of the last known checkpoint. The previous file must match its caller-held name/length/digest receipt. Unknown or changed prior files, paths, raw replies or streams refuse. An injected interruption before replacement leaves the prior ZIP intact; only the uniquely owned pending file is removed. A new run refuses a pre-existing checkpoint before fixture creation. No private tree, compiler output or helper authority is reconstructed in this archive.

The actual-inventory workflow's existing always-upload step gains only the checkpoint ZIP path. Both focused workflows select the new native contract module and bind its source. The full fixture fingerprints the two new files. The observer records retention failure and fails rather than silently claiming evidence. A later cancellation during construction can leave an unaccepted `.pending` file and the earlier closed ZIP; the pending file is not configured for upload. The ordinary final evidence archive and its independent verification remain required.

All36 reviewed helper/compiler/runtime inputs remain byte-exact to4e0ba0a. No application source, private cleanup runtime, public capture core, prepared transaction, per-deletion fresh witness/claim/hash/fstat/lock check, context or authority rule changes. The original90-minute job,600-second subprocess observation,60-second comparison,256M PHP memory,2MiB wire, expiry and per-request count limits remain. Checkpoint I/O is local observer overhead, outside the PHP call timer; it is not a hosted or uninstrumented benchmark.

## Verification scope

Thirty-two focused local tests pass without skips. Seven new cases cover exact successive raw archives, wrong paths/hashes/streams, changed or unowned destinations, false completion, timeout-without-reply, preflight refusal, interruption before atomic replacement, and an actual native synthetic PHP helper's exact stdout. The actual helper result is retained byte for byte and remains read-only under its existing public/private assertions. The earlier31-test run is retained before that added integration case.

This does not exercise a real runner SIGKILL or a complete4149-file wrapper run. Complete current focused CI/source audit is still required before accepting this fixture component; it is not complete repository security clearance. Full-size recovery remains unproved and the full-inventory workflow is not restarted merely for this diagnostic change. A separate six-capture Windows32/64MiB buffer probe preserves complete state but shows a small inconsistent timing difference/higher memory; the reviewed hash implementation stays unchanged.

Private source/audit/CI receipts live in the main worktree's `docs/seo/cleanup-runtime-diagnostics-2026-11-18`. Actual staging remains APP530/image delivery70; source-security, hosting quota/coordination and owner/manual gates remain. Native Computer Use is stopped for Windows browser-URL confidence; no alternate native control is used. No hosting/account/helper installation, purge, real form/message/order, production or OmniLodge action occurs. Six batches and the overall goal remain open.

## Accepted focused CI component

CI44319036853/job134852777555 succeeds on exact46c2313fc12c12842b336315a8a5870cb8999e9c/tree9e32e1c17d7e9e1a823cb0f8401c7b3481d46dd7. Independent audit verifies91 Git/current inputs, both archive members and CRCs, native147/147 plus16/16 phase scenarios, zero skips/errors/failures, workflow/source/API/checkout/raw-log bindings, and every scenario's existing public/raw-row/retained-metadata assertions. The clean worktree and all inputs remain exact. Earlier pending-CI notes describe the source checkpoint before this result.

Artifact30623B/SHA256c9c245a99db0c9a67f02ab1e30a2a505634c8cca3fc1ebc8005f939ef2392c28; raw log77629B/SHA256d0c29448e259ba1febd15009c9c53e398294996e648cd1c87a9ff7ff2d3ccace; workflowSHA955a1ac82904687b7f17c1cb65b845dad65b4aadd188e74bc3768543b8ad3028. Private receipt: accepted-partial-evidence-phase-independent-audit.json. The64MiB calibration is separate and changes no helper input. Actual-size wrapper/runner-interruption, full recovery and hosted acceptance remain absent; no full-inventory retry occurs.
