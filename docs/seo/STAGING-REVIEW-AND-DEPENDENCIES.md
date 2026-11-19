# KTK staging review and remaining dependencies

19 November 2026. Draft owner review packet; the complete plan and production release are still open.

There are **71 verified website staging deliveries and four remaining batches**. B01, B02, B05 and B06 meet their original finite rules. B03, B04 and B07 are in progress; B08 is planned. All eight batches remain visible in the [HTML roadmap](ROADMAP.html#remaining-batches) and [Markdown roadmap](ROADMAP.md). The [full plan](SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md) retains all 40 original workstream criteria.

## Current accepted staging scope

The [NYE page](https://krawlthroughkrakow.com/staging/new-years-eve/) uses a full-size WebP background that saves 251,674 image bytes (40.69%), retaining the original JPEG fallback, composition and ICC profile. [PR 123](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/pull/123) is merged as exact-tree main `56dc98f`. Its PR and [main CI](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44444432496) are independently accepted. Guarded publication verifies 2,076 owned files and three discovery files. The seven raw database tables are equal across this release; 279 other protected files are exact, with only the planned discovery fingerprint changed.

The staging-only cache purge is followed by 36 HTTP checks, including 12 warmed HIT responses. Six phone, tablet and desktop views pass with JavaScript enabled and disabled, with all screenshots inspected. Local timing observations do not establish a deployed or field speed improvement. [Detailed evidence and limits](current-template-performance-2026-11-19/README.md) distinguish this delivery from the earlier broad audits.

Private WordPress snapshots and rollback archives are retained locally outside Git. They are separate from source archives. Production, commerce/Ecwid, real form submissions, functional consent and OmniLodge remain outside these releases.

## Why the four batches remain open

| Batch | Outstanding acceptance |
| --- | --- |
| B03 — recovery | The exact original 2,074-public / 4,149-private offline gate and current recovery-code CI are independently accepted. Native run 44455854964 passes 180 original cases / 16 scenarios; complete run 44455863033 passes all 57 quality steps, 1,257 Linux tests / 21 platform skips, 45 Windows contracts, reading, audit, build and secrets. The separate audited staging-host rehearsal still requires H06. The later larger cohort remains unproved and its 120-minute cancellation/final state unknown is retained; another full run is not automatically required as a new fourth gate. |
| B04 — performance/assets | Resolve known SVG negotiation through the reviewed scoped pilot after the H06 Cloudflare decision. Retain broader comparable, manual and field requirements; image-byte savings alone do not close this batch. |
| B07 — monitoring/regressions | Resolve the retained provider initialization failure and obtain the required authenticated/provider and real-world evidence. Preserve the original font/Ecwid raw-state failures and unknown older aborted admin-request bodies. |
| B08 — final audit/review | Reconcile the completed staging scope and all remaining exceptions after the preceding batches meet their original rules. This draft packet prepares that review and does not claim final acceptance. |

The current recovery candidate preserves every staged application byte. Its fixture explicitly covers **2,076 public files / 551,248,298 bytes and 4,153 private payloads / 1,102,309,144 bytes**. A short comparison passes 28 native contracts and 12 complete captures; the existing optimized capture profile is faster on the measured ARM runner, while raw capture is slower. That result supports bounded platform validation, not a full-runtime guarantee. The earlier native30-minute cancellation and roadmap encoding failure remain preserved failures. Corrected source `6a5f3d1` now has independently accepted [native CI](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44455854964) and [complete CI](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44455863033), with every original test and safety bound retained. No new full run or hosted recovery has started. The expanded 2,076-public / 4,153-private full proof remains unaccepted; the original offline gate stays scoped to its older exact cohort.

The current four-template performance review verifies 12 traces and the exact served NYE WebP/CSS/JPEG bodies. Its sequential observations do not prove a causal deployed or field gain: NYE median LCP is lower, FCP is slower, and all small layout-shift changes remain reported. The first above-fold Safety Guide image is still marked lazy; a scoped source fix is next, with no new delivery claimed. Apparent missing booking lettering in the viewer was contradicted by byte-identical PNGs and raw white-glyph pixel evidence; booking CSS is unchanged.

## Owner, account and real-world dependencies

| Gate | Owner | Evidence or decision still needed |
| --- | --- | --- |
| H01 | KTK operations and appropriate reviewers | Confirm remaining business facts, including five older Hen activity interiors, held specialist/medical and Halloween content, and the wider review policy. The supplied operator registry identity is already implemented; that identity question is not reopened. |
| H02 | Authorized search/analytics/provider account owners | Refresh dated authenticated Search Console and analytics evidence, verify provider receipt/funnel coverage, and resolve the recorded initializer context. Native account automation is stopped; no alternate account-control route is being used. |
| H03 | Owner or nominated testers | Complete broader zoom, screen-reader and physical-device work, actual inbox receipt, paid/zero/failed state checks and offer eligibility where required. The owner's successful HowToJoin zoom/focus report is retained for that one page; it does not certify all routes or real-world outcomes. |
| H04 | Verified Google Business Profile owner and operations | Confirm eligibility, actual premises, category, hours, photos and booking destination. A registered office does not establish a customer meeting point. |
| H05 | Owner or nominated review/partnership operator | Adopt the prepared neutral review process, confirm current agreements and approve any real review requests, replies or outreach. Drafts remain unsent. |
| H06 — hosting | Hosting and release owners | Supply actual hosting-account quota, confirm the PHP filesystem actor can use the intended private location, agree an exclusive rehearsal window and confirm retention of originals, metadata and operation markers. Local disk space and FTPS feature reads do not establish these facts. |
| H06 — SVG pilot | Cloudflare account and release owners | Decide on the reviewed two-path staging pilot, its exclusive account window, and creation/retention of the currently absent shared cache entrypoint. The coordinator removes only its owned rule and leaves that entrypoint empty. Existing purge-only authorization does not cover this account change. |
| H07 | Production owner | Review the final exact source, staged evidence, unresolved exceptions and rollback scope before any separately authorized production release. |

Monthly and seasonal reviews remain recurring responsibilities. Consent/GTM work remains explicitly deferred. Owner decisions are not inferred from elapsed time or successful automated tests.
