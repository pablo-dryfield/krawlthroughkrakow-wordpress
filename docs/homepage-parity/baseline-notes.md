# Current Production Homepage Baseline

Captured read-only from `https://krawlthroughkrakow.com/` on 2026-10-06. This is the current live Divi page, not the earlier approximated replica or the newer redesign. No production content, configuration or cache was changed.

## Reproducible Capture

```powershell
node tools/capture-homepage-parity.mjs --label production-ready
```

The capture uses installed Chrome with fresh contexts, real desktop/Android/iPad user agents, device scale factor 1, and default motion settings. A real wheel event activates WP Rocket's deferred runtime; the consent banner is rejected. The script scrolls the entire document, waits for visible images and fonts, returns to the top, and waits for transitions before collecting DOM, CSSOM, layout measurements and screenshots. It then opens desktop dropdowns or the mobile menu without following links. No forms or bookings are submitted.

`production-ready-*` is the initialized screenshot/measurement baseline. The older `production-*` capture predates deferred-runtime initialization and must not be used for final comparisons. `production-source-*` contains an independently initialized 1920/390 source export useful to the parity generator.

## Files

- `production-ready-baseline.json`: computed styles, boxes, headings, links, image decode state, frames, header behavior, menu contents and browser errors at all four widths.
- `production-ready-response-WIDTH.html`: public server response before browser initialization.
- `production-ready-rendered-WIDTH.html`: fully initialized document at the top, before menu interaction.
- `production-ready-styles-WIDTH.json`: body attributes, stylesheet links, inline style text, CSSOM in native cascade order, and animation/background observations.
- `production-ready-viewport-WIDTH.png` and `production-ready-full-WIDTH.png`: top viewport and full-document screenshots.
- `production-ready-section-WIDTH-00.png` through `-12.png`: individual section screenshots at 1920 and 390 pixels.
- `production-ready-scrolled-WIDTH.png`: 600-pixel scroll position showing the non-sticky header behavior.
- `production-ready-dropdown-1920.png`, `-1440.png`, `production-ready-menu-768.png`, `-390.png`: open menu states.

The CSSOM array is `stylesJson.cssom`, with records `{index,id,href,media,ownerTag,text,error}`. All 28 desktop stylesheets were accessible; no CSSOM security errors occurred. Parent implementation can consume `production-source-rendered-1920.html` with `production-source-styles-1920.json` without relying on serialized `<style>` text alone.

## Layout And Typography

| Viewport | Header height | Hero height | Document height | Body type |
| --- | ---: | ---: | ---: | --- |
| 1920 x 1080 | 140 | 1144.5 | 11176 | Montserrat 16px |
| 1440 x 900 | 187 | 858.375 | 10323 | Montserrat 16px |
| 768 x 1024 | 80 | 457.796875 | 14559 | Montserrat 13px |
| 390 x 844 | 80 | 232.46875 | 14736 | Montserrat 13px |

The hero text, schedule and crowd photograph are one composed bitmap. The image follows its natural aspect ratio; it is not a viewport-height hero. Header sits in normal document flow and scrolls away entirely. At 1440 pixels the current production navigation wraps and increases the header height. Preserve this baseline rather than silently substituting the earlier screenshot dimensions.

At 1920 pixels, the visible logo is approximately 80.52 x 63 pixels at x34.31/y38.5. Navigation uses white Montserrat 18px/600. The About Us dropdown is 240px wide, black, with white Montserrat 18px/600 and 28px line height. The header booking control has a white outline. Mobile header is 80px tall, with a magenta toggle and a roughly 55.20 x 43.19 logo at 390 pixels. The mobile menu contains 22 links, is 80% of the viewport width, and opens at y80 with all nested links visible. Mobile links are 14px white text.

Body font is Montserrat. Condensed display headings use **Passion One**, not Oswald. The first pink heading is 35px on desktop; its condensed supporting heading is 26px. ETmodules and FontAwesome supply the existing icons. Exact element-level computed values are in the baseline JSON.

## Section Inventory

All widths have 13 visible main content sections, in this order:

0. Composite Pub Krawl hero image and booking CTA.
1. Pub Crawl introduction, inclusions, every-night/price row, initial since-2008 story.
2. Student-trip banner and CTA.
3. Extended original/best story, Power Hour, games, nightlife, photographs and enquiries.
4. Every night at 9PM / Adam Statue, voted-number-one and running-late telephone strip.
5. Six illustrated feature blocks for venues, open bar, shots, night out, contests and guides.
6. Further since-2008 story, Tripadvisor and Google review badges.
7. Experience / Instagram title strip.
8. Krawl with us image, Check Out More copy and Vimeo video.
9. Second student-trip CTA strip.
10. Google map and Ready to Party booking content.
11. Hungry and Thirsty brunch content.
12. Follow us, contact and legal content, followed by the separate copyright footer.

Repeated story/student sections and their original spacing are real production content. They are intentional baseline inputs for this parity task, not cleanup candidates.

## Runtime And Asset Notes

- CSSOM index 0 contains Cloudflare-served font declarations with relative `/cf-fonts/...` URLs. Resolve these against the production origin before localizing.
- `wpr-lazyload-bg-container` is empty even after initialization. Anonymous CSSOM index 14 and `wpr-lazyload-bg-exclusion` at index 15 contain the actual `--wpr-bg-*` background-image variables consumed by late styles.
- The last two stylesheets contain late module positioning/design rules, including the hero CTA position. They must retain their final cascade position.
- Anonymous CSSOM index 21 contains about 832 KB of viewport-generated `body[data-scroll-step="N"]` scroll-effect rules. It should not be treated as a universal static stylesheet. Effects need lightweight responsive behavior or deliberate normalization of affected content. Body attributes include `data-scroll-step="0"` in the top-of-page snapshot.
- Mobile body adds `osx`, `et_mobile_device` and `et_mobile_device_not_ipad`; do not freeze desktop-only classes without checking responsive differences.
- Iubenda injected sheets are captured for diagnosis but should be recreated by the code-owned consent integration, not bundled as stale widget state.
- The page includes a Vimeo iframe at `https://player.vimeo.com/video/892352668?h=df4cdc75d0` and a Google Maps custom-map iframe. Both were visible after rejecting consent on current production. Preserve necessary identifiers; do not drop the Vimeo unlisted hash.
- All visible image elements reported loaded with positive natural dimensions in the final capture.
- Production emitted `Cannot read properties of undefined (reading 'instance')` and `FacebookSignal is not defined` at all widths, with an additional `fbq is not defined` at 390. These are observed legacy runtime errors, not requirements to reproduce.
- Full-page screenshots contain viewport-dependent scroll animation state. For detailed lower-section visual comparison, prefer the matching individual section screenshots and wait for transitions after scrolling. Third-party map/video content can vary independently of local markup.
- Production also appends Iubenda's privacy-choices / Notice at collection control after the actual footer. It adds approximately 52px of desktop/tablet document height and 85px on mobile. The local preview without integrations will be shorter even when every section and footer box is identical; do not add blank homepage spacing to compensate.

## Controlled Pixel Comparison

```powershell
node tools/capture-homepage-parity.mjs --label production-controlled --controlled-gallery
node tools/test-homepage-parity.mjs --url http://127.0.0.1:5184/ --label local-controlled --reference production-controlled --controlled-gallery
```

The comparison harness uses Sharp and pixelmatch from the available Node runtime. It reports text, typography, element geometry and per-viewport/section changed pixels, and saves PNG difference images plus JSON/Markdown reports. `--compare-only` reuses existing captures; `--full` also compares full-document PNGs. It can be pointed at staging with `--url` without changing production.

Controlled gallery mode freezes only the 3500ms slideshow auto-advance timers after normal initialization and selects the first gallery controller. Default scroll motion remains enabled and unmasked. Both sides use the same conditions. Per-section screenshots explicitly scroll to the section's document position and settle 350ms, avoiding different fixed-CTA positions caused by opportunistic scroll-into-view behavior.

Only external iframe pixels and the Iubenda floating control are masked. Their geometry is still compared. Homepage navigation, copy, photos, sticky controls, motion content and section spacing are never masked. A changed-pixel tolerance is an engineering threshold, not a claim of mathematically identical screenshots. Reports must disclose remaining differences.

## Scope

Static local production markup and captured styles are feasible for close visual parity without the Divi runtime, provided lazy backgrounds, local font URLs, responsive classes, menu behavior and animation visibility are handled explicitly. Exact visual comparison is still required before calling the staging result pixel-identical. Production remains read-only; this capture does not authorize production deployment or cache purging.
