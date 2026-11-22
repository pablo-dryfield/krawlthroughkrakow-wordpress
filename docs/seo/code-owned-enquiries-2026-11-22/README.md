The seven-form replacement is implemented and verified **locally only**. The owner selected isolated local testing because the available OmniLodge deployment environment is production. This is a follow-up candidate, not an additional staging delivery or completion of D06/H03. Production and D08 remain excluded.

The existing purchase-email integration uses OmniLodge's Gmail sender. This candidate reuses that sender through a separate, disabled-by-default staging enquiry endpoint. KTK's generated forms use a code-owned, versioned manifest instead of Divi/Contact Form 7 mail metadata or their delivery endpoints. No installed plugin has been disabled, deleted or uninstalled; the existing Divi artwork/classes remain necessary for visual parity.

The hosting support request in [the earlier delivery investigation](../form-delivery-review-2026-11-22/README.md) remains **unsent**. The owner chose this alternative. The three previously approved actual form submissions are consumed; local captures do not authorise new real emails or certify that the MailChannels issue is fixed.

Local source candidates:

- KTK: `.worktrees/ktk-omni-enquiry-20261122`, branch `codex/staging-omni-enquiry-20261122`, based on `541de744fe1052e8768134a7009d79a50d1a6d48`.
- OmniLodge: `C:/Users/pjcam/Documents/Projects/omni-lodge/.worktrees/ktk-enquiry-mail-20261122`, branch `codex/ktk-enquiry-mail-20261122`, based on `43565c50dce79641ffa9f77cc99fd8c10d188bd3`.
- No push, PR, CI dispatch, application publication, hosting helper, account configuration, cache purge or real email is part of this local verification. Prior frozen accessibility/source worktrees remain unchanged.

The shared manifest SHA256 is `ceaa70f6b2764a23b4975365f8692066e6690f0431a93adb59d461f7dc921a6e`. All existing public fields, required flags, limits, arithmetic choices and activity choices are retained. The server owns routing:

| Form | To | Cc | Arithmetic |
| --- | --- | --- | --- |
| Contact | pubthroughkrakow@gmail.com | â€” | Yes |
| Jobs | pubthroughkrakow@gmail.com | â€” | Yes |
| Student Trips | info@krawlthroughkrakow.com | â€” | No |
| Hen | pubthroughkrakow@gmail.com | â€” | Yes |
| Stag | pubthroughkrakow@gmail.com | â€” | Yes |
| Stags & Hens | pubthroughkrakow@gmail.com | activities@krawlthroughkrakow.com | No |
| Welcome to Alcohol story | pubthroughkrakow@gmail.com | â€” | No |

The two former CF7 forms use neutral feedback; the group success message expressly says an enquiry does not confirm a booking. The other saved feedback is preserved, including Student Trips' unverified less-than-24-hour response promise. Preserving that text is not operational SLA acceptance. The Student Trips custom body preserves real template line breaks while treating user-supplied placeholder-like text literally.

The WordPress processor retains nonce, signed arithmetic, honeypot and visitor rate checks. It validates the seven known field contracts, then signs the bounded JSON bytes with a dedicated server-only HMAC secret. The configured receiver must use HTTPS and the exact staging endpoint; redirects are refused. Loopback HTTP requires an explicit local-test constant and CLI/CLI-server execution. Missing configuration fails without a send; there is no SMTP or `wp_mail` fallback. The old processor is retained byte-exact as `forms-legacy.php`, selected outside staging.

OmniLodge verifies timestamp/signature, fixed schema digest, known fields, values and server-owned recipient configuration before reserving a UUID in a persistent unique delivery table. It stores delivery metadata, not enquiry bodies, email addresses or visitor IPs. A confirmed duplicate of the same identity does not send again. In-flight, conflicting or uncertain identities refuse another send. The Gmail helper uses one send attempt and no backup transport for these enquiries; its existing order-mail defaults remain unchanged. An uncertain browser result displays a reference and blocks another submission on that page. This is per-identity replay protection, not a claim that separate tabs/reloads can never create another customer enquiry. The migration refuses to discard a nonempty delivery table on rollback.

Verified local evidence:

- OmniLodge TypeScript check and production-format local build pass. Full backend: **377 suites, 3,875 tests passed, one existing skip**. The focused mail/route/service checks pass **47/47**.
- Real local PostgreSQL tests exercise reservation uniqueness, concurrent calls, confirmed duplicate/conflicting payloads, uncertain delivery, rollback refusal, and removal/absence of the test-owned schema. Existing application tables are untouched.
- KTK PHP integration suite passes, including **94/94** new captured-HTTP checks, **36/36** retained legacy form checks and **894/894** page integration checks. Form/source Python checks pass **31/31**. The **447** Node checks selected by KTK's CI pass.
- The complete generator builds **116 routes** without missing/error results; its independent verification passes **2,320/2,320** checks. A separate DOM audit verifies all seven transformed forms and exact non-form markup/text, with the other **110 generated bodies** byte-exact. The runtime bytes outside the form block remain exact, as do shared CSS, storefront/commerce and consent sources.
- Actual headless browser â†’ PHP â†’ signed OmniLodge HTTP integration passes all **seven** forms with a capture-only sender. The receiver is network-restricted to loopback and the browser permits only the local origin. Fourteen 390px/1440px views have no horizontal overflow and zero automated WCAG A/AA form violations; ten scans retain the `color-contrast` incomplete result. Twenty-one screenshots were captured; feedback was visually reviewed across all seven phone forms. This is not a native screen-reader, full visual-conformance or live WordPress result.
- Browser checks verify visible polite-live feedback, field resets, actual To/Cc, literal template-like input, required/email prevention, upstream error focus/description mapping, and unknown-delivery blocking without another POST or identity rotation. Exactly seven local messages are captured; the eighth sender invocation deliberately simulates uncertainty. Real Gmail/SMTP sends are zero. All owned browser/server processes are closed.

Private evidence is retained at `C:/Users/pjcam/.codex/tmp/ktk-omni-enquiries-20261122/`, including full pre-edit source archives, exact source maps, retained failed attempts, successful logs and `browser-bridge-2026-11-22T21-31-41-105Z/report.json`. Full pre-edit ZIPs were reopened and checked against every source file. Local overlays supplement those archives; they are not independent hosting/database backups.

The first local fixture failed because the preview navigation accepts only declared roots; the fixture now calls the unchanged helper with its declared staging root, then substitutes the loopback URL. No application allowlist was relaxed. An initial whole-file newline normalisation was retained and corrected before acceptance. Old full-runtime snapshot checks were narrowed to exact hashes on both sides of the separately tested form block only after byte comparison to the original archive. A broad wildcard Node run also included an obsolete, non-CI consent-rollback test requiring an absent historical release file; that failure remains recorded. The actual CI-selected 447 checks pass. Two historical-root roadmap transition fixtures assumed an unfinished batch existed. The already-released current-source fixture was restored from the verified pre-edit archive; all 18 test identities and every actual batch/workstream status remain. An interim duplicate correction was retained privately and superseded by those original released bytes.

Still required before a staged delivery:

1. A separately authorised non-production OmniLodge receiver/database and protected server configuration. No such deployment target has been supplied, and production is excluded.
2. Guarded installed-staging integration with backups, exact changed-file/WordPress witnesses, cache checks and a fresh form/device review. Local WordPress stubs do not prove installed-host behaviour, cross-origin hosting/TLS, reverse-proxy limits or live Control Panel/Gmail credentials.
3. Separately scoped actual internal email tests and independent recipient receipt/header checks. No deliverability, spam-placement or operational response promise is accepted from captured sends.
4. One consolidated push/PR for the batch only after the required staging verification, following the owner's preference. An OmniLodge ready PR can deploy production, so none is opened under the current local-only instruction.

Broader human accessibility, service facts, response ownership, real paid/provider data, recovery retention and recurring requirements retain their original scopes. The original eight batches, 83 verified website deliveries, 87 records and all 40 end-to-end workstream statuses remain unchanged.
