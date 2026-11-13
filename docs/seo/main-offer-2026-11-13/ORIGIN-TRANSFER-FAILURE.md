# Origin Verification Transport Failure

Preserved failed run, 13 November 2026, approximately19:59-20:08UTC.

Command: `python tools/verify-code-pages-full-release.py --cache-bust --label offer-companion-origin-20261113`

The route loop finished, but a later public asset body read terminated with
`ConnectionResetError: [WinError 10054] An existing connection was forcibly closed
by the remote host`, at `response.read()` in `get()` (asset-verification call).
The old verifier wrote its report only at completion, so no final JSON exists for
this attempt. Do not infer zero failed route assertions from its progress output,
claim6193 passing checks, or relabel this as a successful release.

The cause of the connection reset is not established; no HTTP denial, Imunify
change, application regression or operator action is inferred. Focused origin
copy75/browser361/native118/attribution136/discovery243 and six axe views passed
separately, but do not replace the missing full regression result.

The verifier now retries a GET at most twice when opening/reading is interrupted,
and the complete body remains inside the retry boundary. Real HTTP error statuses
are still returned and checked, not retried or bypassed. Tests cover incomplete
body recovery, a persistent three-attempt stop and an immediate403. Retry records
omit query values. The application payload is unchanged. A fresh full rerun with
a distinct label is required before any scoped purge/final release claim.

The distinct `offer-companion-origin-retry-20261113.json` run subsequently passed
6193/6193 at20:16:58UTC with zero transport retries. Normal/repeat verification
also passed6193/6193 after the approved staging purge, ending20:25:26UTC with all
348 content/device responses HIT. This resolves verification, not the unknown
cause of the original connection reset. The failed attempt remains preserved.
