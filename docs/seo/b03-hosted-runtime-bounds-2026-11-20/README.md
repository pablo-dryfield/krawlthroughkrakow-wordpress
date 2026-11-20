# B03 hosted request limits

The hosted recovery rehearsal must enforce its PHP limits before reading protected state or changing private fixture files. The previous runner reported the hosting defaults without lowering them to the approved ceilings. The 20 November attempt was stopped when this gap was identified; it is not accepted hosted recovery evidence.

New live `rehearse-staging-full-private-engine.py` runs now enable request limits automatically. The snapshot, engine and disposal compilers apply the same authenticated guard. It lowers PHP memory to at most 256 MiB and execution time to at most 60 seconds, preserves stricter existing settings, checks the resulting values, and refuses with a bounded 503 before work if the controls are unavailable. These are request-local changes; no hosting configuration file or account setting is changed.

The hosted profile also limits a preparation request to 16 MiB and 64 opened files. The complete inventory and transaction plan remain intact. The finite preparation/recovery call budget derives from the full inventory and these smaller batches. Default offline compiler output and the legacy 32 MiB/128-file profile remain byte-identical to their frozen references; their hashes are not replaced to make a test pass.

The engine and disposal clients require an explicit runtime witness, validate memory/execution/peak values, use a 60-second socket timeout and reject a verified reply arriving after 60 measured seconds. An uncertain response retains the original inspection/fencing and stop rules. A timeout never authorizes an unchanged mutation retry.

The before/after snapshot requests also require the enforced runtime witness and an exact no-store directive, use a 60-second socket timeout and reject late replies. They retain the complete existing identity, seven-table, row-count and file-map validator. The raw snapshot response is bounded to the original capsule's 16 MiB raw selected-state ceiling; no partial snapshot is accepted. Request timings and header witnesses are recorded without private response bodies or tokens. Snapshot allocation peaks are not reported by this protocol; enforced PHP memory limits remain a separate verified fact.

PHP's execution timer excludes some I/O and database wait time on non-Windows platforms. The timer alone is not a universal wall-clock termination guarantee. The hosted profile combines PHP limits with smaller work batches, the caller checks and the separately enforced exclusive-window deadline. See the [PHP timer documentation](https://www.php.net/manual/en/function.set-time-limit.php) and [memory directive documentation](https://www.php.net/manual/en/ini.core.php#ini.memory-limit).

Use the explicit `--hosted-runtime-bounds` flag when reproducing or inspecting this profile. Saved contexts must recompile to their exact helper SHA before credentials or a connection are loaded. The earlier stopped context is preserved; changing a flag or recompiling new code does not upgrade or refresh its authority.

```powershell
./tools/rehearse-staging-full-private-engine.ps1 --rehearse-staging --application-commit <reviewed-staged-application-sha> --tooling-commit <clean-current-tooling-sha> --capture-profile bounded-complete-sha256 --hosted-runtime-bounds --interrupt-original --interrupt-engine --report <fresh-private-seo-report.json>
```

The existing DPAPI-backed wrapper supplies the credential privately. Never place its plaintext value in a command, report or source file.

## Retained attempt and verification scope

The stopped attempt last verified 1,471 private files and 456,523,668 bytes during preparation. Its final in-flight private state is unknown; those checkpoint counts are not a final inventory. Only the exact unchanged temporary helper was removed. All partial private copies, signed records, original archives and encrypted packets remain retained until owner review and cleanup approval.

A fresh read-only snapshot using the enforced runtime guard subsequently matched the original seven selected tables, site identity, row counts and captured owned/protected file maps exactly. Both fresh captures and helper removal are verified. This is selected state evidence after the stop, not a completed full rehearsal, a whole-host backup, a cause for earlier raw-state failures, or production acceptance.

The local checks exercise real PHP HTTP enforcement, stricter settings, unavailable controls, source inverses, exact frozen default bytes, client runtime witnesses, and compiled preparation/apply/rollback/closure. A larger synthetic inventory exercises both work ceilings and uses the production-derived call budget, while keeping the original small-fixture checks unchanged. Hosting acceptance and current-source CI retain their separate required evidence; local checks do not replace either.

The owner confirmed a quiet staging window until 09:00 Europe/Warsaw on 20 November and retention until review. That window has expired without a new rehearsal starting. A new confirmed quiet window, fresh capacity, exact source identity and an adequate cleanup reserve are required before another attempt. The existing retention decision still applies; an expired context is never replayed. Production, commerce/Ecwid, forms, functional consent, provider accounts and OmniLodge stay outside the rehearsal.

The final successor passes 80 tests, including 25 hosted-bound tests and the existing snapshot/client/caller contracts; all six recovery-profile checks also pass. Source hashes before and after both runs match. The earlier 43-test version remains frozen and backed up separately. An earlier compatibility failure in the frozen compiler inverse and two larger-fixture test failures remain recorded privately; the corrected checks retain the original frozen hashes, complete inventory and production-derived call budget. These are local test results, not hosted acceptance or current-source CI.
