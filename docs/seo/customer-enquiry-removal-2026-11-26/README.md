# Verified Customer Enquiries contents-removal control

26 November 2026, revision120. The owner requested the reviewed removal workflow and verification with synthetic records. It is deployed in [OmniLodge Customer Enquiries](https://omni-lodge.com/customer-enquiries) for KTK staging intake, with **live removal disabled**. No real record removal or activation is authorised by this delivery.

## Result

The exact preview shows removed/retained categories, saved-field/activity counts, blockers and the enquiry reference. Execution requires company-wide page/inbox view access, separate inbox delete permission, Closed handling, Sent delivery, staging identity, a current contents/activity fingerprint, reviewed fixed-category reason, both retention/other-copy acknowledgements and the typed reference. Ordinary follow-up editors receive no automatic deletion power. The Control Panel switch `STAGING_CUSTOMER_ENQUIRY_REMOVAL_ENABLED` defaults false and is refreshed per request; preview works while disabled.

A locked transaction clears submitted fields, notification snapshot/addresses, customer search fields, internal notes/assignment and previous activity details. It retains delivery identity to prevent a resend, minimal actor/action/time records and a removal receipt. The database/follow-up guards prevent ordinary repopulation and rollback discarding a removal receipt. This is not complete anonymisation. The UI labels removed contents distinctly from earlier rows whose contents were never captured, clears displayed cached contents and does not retry uncertain actions automatically.

## Independently accepted source and release

- [PR274](https://github.com/pablo-dryfield/omni-lodge/pull/274): one commit and one source push; 16 scoped source/doc/test files.
- Reviewed feature source `d2d5b3c13e71544a4cb409925cee692c629a5822` and tree `10fcebf3b03f5cbfc28442a7f650eb3373eeabc0`; squash merge `c8f08062b1e626c51343e33bb4017cb401d6d572` has the exact same tree and sole expected base parent. All **2,678 canonical source blobs** match the retained ZIP/manifest.
- [Current candidate CI](https://github.com/pablo-dryfield/omni-lodge/actions/runs/45840811457): all **9 jobs** pass with original workflow limits and no skipped steps. Eight actual checkout identities/tree checks match the reviewed source. Backend matrix unit suites pass **380 suites / 3,922 tests + one original skip** in each job; UI passes **192 suites / 1,347 tests**. The actual enquiry migration/removal integration runs in the dedicated PostgreSQL 16.10 migrations job; the backend matrix does not by itself relabel that integration as tested on both majors.
- [Immutable Release](https://github.com/pablo-dryfield/omni-lodge/actions/runs/45842767505) produces `omnilodge-r45842767505-a1-c8f08062b1e6`. Its exact source/artifact identity, digest, producer evidence and complete packaged checks pass; the compiled removal service, migration and false default are checked.
- [Automatic managed deployment](https://github.com/pablo-dryfield/omni-lodge/actions/runs/45845074316) completes with a matching host request and `REQUEST_SUCCEEDED`. Public backend/UI identities, companion smoke checks and the actual main/enquiry JavaScript hashes match the verified archive. No live-host build or direct release-directory change was used.

GitHub also automatically started a duplicate branch-push CI. After confirming its exact source/event and the active prospective-merge run, only that duplicate was cancelled. Its evidence remains retained and it is not counted as passed. No extra dispatch, retry, workflow-limit change or source correction push occurred.

## Live preservation, with no destructive test

The read connector verifies its read-only database guard. Independent before/after reads preserve all **eight existing staging intake records**, their original delivery identities, synthetic/legacy contents, notes, assignments, handling states, versions and audit events. All eight new `redacted_at`/`redacted_by` markers remain null. The effective removal switch is **false**. Existing all-Gmail/no-Cc routing, sender/rate/enabled values, signing-key metadata and saved template state remain exact; no signing-secret value was requested.

No authenticated live removal, Gmail mutation, new enquiry or email was created. The older seven notification tests retain their original dates/headers. The private review register still retains all eight records for their ongoing verification purpose, with the manual **1 December 2026** check unchanged. These are separate read observations, not an atomic global snapshot or proof about unrelated customer activity.

## Synthetic verification and retained limits

Local verification uses a fresh owned loopback PostgreSQL database and synthetic accounts/records. Actual local runtime mail/background jobs are disabled; the browser blocks nonlocal requests. Actual migration tests cover rollback after a simulated commit refusal, two concurrent confirmations with one receipt, unchanged deduplication/no resend, database guards and an unrelated protected fixture. The actual page passes **25 checks**, including one synthetic Contact removal and exact preservation of the seven other fixtures. Four settled layouts at **320/390/768/1440px** fit the viewport, expose confirmations and keep the unconfirmed action disabled. Screenshots were inspected. Local removal was disabled again, owned services stopped and ports released; the synthetic database and evidence are retained.

Backend typecheck/build and final UI typecheck/lint pass. The initial full backend run inherited the local mail-disable flag and failed nine mocked transport cases; normal-environment full checks pass. The local full UI run retains one unchanged Payment Links async-content failure (191/192 suites, 1,346/1,347 tests); that suite, unchanged Ongoing Carts and the enquiry suites pass 30/30 together, and full hosted CI passes as above. Initial Windows test discovery/label probes, cold UI timeout, transient full-page phone screenshot and noncanonical initial Git archive are retained; corrected discovery, settled views and direct canonical Git-blob archiving pass. No failed observation is relabelled as a successful delivery.

Gmail, exports and backups are explicitly **not changed** by this control. No automatic backup-restoration filter, offline-copy disposal, complete rights-request handling, universal expiry or legal certification is claimed. Those copies require separately scoped reviewed actions and verification. Protected booking/payment/recovery data stay outside the workflow. The current [operator procedure](../h01-staging-delivery-2026-11-24/RETENTION-REVIEW-PROCEDURE.md) and [upstream feature documentation](https://github.com/pablo-dryfield/omni-lodge/blob/c8f08062b1e626c51343e33bb4017cb401d6d572/docs/customer-enquiry-removal.md) record the scope and activation boundary. Historical Gmail import remains later. Owner-discarded provider/hosting-account checks and resolved private winner instructions stay closed.

## Roadmap accounting

This is an OmniLodge management-feature delivery, not a WordPress website upload. Counts remain **86 verified staging website deliveries / 90 records**, all **8 original finite batches** complete and all **40 original statuses/criteria** unchanged. Both generated roadmaps are updated from the canonical model and checked with the original 18 contracts. No website production/D08, commerce/forms, functional consent, GA test ledger, cache purge or retained recovery cleanup occurs.

Remaining H01 work includes recurring team use, actual future case-specific purpose/basis decisions, reviewed Gmail/export/backup disposal/restoration and service-contract/cancellation facts. M03 Google receipt remains unverified at its dated observations; its one-send budget is consumed and was not reused here.

Private acceptance record SHA-256: `71f8c47ed3e8d057b5e2fce4a62bd47010c899cde69eb2c698671d9c6607563e`.
Live preservation acceptance SHA-256: `017d92a077be732470d495f113159fc17aee3ac890563d87f1ba5e19f91c0960`.
