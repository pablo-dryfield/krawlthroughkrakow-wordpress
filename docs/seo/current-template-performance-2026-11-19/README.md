# NYE background image candidate

The existing1916×1027 NYE fireworks photograph is618,446 bytes. The reviewed full-size WebP is366,772 bytes, a251,674-byte reduction (40.69%). Its composition, dimensions and original ICC profile are preserved; it is a lossy encoding, not pixel-identical. The original JPEG and media manifest remain unchanged.

`tools/prepare-nye-background.py` reproduces the committed encoding and refuses an unexpected source, encoder result or existing target. The page generator verifies both hashes and full dimensions, then adds one NYE-only feature query to the generated stylesheet. Browsers supporting typed CSS `image-set()` choose the WebP; the original JPEG remains the fallback outside that query. The generated page definition changes only its stylesheet reference. No preload is included: an earlier controlled preload-only trial lowered median LCP440ms but increased median first paint76ms.

The feature query and format choice follow the [MDN image-set reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/image/image-set) and [MDN supports reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@supports).

Local verification on19 November2026:

- Complete generator:116 pages, zero missing/errors;2,320/2,320 generated reference checks.
- Whole stylesheet inverse exact; only the NYE stylesheet pointer changes in its definition. All other2,423 original application files and the original media manifest remain byte-exact. Two application files are added: the derivative and the generated stylesheet.
- Actual headless loopback render:66 checks across390/1440px, JavaScript enabled/disabled. The intended image downloads once; supported Chrome does not also download the JPEG. Image position, size, repeat, section box, document width, text, links, forms and consent fallback markup match before/after. All eight actual screenshots inspected; the full-image q90/q85 candidates were also inspected. Both owned preview servers closed.
- Balanced six-run local mobile experiment: original LCP8,824/8,824/8,832ms; WebP7,588/7,584/7,612ms. Actual response bodies match the exact reviewed encodings; their median download times are approximately4,974ms/3,706ms. This is a throttled local PHP preview, not real WordPress/cache/provider timing or a field/INP result. The harness's fixed Date instrumentation yielded no paint entries, so it provides no FCP result or FCP nonregression claim.

Raw traces, screenshots, source/byte proofs and qualification receipts are retained in the root workspace under this dated directory. Initial missing-worktree-dependency/build and Git-reader buffer refusals remain recorded; neither changed application acceptance criteria. A standalone preload is not part of this candidate.

Current CI and guarded staging publication/origin/normal-cache verification remain required. This is not yet a staged delivery or B04 completion. The frozen PR121 recovery source and APPf2 reference remain separate; that synthetic fixture does not certify this later application candidate. No production, commerce, forms, functional consent or provider/account operation is authorized by these measurements.
