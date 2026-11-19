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
| B03 — recovery | Accept current-file native and complete CI, then a complete fresh offline recovery with final witnesses. A separate staging-host rehearsal also needs H06. The previous 120-minute run was cancelled; its last returned inspection reports 3,032 payloads and 14 directories, with final state unknown. |
| B04 — performance/assets | Resolve known SVG negotiation through the reviewed scoped pilot after the H06 Cloudflare decision. Retain broader comparable, manual and field requirements; image-byte savings alone do not close this batch. |
| B07 — monitoring/regressions | Resolve the retained provider initialization failure and obtain the required authenticated/provider and real-world evidence. Preserve the original font/Ecwid raw-state failures and unknown older aborted admin-request bodies. |
| B08 — final audit/review | Reconcile the completed staging scope and all remaining exceptions after the preceding batches meet their original rules. This draft packet prepares that review and does not claim final acceptance. |

The current recovery candidate preserves every staged application byte. Its fixture explicitly covers **2,076 public files / 551,248,298 bytes and 4,153 private payloads / 1,102,309,144 bytes**. A short comparison passes 28 native contracts and 12 complete captures; the existing optimized capture profile is faster on the measured ARM runner, while raw capture is slower. That result supports bounded platform validation, not a full-runtime guarantee. Native run [44448421605](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44448421605) reached its original 30-minute cap. Its 16 scenarios passed, but only 155 of 180 unit cases finished. Complete source CI [44448423684](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/actions/runs/44448423684) failed one roadmap encoding test; Windows and secrets passed. Explicit UTF-8 model loading now passes all 18 original roadmap contracts in both local text modes. A separate CI-only correction partitions the same 180 cases among three isolated workers; four scheduler contracts and source/syntax review pass locally. Fresh native and complete CI remain required. No new full run or hosted recovery has started, and no safety limit has increased.

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
