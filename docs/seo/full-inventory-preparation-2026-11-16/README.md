# Full-inventory staging preparation

This continues G02 after the independently verified bounded controller lifecycle in PR89. The complete SEO/website goal stays active. Both roadmaps remain at 65 verified website deliveries; C08 is unchanged. Production, commerce/Ecwid, forms, functional consent, the medical hold, the active competition and OmniLodge remain preserved.

## Verified baseline and source backup

PR89 merges as `a4ce1eb86f0f9f03e50403d55a84dbe25ad042d5`, exact tested tree `b7eab1958a535fbefe2127e96178c923e736d495`. Final PR CI43810222514 and main CI43810562868 pass all three jobs. Main executes 621 Linux cases in 80.408s with one native-Windows platform skip, 11 Windows cases in 0.222s without skips, secret scanning and the isolated build. Completed local/remote branches are removed with fresh exact-SHA checks; the root worktree and both existing previews are retained. The previous folder's `final-checkpoint.json` verifies all 3582 Git/local blobs, hosted source hashes and all 2074 public hashes exact.

The 05:35:40.434980 UTC pre-edit checkpoint verifies all 3582 Git/local files and every reconstructed composite byte. Both archives are required and retained:

- Parent `deploy-backups/seo-guarded-release-controller-before-20261115.zip`, SHA256 `50a70f592f68d4f427aa0bbfbfb20ce206562bfc34340a62f17ef3b6f61b4bd2`.
- 60-file/1030306-byte overlay `deploy-backups/seo-full-inventory-preparation-before-20261116.zip`, SHA256 `ca5b58c458870deea2d097945948b346053c8ed1d90b7568b1c75b8398c70e3d`.

Fresh SHA, ZIP CRC, membership, per-file Git blob and complete reconstruction checks pass. These are source archives, not a hosting/WordPress backup. Current branch: `codex/staging-full-inventory-preparation`. Machine-private evidence: `source-backup.json` and the source backup log in this folder.

## Capacity facts needed before full-size preparation

The current exact public build has 2074 files totaling 550629558 bytes. Its largest original video is 35437747 bytes. That exceeds the existing embedded synthetic seed helper's 16 MiB per-file/128 MiB aggregate caps. Those limits remain unchanged. Full-size streaming preparation, interrupted-prefix recovery, scalable cleanup and actual hosting capacity/runtime proof remain engineering work.

The new separate probe observes metadata only. It uses the unchanged staging capture core SHA256 `223b28dab84918a42a23e750a77dcf85a90ac49bcfb0ee2ec9bc7ceea60844fb`. Two successive complete selected-state/public/protected captures must agree with the compiled reviewed hashes. Only identity, counters, hashes, inventory sizes, filesystem observations and PHP runtime/read-cost figures leave the server; no raw WordPress rows, SQL diagnostics or private paths enter the response.

The helper requires the exact staging host/home/site URL, disabled indexing, POST body `{}`, an expiring token, exact helper name and reviewed inventory. Invalid authentication, method, identity or body stops before queries. Public/protected/selected-state drift and database errors return a generic failure. It performs no application/database write, private payload allocation/copy or cache purge. It has no production mode.

`tools/audit-staging-full-inventory-capacity.py` defaults offline and requires exact clean reviewed application/tooling commits and a protected-state baseline. Explicit `--audit-staging` installs one exact short-lived helper using the existing scoped lease and bounded FTPS adapter, validates one uncached authenticated metadata response, rechecks immutable local source/build data and removes the helper with absence readback. There are no automatic command retries. Its PowerShell wrapper uses the existing DPAPI-encrypted FTPS secret in the child environment, clears that environment entry and zeroes the temporary BSTR; no password enters command arguments, source, reports or chat.

## Local verification and honest limits

The first ten-case run has nine passes and one validator error: the existing core identity also contains front-page ID and WordPress environment label. The validator now accepts exactly the complete five-field identity with strict types, while canonical staging URLs and disabled indexing remain mandatory. The unchanged core and its guards are preserved. The corrected combined probe/core suite passes 35 cases in 9.775s with one local Windows symlink skip. Final probe/runner/core coverage passes 40 cases in 10.228s with the same local skip. The invalid-expiry fixture is moved farther beyond the boundary to avoid a clock-tick race; focused revalidation and exact-source CI are required before host installation.

Coverage includes real compiled PHP captures with all fixture files retained, no raw-row disclosure, wrong/expired authentication, wrong identity/method/indexing, noncanonical/client-path payloads, public/protected/database drift, drift between captures, generic SQL failures, strict metadata-only response shape, no quota/full-host overclaim, wrong cache/content-type/redirect/oversized responses without retry, and a default-offline runner that never instantiates a connection, compiler or request.

No new hosting helper, staging capacity result or payload copy exists yet. Source CI and actual read-only staging observations remain before claiming this probe delivered. A successful metadata census would still not be full-inventory transaction acceptance, an account-quota verification, an allocation reservation, a write/copy benchmark, an external request-timeout guarantee, a production backup/approval or whole-plan completion.

PHP's [disk_free_space](https://www.php.net/manual/en/function.disk-free-space.php) reports available bytes for the relevant filesystem or partition; account quota is not independently verified by this probe. [ini_get](https://www.php.net/manual/en/function.ini-get.php) supplies raw configured PHP settings. [memory_get_peak_usage](https://www.php.net/manual/en/function.memory-get-peak-usage.php) with its real-usage flag reports peak system-allocated script memory, not free server memory. [hrtime](https://www.php.net/manual/en/function.hrtime.php) provides monotonic timing for the two current captures. These references were retrieved 16 November; the observations must be measured on staging rather than inferred from local fixtures.

Full private-host installation/recovery, capacity/runtime proof, scalable exact cleanup, installer/resume orchestration, coordination/retention and the separate owner/account/manual/production gates remain open. The goal continues across batches.
