# Country And Device Follow-up

Exact read-only OmniLodge Search Console GET responses retrieved13 November2026,
18:13:49UTC; same four inclusive baseline windows ending10 November, Web,
Pacific days. Each country/device request preserves the same property/date
filters and independent byProperty summary/detail aggregation. No account,
reporting setting, website or booking mutation.

| Window | Country Rows | Country Clicks/Impressions | Device Rows | Device Clicks/Impressions |
| --- | ---: | ---: | ---: | ---: |
|28 days|148|958 /45215|3|958 /45215|
|90 days|186|2787 /134456|3|2787 /134456|
|180 days|212|5760 /315895|3|5760 /315895|
|365 days|226|13174 /835831|3|13174 /835831|

Each request used `rowLimit=250,startRow=0`; `hasMore=false`, no history-boundary
or future-date truncation. `limitedByProvider=true` is retained: reaching the
end of returned detail is not proof Google exposes every possible search row.
These non-query dimensions reconcile independent summaries; no position averages
or complete query-level coverage is inferred.

## Device Detail

| Window | Device | Clicks | Impressions | CTR (fraction) | Position |
| --- | --- | ---: | ---: | ---: | ---: |
|28|Mobile|773|32045|0.024122327976283352|8.28709627086909|
|28|Desktop|180|12849|0.014008872285780995|12.20196124212001|
|28|Tablet|5|321|0.01557632398753894|10.392523364485982|
|90|Mobile|2267|93901|0.02414244789725349|8.633795167250614|
|90|Desktop|505|39683|0.01272585238011239|14.603457399894161|
|90|Tablet|15|872|0.017201834862385322|10.431192660550458|
|180|Mobile|4769|198763|0.02399339917389051|8.667161393217047|
|180|Desktop|962|114753|0.008383223096563924|15.326823699598268|
|180|Tablet|29|2379|0.012189995796553174|15.011349306431274|
|365|Mobile|10683|523584|0.02040360286028603|8.27911089720083|
|365|Desktop|2415|305706|0.007899746815567899|14.954855318508633|
|365|Tablet|76|6541|0.011619018498700505|12.641186362941447|

Mobile supplies about81% of clicks in28/90/365 days and83% in180 days. This
supports keeping mobile content/booking usability and the measured SVG loading
bottleneck high priority. It does not show a device-specific conversion rate;
CTR differences also involve query/rank mix.

## Leading Search Locations

| Window | Poland Clicks/Impressions | UK Clicks/Impressions | USA Clicks/Impressions |
| --- | ---: | ---: | ---: |
|28|301 /13635|259 /13655|118 /5382|
|90|883 /41837|707 /40395|330 /15634|
|180|1696 /88655|1329 /84904|924 /50674|
|365|3403 /205524|3225 /226081|2216 /161817|

These are search locations, not language, nationality, residence, customer
identity or paid bookings. Poland includes visitors searching while in Krakow.
The evidence supports improving existing English journeys first, not automatic
Polish/German/Spanish translation or invented hreflang. A translation decision
still needs language-intent and booking demand plus operational support.

Only aggregate data is transcribed here; no query text, private visitor URL or
attribution tokens. The MCP refused an attempted workspace output path; no
private raw export is claimed or access boundary bypassed. Full-precision detail
retention, query/page intent pairs and future-history procedures remain M02 work.
See [exact summary coverage and causal limits](FULL-PRECISION-SUMMARIES.md).
