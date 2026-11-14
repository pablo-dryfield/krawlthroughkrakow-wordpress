# Interrupted Origin Audit

The QA-only `origin-v2-navigation` run was stopped after remaining active for
over15 minutes without a final report. No completed-view count or passing result
is claimed. The private Node process identity was checked through Windows CIM:
PID29500, node.exe, the exact article-audit command and output directory.
Only that process and its owned children were stopped; no user browser was closed.
The application was not changed.

Inspection found the audit's `document.fonts.ready` wait had no deadline. This is
a harness liveness risk, not proof of the exact blocked operation in the stopped
process. The next audit rejects an unfinished font wait after30 seconds and emits
progress after every completed view. It still requires loaded fonts, all192 views,
actual typography, content, geometry, source stability and native navigation.
No timeout was increased and no failed assertion was accepted as passing.

The first bounded draft put the deadline inside the browser page. Before relying
on it, that run was also stopped: a no-JavaScript context cannot rely on page
timers. Its partial per-view progress remains in `origin-v2-bounded`; it is not
a completed check. The deadline now runs in Node and is cleared after success
or failure, so it bounds both actual JS and no-JS views without weakening criteria.
The first taskkill reported one child termination error; cleanup is checked by
exact owned process identities, never by a broad browser-name termination.
