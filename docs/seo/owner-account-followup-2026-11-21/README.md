# Verified owner/account follow-up - 21 November 2026

The owner confirmed the enquiry inbox and approved three exact Google review
replies. Current read-only Search Console UI checks and genuine inbox evidence
are now recorded. Google accepted the three reply submissions; final authenticated API reads
now expose all three exact approved replies. Public UI was not inspected. No new website delivery is counted.

## Search Console

Property: `https://krawlthroughkrakow.com/`. Observed in the signed-in native
Chrome UI on 21 November. The owner also independently reported both clean
security reports. No indexing request, validation, sitemap submission or account
setting was changed.

| Report | Observed result | Data date |
| --- | --- | --- |
| Manual actions | No issues detected | Current UI read, 21 November |
| Security issues | No issues detected | Current UI read, 21 November |
| Page indexing, all known pages | 132 indexed; 40 not indexed; eight reasons | Last update 16 November |
| Crawl stats | 8.06k requests over the last 90 days; 961m downloaded bytes; 491ms average response | Last update 19 November |
| Host status | Host had no problems in the last 90 days; robots.txt fetch, DNS resolution and server connectivity each show an acceptable fail rate | Last update 19 November |

Dates describe Google's report freshness, not a fresh crawl of every URL today.
The public Search Console API does not expose these equivalent aggregate UI
reports; no additional OAuth scope or API enablement was needed for the browser
reads. Existing native URL inspections and sitemap metadata remain separately
dated evidence. [Official API surface](https://developers.google.com/webmaster-tools/v1/api_reference_index).

The eight exclusions total 40. Counts do not establish that each exclusion is
wrong, or identify its URL or historical cause:

| Reason | Pages | Responsible follow-up |
| --- | ---: | --- |
| Alternative page with proper canonical | 14 | Technical owner checks intended canonical and equivalent destination |
| Page with redirect | 5 | Technical owner checks the recorded URL/redirect policy |
| Not found (404) | 3 | Technical owner maps the exact examples; known production redirect work stays H07 |
| Blocked due to access forbidden (403) | 2 | Hosting/technical owner inspects exact examples; no blanket WAF exception |
| Other 4xx | 1 | Hosting/technical owner inspects exact example and response |
| Excluded by noindex | 1 | Technical owner confirms intended exclusion |
| Crawled, currently not indexed | 13 | Content/technical owners review exact examples, usefulness and duplication |
| Google chose a different canonical | 1 | Technical owner compares the exact selected/user canonical |

M04 remains in progress for that URL-level disposition and ongoing monitoring.
The installed weekly staging monitor and its accepted first actual job remain
unchanged. The clean Manual Actions result also resolves the current native
report dependency in L04; campaign history and inaccessible sources remain.

## Real enquiry delivery

The Gmail connector profile and the existing live OmniLodge Google connection
both match the owner-confirmed `pubthroughkrakow@gmail.com` inbox. Credentials
were used in memory; no credential, scope, configuration or Omni deployment
was changed.

A genuine Student Trips enquiry dated **18 November, 11:24:54 UTC** is in that
inbox, addressed through the website's info alias, sent by WordPress and marked
with the real `/student-trips-poland/` page. Gmail reports SPF and DKIM passes.
The KTK team's sent reply at **12:30:20 UTC** is in the same thread; its
In-Reply-To and References match the original message. The genuine customer
body was reviewed privately. Customer identity, contact information and body
are excluded from this public report.

This verifies one real Student Trips/group route after the 14 November endpoint
repair. It does not prove every jobs/contact variant, future delivery, spam
handling or a fixed response SLA. The received body also exposes literal Divi
line-break-holder tokens. Record that formatting defect under D06; no form,
mail backend or production file is changed in this account-evidence batch.

## Exactly three approved review replies

All three approved reviews were re-read and still unanswered with unchanged
review context before submission. Exactly one PUT was sent for each target:

| Private review hash prefix | Exact approved reply | Google acceptance UTC |
| --- | --- | --- |
| b9b69cdfa63c | Thanks for joining us! We're glad Franja helped make the night run smoothly. We'll pass your thanks on to the team. | 15:31:46; HTTP 200 |
| e46a35f2e3e6 | Thank you for the lovely feedback. We're happy Franja helped you feel welcome, and we hope you enjoyed your night in Krakow. | 15:33:20; HTTP 200 |
| 546854fe5477 | Thanks for joining the crawl and for the kind words about Sean's photos. We'll share your feedback with the team. | 15:33:21; HTTP 200 |

The initial preflight stopped on an incorrectly guessed business-title check
without any write. The corrected check binds the previously accepted actual
business title. The first PUT returned the exact approved reply, but its
immediate review read did not yet expose it. The publisher stopped; its failed
receipt is retained. Its premature internal `verified` label is not accepted
as a successful readback. A separate operator submitted only the two targets
that had never been attempted. The first PUT was never replayed. All three
responses match the approved text; all captured non-reply review fields remain
exact. Selected business profile fields before/after the remaining two writes
have the same SHA-256. No address, hours, service, category or booking field was
written.

Final read-only GETs at **15:43:34 UTC** expose all three exact approved
replies, 710/616/615 seconds after acceptance. All non-reply review fields
still match. This verifies authenticated API readback; the public consumer UI
was not independently inspected. Google says replies are reviewed before
posting, usually within ten minutes but sometimes longer. That explains why
waiting was appropriate, without proving the cause of this particular delay
or authorising duplicate writes. [Google's reply process](https://support.google.com/business/answer/3474050).
L02 remains partial for broader authentic cross-platform adoption. No review
request, partner message or customer email was sent.

## Boundaries and source validation

All eight completed original batches, 81 website deliveries, 85 delivery
records, forty original criteria/statuses and the medical hold remain. The
roadmaps advance to revision 66 for verified evidence and precise remaining
actions, not additional implementation delivery. Production, D08, commerce,
forms and functional consent are unchanged. Google location/hours and the
no-support-contact decision remain. Recovery originals/metadata stay retained;
expired engines are not replayed. This batch changes documentation only.

The redacted private receipts and native report trees have the following
bindings. The earlier failed receipts remain failed. No raw email, credential,
reviewer identity or authenticated browser session URL is committed.

| Private evidence file | Bytes | SHA-256 |
| --- | ---: | --- |
| owner-replies-and-authority.json | 622 | `5b334f528adc1bef0b7b9039fbd3968c9330287a7e553bb9d61071e384277580` |
| gsc-page-indexing-ui.txt | 9885 | `bcbbfa7c6a96c1c9b7d55ba22c2819d4b6dd091617ed7ca22a021c908ccb8d5a` |
| gsc-crawl-stats-scoped-tree.txt | 13733 | `39c64b5b1896887534eb417e08bf1401a0e4f5f17d49585141c1ad54d92e4ea2` |
| gsc-host-status-scoped-tree.txt | 6680 | `df8964a8e894713b11f3331571eff5f09e46a305fcec8f9516da0523c5157c03` |
| gsc-manual-actions-scoped-tree.txt | 5600 | `f79c7e20b781907cca00ce29971c683115c47f32bb414f90fc450274b77f4795` |
| gsc-security-issues-scoped-tree.txt | 5605 | `5a9b30b95f37fbefec869fd3711fc57e7fb3bdc2d6a7b5f947e6b02c00e302cb` |
| genuine-form-recipient-evidence.json | 1555 | `bcb91e3d0dcf618b1c12af674612d585722216b3178a53c449266cb80224b455` |
| review-reply-preflight.json | 1204 | `25e57c78740eb50aa2a0aa38d73ce7e673c9bfbc774d138a75816769408c851a` |
| review-reply-preflight-v2.json | 1882 | `e1ac410b2893fdda072dc8659457e68c9a28cc1674a68a31620b3cf5bc773fca` |
| review-reply-publication.json | 2310 | `90302213674f4b0fd0d7caae9573d22d2d12878e1d159f16a41382b0937f6fc6` |
| review-reply-delayed-readonly.json | 1110 | `bb809b7c5e5d05191cb1e64f87a4f454c7f87bf53318a3fb654d635ec8c664cc` |
| review-reply-remaining-two-publication.json | 1565 | `b16281ea87712991f8731206697f0df54f95213175aee803ad849338a5ef05dc` |

## Local source validation

All 18 existing roadmap contracts and the tracked-file policy check pass.
The existing secret-scan policy reports zero findings on the ten changed
document paths. The 3,967 other tracked source files are byte-exact to actual
main, including all 2,474 staging source files. Six historical documentation
suffixes remain byte-exact. Application, operator, workflow and scan-policy
source is unchanged. One consolidated documentation PR follows this verified
account batch; its normal current checks must pass before merge.

- `review-reply-final-readonly.json`: SHA-256 `c640ce0be11fcfcab727b2ab521a1f5941d2d68510e446d40a0dbf92dc53750b`.
- `account-evidence-independent-audit.json`: SHA-256 `fc9d593699511efce50122934cf66e44a8235c2fc61549374d5670bd3009fc39`.
- `account-document-source-independent-audit.json`: SHA-256 `5d779577593cab65a747651c9c9dfa9c8727b5ec75b45ca8e4b5ef3e95a697b6`.
