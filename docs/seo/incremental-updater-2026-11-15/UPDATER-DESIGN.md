# Active-Site Update Contract

This is an implementation contract for G02, not an executable publisher or
production authorization. The current planner cannot publish. The initial
cutover publisher, its disabled-production requirement and activation file stay
unchanged.

## Preparation And Approval

The planner must bind one immutable application commit, every local/staged
payload SHA256, all three current successful release phases and the exact
existing production activation marker. It must report actual changed, new and
unchanged owned paths. Unknown files or an unrecognized marker require review;
neither is a reason to delete a file or weaken the guard.

The content namespace excludes the homepage, discovery MU plugins, storefront
plugin, Ecwid application, global settings and OmniLodge. Review any route-level
effect on the legacy store separately even if its PHP source is inside the
content namespace. A file allowlist alone does not authorize a behavior change.

Keep production approval separate from a CLI acknowledgement. A future command
may record an approval reference for audit, but that argument does not itself
grant permission. Default execution must remain offline/read-only. No production
helper, application write or purge is authorized by the current staging goal.

## Future Publication Sequence

1. Revalidate the plan, source commit, current local/staged hashes and evidence
   age. Recheck the actual changed set rather than treating a previous diff as a
   perpetual authorization.
2. After separate approval, take a bounded authenticated production snapshot.
   Require root home/site/content URLs, production environment/indexing, active
   content routing, original source-post identities and exact planned prior
   owned hashes. Snapshot original posts/meta, forms, terms and protected
   WordPress/Divi/WPCode/Iubenda/Ecwid settings. Hash the protected homepage and
   storefront files independently.
3. Before the first application write, archive the exact prior changed files,
   registry, renderer, activation marker and protected state locally. Verify ZIP
   CRC, every file SHA and the full manifest/new-file set. Keep private state
   snapshots out of Git and out of public server uploads. A source ZIP or the
   planner's inventory is not this production rollback.
4. Copy only approved dependencies from checksum-verified staging, validating
   source and target roots, every ancestor, symlinks and allowed paths. Require
   each old target to match the planned prior SHA, or the exact new SHA only
   when recovering the same interrupted transaction. Unknown target changes
   must stop the update. Verify temporary bytes, then rename each file atomically.
   Install registry/renderer after their dependencies. Never write the activation
   marker or invoke the initial cutover's activation/disable functions.
5. Recheck every final owned hash, retained marker, protected file and original
   WordPress state. No customer record, order, price/availability setting or
   global consent change belongs to this operation. Preserve staging separately.
6. Run the agreed production route/indexing/forms/booking/integration checks
   without sending real messages or orders. Purge only the separately approved
   affected content URLs/assets, then verify desktop/mobile/tablet clean and
   warmed responses. A bare-domain prefix or global purge is not content-only.
7. Record actual results and unresolved provider/manual/indexing checks. Keep
   the application release separate from documentation-only commits and source
   procedure work; do not inflate verified staging delivery counts.

## Failure And Rollback

An interrupted response leaves the transaction uncertain. Reinspect actual
hashes before retrying or restoring; do not infer that nothing was copied.
Restore only files from the verified local rollback, with safe temporary paths
and registry/renderer ordering. The activation marker must remain byte-identical
through success and failure; disabling routing is not an automatic rollback for
an already active site.

Remove a newly introduced owned file only when its path is explicitly in this
transaction and its current SHA is still the installed SHA. Never recursively
clean a directory or overwrite an unrelated concurrent change. Recheck restored
hashes, protected state and scoped caches. If restoration is uncertain, report
the exact remaining state and stop rather than claiming recovery.

## Required Isolated Fixtures Before A Writer Is Ready

| Scenario | Required result |
| --- | --- |
| Default invocation / missing explicit publish selection | No connection, helper, application write or purge |
| Stale/incomplete staging evidence, source drift or changed prior production SHA | Stop before application writes |
| Missing/changed activation, unexpected file, traversal or symlink ancestor | Stop; preserve the active marker and every unrelated path |
| Source changes or target changes during copying | Fail closed and retain a reviewable transaction receipt |
| Lost response after one or more successful atomic copies | Reinspect; no assumption of all-or-nothing success |
| Controlled mid-copy failure | Restore exact prior bytes; never disable production routing |
| New-file cleanup during rollback | Delete only explicitly introduced files with the expected installed SHA |
| Posts/meta/forms/options, homepage or commerce changed concurrently | Fail protected-state checks; do not restore database state automatically |
| A held medical page appears in the file diff | Compare actual prior/current text, media and page data; preserve the hold and identify generic presentation changes separately |
| Temporary helper cleanup failure | Report failure and the exact remaining helper; no silent success |
| Successful complete run | Exact final hashes, retained activation, protected state and scoped clean/warmed checks |

None of these writer fixtures or production operations is claimed complete by
the read-only planner's18 tests. They are the remaining implementation work.
