# Safety Guide first-image loading candidate

The first visible photo on the Safety Guide is its observed largest contentful image. This candidate changes that image from native `loading="lazy"` to `loading="eager"`. Priority stays automatic. The generator requires the exact reviewed image, ALT and dimensions before applying the override. This follows the [web.dev guidance for LCP images](https://web.dev/articles/optimize-lcp).

The original 1,080 × 675 JPEG, all responsive sources, sizes, ALT, dimensions, text and controls are preserved. The sole deployable delta is `ktk-code-pages-assets/content/post-krakow-safety-guide.html`. The definition, discovery data, runtime CSS/JavaScript and other 2,425 application files are byte-identical to main `56dc98f` / staged `9515c45`. No discovery publication is needed.

Local verification on 19 November 2026:

- All 116 pages build and all 2,320 references pass. The complete body inverse is exact after reversing the one loading attribute. All 2,076 payload checksums are current.
- Eight settled views cover 390/1,440 pixels with JavaScript enabled/disabled. All four article images load before geometry comparison. Each original/candidate pair has identical text, controls, geometry and screenshot bytes. Four unique screenshots were inspected; owned preview processes closed and were independently absent.
- Six balanced local PHP samples improve median LCP from 4,496 to 3,576 ms, while median first paint is slower, 2,764 to 3,576 ms. The earlier explicit high-priority variant also delays first paint and is not selected.
- Six saved-HTML replays over actual HTTPS staging assets observe median LCP 3,032 to 2,836 ms and first paint 1,348 to 1,420 ms. Every eager replay has two cancelled parser image attempts before the completed LCP load. The strict first reader refused those requests; its source and all originals remain retained. These samples cannot certify normal-network behavior or first-paint nonregression.

Request diagnostics retain negative results: disabling page JavaScript, reordering attributes and toggling cache bypass do not remove cancellations in fulfilled-document replays. A networked localhost document with JavaScript disabled and restrictive test-only CSP fetches the image once; this differs in multiple conditions and does not establish the cause. A later networked-document attempt also fails the unique-request check. No attribute reorder, lazy-load exclusion, preload, image rewrite or functional consent change is included in application source.

The original no-JavaScript checker stalled on an unbounded animation-frame wait. Its failure and precise owned-process cleanup remain retained. The separate bounded checker accepts all eight views without discarding the original timing samples. This does not certify native zoom, assistive technology or physical devices.

Raw reports, traces, source inverses and qualified audits are retained outside Git in the root workspace's `docs/seo/current-template-performance-2026-11-19` directory. The candidate also carries authoritative revision40 documentation and the already accepted explicit UTF-8 roadmap readers; all original workstream criteria, eight batch rules and delivery counts remain unchanged.

This is an unpublished loading-policy candidate, not a performance delivery or B04 completion. Current website CI and guarded staging publication, protected-state comparison and normal-URL/cache/browser checks remain required. A new failure in the changed image or related functional checks prevents acceptance; the verified original body is available for rollback. Existing provider/font/Ecwid exceptions remain explicit and unresolved. No deployed/field/INP gain or first-paint nonregression is claimed. Production, protected commerce/Ecwid, forms, functional consent, native automation stop, recovery fixtures and OmniLodge remain outside this change.
