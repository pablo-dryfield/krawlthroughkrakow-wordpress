# Expiry Harness Diagnostics

These are test-operation issues, not substituted passing release reports.

- The first origin browser session was started while the homepage publisher was
  still running. It was stopped immediately; its empty output directory is
  retained as `expiry-browser-origin`. It is not origin verification evidence.
- The next browser session (`expiry-browser-origin-final`) correctly produced
  current-source future screenshots, but its native-link test assumed a fragment
  click never changes the document. Its origin URL included the cache-busting
  query, whereas the information URL deliberately does not. Standard browser
  navigation therefore requests the clean information page instead of only
  moving the fragment. The test wrongly assumed it could always intercept a
  fresh document request, then expected the old controls to remain. Its failed 297/298 report and
  screenshots are retained, not reported as a pass.
- The first query-aware retry was stopped while diagnosing a second browser
  mechanism. The controlled-prefetch experiment also failed 297/298, retaining
  all six missing-event failures. Neither is passing delivery evidence.
- Two read-only native-navigation diagnostics establish that Chrome actually
  navigates correctly, with the click default unprevented. The destination was
  fetched using `Sec-Purpose: prefetch`, resource type `other`, before activation;
  its cached activation therefore did not emit the `requestfailed` event the
  original harness expected. There was no service-worker controller.
- The final harness allows and records safe first-party information-page reads,
  including prefetch. It observes the uncanceled click through an isolated
  browser binding and requires actual navigation to the exact expected URL.
  It neither stops propagation nor prevents default navigation. Query-URL tests
  reopen the origin document between controls; normal clean URLs verify all eight
  native fragment activations without another document navigation. Service
  workers are blocked only in the test context. Provider/non-read/commerce
  guards remain unchanged; no website speculation setting or handler was edited.
  Final local verification is 728/728, origin 325/325, normal URLs 328/328.
- The new generated shell retains whitespace-only lines from the exact captured
  original shell. `git diff --check` reports those inherited lines as additions;
  they were not stripped or manually edited, preserving the source contract.

Fresh reports and their exact outcomes are recorded in `PROMOTION-EXPIRY.md`.
