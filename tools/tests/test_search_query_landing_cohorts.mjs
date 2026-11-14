import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {summarizeQueryPageResponses as summarize} from '../search-query-landing-cohorts.mjs';
const startDate='2026-10-14',endDate='2026-11-10',knownPaths=['/','/new-years-eve/','/new-years-eve-in-krakow/','/store2/pub-crawl-28/'];
const row=(query,page,clicks=1,impressions=10)=>({keys:[query,page],clicks,impressions,ctr:clicks/impressions,position:7.1234567890123});
const page=(rows,more=false,startRow=0)=>({startDate,endDate,dimensions:['query','page'],searchType:'web',timeZone:'America/Los_Angeles',summaryAggregation:'byProperty',detailAggregation:'byPage',summary:{clicks:958,impressions:45215,ctr:958/45215,position:9.41455269269048},dateCoverage:{historyBoundaryDate:'2025-07-13',startsBeforeHistoryBoundary:false,endsInFuture:false},coverage:{startRow,rowLimit:2,returnedRows:rows.length,hasMore:more,nextStartRow:more?startRow+2:null,limitedByProvider:true},rows});
const input=responses=>({startDate,endDate,knownPaths,responses});
test('independent summary precision is retained, never derived from selected detail',()=>{
 const r=summarize(input([page([row('pub crawl krakow','https://krawlthroughkrakow.com/')])]));assert.equal(r.independentPropertySummary.clicks,958);assert.equal(r.independentPropertySummary.position,9.41455269269048);assert.equal(r.returnedPairTotals.clicks,1);assert.ok(!('position'in r.returnedPairTotals));assert.ok(!('ctr'in r.returnedPairTotals));assert.equal(r.limitedByProvider,true);
});
test('contiguous pages allow distinct URL variants without silently merging exact keys',()=>{
 const r=summarize(input([page([row('pub crawl krakow','https://krawlthroughkrakow.com/'),row('pub crawl krakow','https://krawlthroughkrakow.com/?utm_source=private-test')],true),page([row('krakow pub crawl','https://krawlthroughkrakow.com/store2/pub-crawl-28/#book')],false,2)]));
 assert.equal(r.returnedPairTotals.rows,3);assert.equal(r.uniqueReturnedQueries,2);assert.equal(r.uniqueExactReturnedPages,3);assert.equal(r.variants.query_only.rows,1);assert.equal(r.variants.fragment_only.rows,1);assert.equal(r.selectedQueries['pub crawl krakow'].landingPaths['/'].rows,2);assert.ok(!JSON.stringify(r).includes('private-test'));
});
test('duplicate keys, incomplete/overrun/skipped/false pagination are rejected',()=>{
 const a=row('q','https://krawlthroughkrakow.com/');for(const responses of [[page([a,a])],[page([a,a],true)],[page([a]),page([a],false,2)],[page([a,a],true),page([a],false,3)]])assert.throws(()=>summarize(input(responses)));
});
test('every report identity, date boundary and aggregation must match',()=>{
 const good=page([row('q','https://krawlthroughkrakow.com/')]);for(const patch of [{startDate:'2026-10-15'},{endDate:'2026-11-11'},{timeZone:'Europe/Warsaw'},{dimensions:['query']},{searchType:'image'},{summaryAggregation:'byPage'},{detailAggregation:'byProperty'},{dateCoverage:{...good.dateCoverage,startsBeforeHistoryBoundary:true}},{dateCoverage:{...good.dateCoverage,endsInFuture:true}}])assert.throws(()=>summarize(input([{...good,...patch}])));
});
test('changing summary across pages is not silently accepted',()=>{
 const a=row('q','https://krawlthroughkrakow.com/'),b=page([row('b','https://krawlthroughkrakow.com/')],false,2);b.summary={...b.summary,position:9.5};assert.throws(()=>summarize(input([page([a,row('c','https://krawlthroughkrakow.com/')],true),b])),/drifted/);
});
test('malformed or displayed-rounded metrics cannot masquerade as raw precision',()=>{
 const good=row('q','https://krawlthroughkrakow.com/');for(const patch of [{clicks:'1'},{clicks:-1},{impressions:NaN},{position:Infinity},{ctr:'10%'},{ctr:.11}])assert.throws(()=>summarize(input([page([{...good,...patch}])])));
});
test('unreviewed queries, page secrets and credentials never enter returned output/errors',()=>{
 const secret='private-person@example.invalid',r=summarize(input([page([row(secret,'https://krawlthroughkrakow.com/unknown?token=private-order#private-fragment')])]));
 for(const value of [secret,'unknown?','private-order','private-fragment'])assert.ok(!JSON.stringify(r).includes(value));
 assert.throws(()=>summarize(input([page([row('q','https://user:password@krawlthroughkrakow.com/')])])),e=>!e.message.includes('password')&&e.message.includes('withheld'));
});
test('selected known query labels expose only known paths and preserve unknown-page count',()=>{
 const r=summarize(input([page([row('krakow pub crawl','https://krawlthroughkrakow.com/unreviewed?secret=keep-private')])]));assert.equal(r.selectedQueries['krakow pub crawl'].landingPaths['[unreviewed page]'].impressions,10);assert.ok(!JSON.stringify(r).includes('keep-private'));
});
test('explicit brand, ambiguous variants and generic crawl remain separate',()=>{
 const responses=[page([row('Krawl Through Krak\u00f3w reviews','https://krawlthroughkrakow.com/'),row('crawl through krakow','https://krawlthroughkrakow.com/')],true),page([row('pub crawl krakow','https://krawlthroughkrakow.com/')],false,2)],r=summarize(input(responses));
 for(const key of ['explicit_brand','brand_variant_review','generic_crawl'])assert.equal(r.queryCohorts[key].rows,1);
});
test('analysis is self-contained/serializable and does not mutate response input',()=>{
 const data=input([page([row('krakow new year','https://krawlthroughkrakow.com/new-years-eve/')])]),before=JSON.stringify(data),browserFunction=runInNewContext('('+summarize.toString()+')',{URL});
 assert.equal(JSON.stringify(browserFunction(data)),JSON.stringify(summarize(data)));assert.equal(JSON.stringify(data),before);
});
test('empty, unbounded and unsafe registry inputs fail with no invented zero report',()=>{
 for(const data of [input([]),{...input([page([])]),knownPaths:['//foreign.invalid/']},{...input([page([])]),knownPaths:['/?token=secret']},{...input([page([])]),endDate:'2026-13-01'},{...input([page([])]),responses:Array(65).fill(page([]))}])assert.throws(()=>summarize(data));
});
test('unknown provider metadata fields are never copied into sanitized output',()=>{
 const data=page([row('q','https://krawlthroughkrakow.com/')]);data.summary.unexpected='private-order-value';data.dateCoverage.unexpected='private-account-value';
 const r=summarize(input([data]));assert.ok(!JSON.stringify(r).includes('private-'));assert.deepEqual(Object.keys(r.independentPropertySummary),['clicks','impressions','ctr','position']);assert.deepEqual(Object.keys(r.dateCoverage),['historyBoundaryDate','startsBeforeHistoryBoundary','endsInFuture']);
});
