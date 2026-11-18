# Current mobile profiles and controlled font experiment

Current18 November verification: the website component described below is now present in staged38991/2941020, with accepted exact-source standard CI and scoped origin/normal/warmed checks recorded in the [current evidence note](../cleanup-runtime-diagnostics-2026-11-18/README.md). Older local/unpublished/running statements below describe their original phase. The [independent website integration](../verified-website-integration-2026-11-18/README.md) carries identical application bytes and still needs its own source CI/merge; it does not certify full recovery, the failed provider/raw-state guards, native/AT/device checks or production.

Later measurement qualification (17 November): the normal browser responses include the site's existing first-party `/9z78/` Google tag gateway. The original twelve-run harness blocks external provider URLs but allows that first-party loader, so the table below is descriptive under that exception and is not a strictly provider-withheld comparison. Original reports/traces remain unchanged. A new normal-network article control explicitly blocks that observed gateway only in the owned test browser, with the same CPU/network/viewport settings; its three verified runs have median LCP3,144ms/CLS.151036. The earlier gateway-allowed three-run control (median4,204ms) is retained as qualified. No improvement is attributed to that measurement-policy difference, and no site/provider/consent setting is changed. See the [font pilot's current measurement checkpoint](../article-font-preload-2026-11-17/README.md).

B04 is in progress; no performance change is deployed or counted as a website delivery. The current owned-static cohort contains12 normal staging-URL runs: homepage, regular product, NYE and safety article, three each. Chrome157.0.8103.51 runs headlessly at390×844/DPR3/mobile touch, CPU4,150ms latency/200,000 bytes/s download/93,750 upload, fresh contexts, browser cache disabled, service workers blocked and45 seconds per navigation. Existing owned product photos are allowed; third-party providers and non-GET/HEAD requests are withheld. No consent choice, form, order or purge is used. Agent native/backup jobs are closed at cohort start. All12 raw trace hashes/gzip CRCs/event counts verify; all27 observed in-view product images load. Four actual final viewport PNGs are individually inspected.

| Normal staging URL | Median lab LCP | Median lab CLS |
| --- | ---: | ---: |
| Homepage | 6,212ms | .002161 |
| NYE | 8,168ms | .003566 |
| Regular product | 7,512ms | .000603 |
| Safety article | 4,136ms | .151036 |

These are controlled lab observations with providers withheld, not field Core Web Vitals, INP or paid-booking-flow acceptance. The preceding same-hostname-only cohort is retained but disqualified for product performance because it blocked owned media-host photos; some runs also overlap local CPU work. It must not be compared as a matched performance baseline.

The article's main shift follows existing Montserrat text wrapping; the image already reserves312×195 before and after the shift. A separate nine-run alternating browser-response experiment compares the identical captured article HTML with zero, one500-weight or two500/700-weight original-font preloads. Document-network time is excluded equally, so its LCP values cannot be reported as normal-URL or deployed gains. All original font URLs/bytes remain unchanged and each face is requested once.

| Controlled response | Median lab LCP | Median lab CLS |
| --- | ---: | ---: |
| Original | 3,252ms | .151036 |
| Existing500-weight preload | 3,044ms | .001063 |
| Existing500/700-weight preloads | 3,024ms | 0 |

All nine trace hashes/gzip CRCs/event counts verify. An independent public HTML reread matches original SHA256 `9fb9968a5619a28e8f4bd618e1e039074f5b8cc970469d5c136fd260308fd268`; both exact HTML inverses and candidate hashes verify. All three actual final viewport PNGs are individually inspected and compare byte/RGBA-exact without masks or tolerance. This is final-viewport equality, not whole-page/first-paint parity or deployed improvement. A bounded staging pilot and normal-URL/cache verification remain required before accepting any change.

The32-request original-URL SVG negotiation observation retains24 exact decoded GET bodies, six HEAD responses and two Last-Modified304s. Six warmed encoded GETs are HIT. A low nonzero Brotli preference still selects Brotli over higher gzip; explicit exclusions are honored, and all-zero preferences receive identity200. These baseline observations retain the old strict14/16 partial result. No server/global negotiation change, original-URL pilot or universal406 requirement is inferred. See [RFC9110 negotiation rules](https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.3). The earlier temporary Brotli namespace remains removed; original delivery and parent configuration are unchanged.

Raw scripts/traces/PNGs and independent audit receipts remain in the primary review workspace `C:/Users/pjcam/Documents/Projects/krawlthroughkrakow-wordpress/docs/seo/performance-baseline-2026-11-17` and the adjacent `svg-delivery-follow-up-2026-11-17` folder. Measurements bind sourcef5bbadf/tree3041502, with all application bytes unchanged. No native UI is reopened. Homepage/NYE SVG delivery, oversized original product photos and the staged font pilot remain B04 work. Six implementation batches,68 verified website deliveries, protected commerce/forms/functional consent and production remain unchanged.
