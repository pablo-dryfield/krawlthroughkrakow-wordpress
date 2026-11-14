// Self-contained so the same tested analysis can run against authenticated, read-only browser responses.
export function summarizeQueryPageResponses({responses,knownPaths,startDate,endDate}){
 const fail=message=>{throw Error(message+'; raw query/URL values withheld');};
 const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if(!validDay(startDate)||!validDay(endDate)||startDate>endDate||!Array.isArray(responses)||!responses.length||responses.length>64||!Array.isArray(knownPaths)||!knownPaths.length)fail('Explicit dates, bounded responses and known public paths required');
 const paths=new Set();for(const p of knownPaths){if(typeof p!=='string'||!p.startsWith('/')||p.startsWith('//')||/[?#\u0000-\u0020]/.test(p)||new URL(p,'https://krawlthroughkrakow.com').pathname!==p)fail('Invalid public path registry');paths.add(p);}
 const normalize=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
 const classify=q=>{
  const n=normalize(q);
  if(/\bkrawl through krakow\b|\bkrawlthroughkrakow(?:\.com)?\b/.test(n))return 'explicit_brand';
  if(/\bcrawl through krakow\b|\bkrakow krawl\b|\bkrawl krakow\b|\bthe krawl\b/.test(n))return 'brand_variant_review';
  if(/\bnew year|\bnye\b|\bsylwest/.test(n))return 'nye';
  if(/\bpub crawl|\bbar crawl|\bpub krawl/.test(n))return 'generic_crawl';
  if(/\bstag\b|\bhen\b|\bbachelor|\bstudent trip/.test(n))return 'group_planning';
  if(/\bdrinking game|\bjenga\b/.test(n))return 'games';
  if(/\bcheap|\bbudget|\bdrink price|\bbeer price/.test(n))return 'budget_drinks';
  if(/\bnightlife|\bnightclub|\btechno|\bjazz\b|\blive music|\birish bar|\bshot bar/.test(n))return 'nightlife_music';
  return 'other_returned_queries';
 };
 const selected=['pub crawl krakow','krakow pub crawl','krawl through krakow','krakow nightlife','krakow new year','krakow new years eve','new years eve krakow','cheap bars krakow','krakow techno clubs','jazz bars krakow','krakow stag do','krakow hen do','best drinking games'];
 const counter=()=>({rows:0,clicks:0,impressions:0}),add=(c,r)=>{c.rows++;c.clicks+=r.clicks;c.impressions+=r.impressions;};
 const metrics=m=>m&&Number.isSafeInteger(m.clicks)&&m.clicks>=0&&Number.isSafeInteger(m.impressions)&&m.impressions>=0&&Number.isFinite(m.ctr)&&m.ctr>=0&&Number.isFinite(m.position)&&m.position>=0&&Math.abs(m.ctr-(m.impressions?m.clicks/m.impressions:0))<1e-12;
 const seen=new Set(),queries=new Set(),pages=new Set(),queryGroups={},selectedGroups={},variants=Object.fromEntries(['clean','query_only','fragment_only','query_and_fragment'].map(v=>[v,counter()])),returned=counter();
 let expectedOffset=0,summary=null,coverageDate=null;
 for(const [index,response]of responses.entries()){
  const c=response?.coverage;
  if(response?.startDate!==startDate||response?.endDate!==endDate||JSON.stringify(response?.dimensions)!=='["query","page"]'||response?.searchType!=='web'||response?.timeZone!=='America/Los_Angeles'||response?.summaryAggregation!=='byProperty'||response?.detailAggregation!=='byPage')fail('Mismatched report dimensions, dates or aggregation');
  if(!response.dateCoverage||!validDay(response.dateCoverage.historyBoundaryDate)||response.dateCoverage.startsBeforeHistoryBoundary!==false||response.dateCoverage.endsInFuture!==false)fail('Incomplete date coverage');
  if(!Array.isArray(response.rows)||!c||c.limitedByProvider!==true||c.startRow!==expectedOffset||!Number.isSafeInteger(c.rowLimit)||c.rowLimit<1||c.rowLimit>24999||c.returnedRows!==response.rows.length||response.rows.length>c.rowLimit||typeof c.hasMore!=='boolean'||(c.hasMore?(response.rows.length!==c.rowLimit||c.nextStartRow!==c.startRow+c.rowLimit):c.nextStartRow!==null))fail('Invalid contiguous pagination coverage');
  if(c.hasMore!==(index<responses.length-1))fail('Incomplete or overrun returned pagination');
  if(!metrics(response.summary))fail('Independent full-precision property summary required');
  const summaryValues=Object.fromEntries(['clicks','impressions','ctr','position'].map(k=>[k,response.summary[k]])),coverageValues=Object.fromEntries(['historyBoundaryDate','startsBeforeHistoryBoundary','endsInFuture'].map(k=>[k,response.dateCoverage[k]]));
  if(index===0){summary=summaryValues;coverageDate=coverageValues;}else if(JSON.stringify(summaryValues)!==JSON.stringify(summary)||JSON.stringify(coverageValues)!==JSON.stringify(coverageDate))fail('Independent summary or date coverage drifted between pages');
  expectedOffset=c.nextStartRow;
  for(const r of response.rows){
   if(!Array.isArray(r.keys)||r.keys.length!==2||r.keys.some(v=>typeof v!=='string'||!v.trim()||/[\u0000-\u001f]/.test(v))||!metrics(r))fail('Invalid full-precision pair row');
   const [query,rawPage]=r.keys,key=JSON.stringify(r.keys);if(seen.has(key))fail('Duplicate exact query/page key');seen.add(key);queries.add(query);pages.add(rawPage);
   let url;try{url=new URL(rawPage);}catch{fail('Invalid page URL');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)fail('Invalid page URL');
   const variant=url.search&&url.hash?'query_and_fragment':url.search?'query_only':url.hash?'fragment_only':'clean';add(returned,r);add(variants[variant],r);
   const group=classify(query);queryGroups[group]??=counter();add(queryGroups[group],r);
   const normalized=normalize(query);if(!selected.includes(normalized))continue;
   const item=selectedGroups[normalized]??={...counter(),landingPaths:{}};add(item,r);
   const label=url.host==='krawlthroughkrakow.com'&&paths.has(url.pathname)?(url.protocol==='https:'?url.pathname:'[non-HTTPS known path]'):'[unreviewed page]';
   const landing=item.landingPaths[label]??={...counter(),variants:Object.fromEntries(Object.keys(variants).map(v=>[v,0]))};add(landing,r);landing.variants[variant]++;
  }
 }
 return {dates:{start:startDate,end:endDate,timeZone:'America/Los_Angeles'},responsePages:responses.length,completeReturnedPagination:true,limitedByProvider:true,dateCoverage:coverageDate,
  independentPropertySummary:summary,detailAggregation:'byPage',returnedPairTotals:returned,uniqueReturnedQueries:queries.size,uniqueExactReturnedPages:pages.size,queryCohorts:queryGroups,variants,selectedQueries:selectedGroups,
  limitations:'Full-precision returned query/page rows processed in memory, not a raw export or all Google data. Pair totals are byPage, independent summary byProperty; never subtract to infer anonymous/nonbrand totals or share. No position/CTR averages or conversions inferred. Selected landing paths intentionally roll up exact URL variants only after distinct-key validation; variant counts remain. Unknown queries, raw URLs and parameter values are not emitted. Multiple landing pages are not proof of cannibalization or migration impact.'};
}
