# Original SVG Delivery: Compression Follow-up

Read-only D02 follow-up during the full G02 fixture run. No SVG/artwork, URL,
application, server configuration, Cloudflare rule, cache, consent or production
change; no new website delivery. This is not a fresh performance trace or a
measured loading improvement.

The web-perf skill's native DevTools availability check succeeds. An isolated
desktop Chrome157 page loads the normal staging homepage. Request headers and
ResourceTiming confirm the same encoded sizes as the earlier mobile baseline:

| Exact original | Decoded bytes | Brotli encoded bytes | Transport/cache |
| --- | ---: | ---: | --- |
| Regular statue | 669,694 | 279,474 | HTTP3, HIT |
| Seasonal statue | 286,738 | 118,846 | HTTP3, HIT |

Both responses have SVG MIME and `max-age=31536000`. The browser supports
gzip/deflate/br/zstd and receives Brotli. The response includes a LiteSpeed
upstream tag; this is not proof of available hosting configuration permissions.
The original blank DevTools page1 is untouched and the owned isolated page3 is
closed. No consent control is activated and no preference is changed.

Six separate raw HTTP1.1 GET responses negotiate Brotli, gzip and identity for
both unchanged normal asset URLs. Each returns200/HIT, is retained in ignored
storage and decompresses to the exact original local SHA256/byte count. This
transport does not automatically decompress the bytes before measuring them.

| Original | Brotli | gzip | Identity |
| --- | ---: | ---: | ---: |
| Regular | 279,474 | 277,088 | 669,694 |
| Seasonal | 118,846 | 118,552 | 286,738 |

`native-headers.json` retains selected headers/timings without unrelated
reporting tokens. `raw-negotiation.json` binds all six encoded artifacts,
round trips and unchanged source files. These are byte/encoding comparisons,
not a browser speed comparison or evidence that gzip should replace Brotli.
The repeated `Vary: Accept-Encoding` values do not establish a performance bug.

Current primary [Cloudflare compression documentation](https://developers.cloudflare.com/speed/optimization/content/compression/)
confirms SVG support, negotiated encodings, origin-compression passthrough and
the origin `no-transform` boundary. [Compression Rules documentation](https://developers.cloudflare.com/rules/compression-rules/)
describes algorithm preferences and last-match behavior; it does not establish
a per-response quality control or that a rule is currently missing on this zone.
No account rule is read or changed in this follow-up.

The earlier exact in-memory Brotli11 round trips are250,136/107,682 bytes. Their
combined40,502-byte difference from these live responses is a **candidate size
gap**, not deployed savings or an LCP gain. A feasible next investigation is
controlled staging-only delivery of precompressed original bytes, after checking
actual origin support, exact negotiated fallback behavior, cache/content-type
headers, guarded publishing/rollback and current before/after browser traces.
Do not rewrite original vectors, infer an unused seasonal statue, force an
unsupported encoding or alter production/global compression to chase this gap.

A restricted FTPS adapter also reads only three exact staging configuration
candidates, with zero writes/helpers/purges. Staging's12,485-byte `.htaccess`
has SHA256 `f490a7584ee82f929cbab0bb6cc944fecffdc8eb5e35b9fbac37582e9a0e1fee`
and existing conditional DEFLATE/Vary directives, including SVG MIME. The MU root
and homepage asset directory have no `.htaccess`. Raw existing configuration
stays in ignored private evidence; no production/root configuration is read.
These facts do not prove Brotli module controls or per-directory override support.
Any candidate still needs a fresh guarded configuration backup and live fallback
checks before a performance comparison. The existing publisher wrappers that
build font assets are not invoked for this read-only check.

A read-only environment check reports WSL is not installed and finds no Docker
CLI on the current PATH. Nothing is installed or enabled. The Windows fixture keeps
its current execution environment and immutable source. The complete goal stays
active, with measured D02 implementation and G02 host rehearsal still open.
