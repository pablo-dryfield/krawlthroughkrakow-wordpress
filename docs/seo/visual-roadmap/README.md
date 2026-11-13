# Visual SEO Roadmap

Open [the visual roadmap](../ROADMAP.html) directly in a browser. It is a local,
self-contained HTML document, not a public website route or a hosted service.
No development server, installation or network access is needed. The original
[Markdown roadmap](../ROADMAP.md) and full improvement plan remain available.

## Content And Controls

- Overview: four status counts, a proportional status bar, all 40 workstream
  cells, nine delivery milestones, next staging focus and production gates.
- Workstreams: search plus work-area, status and priority filters; remaining-only
  view, accurate empty states and reset actions.
- Task details: readable title, remaining work, original scope, full acceptance
  criterion, delivery notes and applicable evidence links. Native dialog supports
  keyboard closing and restores focus.
- Print action/styles and a complete 40-row fallback when JavaScript is disabled.
- Existing KTK logo and vendored Lucide icons are embedded. No CDN, analytics,
  remote font or other runtime request. External links are deliberate commands.

This is a read-only project view, not a task editor. Source updates are deliberate
and evidence-backed; opening or filtering the document cannot change task status.

## One Source Of Truth

1. Update actual statuses, verification notes, milestones and current work in
   `tools/seo-roadmap.json` when evidence warrants it. The `view` fields provide
   readable titles, remaining-work summaries, focus IDs and evidence references.
2. Maintain scope/acceptance criteria in
   `docs/seo/SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md`. Retain historical evidence and do
   not mark partial staging work complete because a narrow batch passed.
3. Update `websiteProductionReleases` only after a separately approved and
   verified website SEO production release. OmniLodge reporting and the original
   migration are separate releases, not website SEO launches.
4. Run `python tools/build-seo-roadmap.py`. It generates both `ROADMAP.md` and
   `ROADMAP.html`; do not edit either generated output manually. Layout and
   interaction source is `tools/seo-roadmap-view.html`.
5. Run `python -m unittest discover -s tools/tests -p test_seo_roadmap.py -v`.
   The generator/tests reject missing/invented tasks, invalid states, incomplete
   labels, invalid focus/evidence, stale generated outputs and unsafe script data.

All counts come from maintained source data. The tests permit legitimate future
status changes rather than freezing today's completed count. Workstreams are
unequal-sized: the chart is a count distribution, not an effort/time percentage,
deadline, ranking forecast or declaration that all staging work is production-ready.

## Current Evidence

13 November 2026: all original 40 statuses/notes, nine milestone statuses and
current delivery evidence are unchanged from pre-dashboard source. One complete,
22 partial/in progress, 16 not started and one deferred. Seven foundation
milestones verified; zero website SEO production releases. Only readable
presentation fields and the explicit zero release counter were added to the data.

- `source-driven-browser.json`: 231/231 checks, six widths 320/390/768/1024/1440/1920,
  local `file:` URLs, all filters, task details, real product logo, keyboard focus,
  print layout and complete no-JavaScript fallback. Zero script errors or HTTP
  requests. Screenshots visually reviewed on desktop and phone layouts.
- Six focused axe views have zero automated violations; four incomplete rule
  groups are retained for manual assessment. This is not a full accessibility
  conformance certificate or a review of the public website.
- Earlier `first-browser.json` 217/217 and `final-browser.json` 231/231 remain;
  later source-driven checks also protect future legitimate progress updates.
- Full Python suite: 173/173; focused roadmap tests: 10/10. The static document
  embeds the exact existing logo and 17 licensed Lucide icons; provenance and
  license are in `tools/seo-roadmap-assets/`.

Raw browser reports and screenshots stay ignored. The generated HTML has one
exact Git allowlist entry; no broader captures or private reports were added.
No website application, production/staging deployment, account configuration,
cache purge, order, payment or OmniLodge change. All browser/test sessions closed;
no preview server was needed or left running.
