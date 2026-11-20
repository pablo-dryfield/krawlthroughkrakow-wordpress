import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySnapshotLinks,summarizeRenderedGraph} from '../rendered-link-graph.mjs';
const link=(href,extra={})=>({href,native:true,context:'main',nofollow:false,visible:true,ariaHidden:false,...extra});
const page=(route,links,kind='article')=>({route,kind,links:classifySnapshotLinks(links,route)});

test('sanitized snapshots preserve structural query/fragment evidence without values',()=>{
 const rows=classifySnapshotLinks([link('/staging/store2/pub-crawl-28/?utm_source=sensitive-attribution-value#private-fragment'),link('https://example.com/?token=private-value'),link('/staging/wp-json/ktk-storefront/v1/saved-carts/00000000-0000-0000-0000-000000000000')],'/');
 assert.equal(rows[0].route,'/store2/pub-crawl-28/');assert.equal(rows[0].hasQuery,true);assert.equal(rows[0].hasFragment,true);
 assert.equal(rows[1].kind,'foreign');assert.equal(rows[2].kind,'protected');
 assert.ok(!JSON.stringify(rows).includes('sensitive-attribution-value'));assert.ok(!JSON.stringify(rows).includes('private-value'));assert.ok(!JSON.stringify(rows).includes('private-fragment'));
});
test('only actual native followable anchors create commercial reachability',()=>{
 const pages=[page('/',[link('/staging/store2/')],'homepage'),page('/store2/',[link('/staging/store2/product-1/',{native:false})],'catalog'),page('/store2/product-1/',[],'product')];
 assert.deepEqual(summarizeRenderedGraph(pages).unreachable,['/store2/product-1/']);
 pages[1]=page('/store2/',[link('/staging/store2/product-1/')],'catalog');
 assert.equal(summarizeRenderedGraph(pages).pages.at(-1).nativeDepth,2);
 pages[1]=page('/store2/',[link('/staging/store2/product-1/',{nofollow:true})],'catalog');
 assert.deepEqual(summarizeRenderedGraph(pages).unreachable,['/store2/product-1/']);
});
test('default-visible observations stay separate from the complete rendered DOM graph',()=>{
 const pages=[page('/',[link('/staging/store2/',{visible:false})],'homepage'),page('/store2/',[],'catalog')];
 assert.equal(summarizeRenderedGraph(pages).pages[1].nativeDepth,1);
 assert.equal(summarizeRenderedGraph(pages,{},true).pages[1].nativeDepth,null);
});
test('aliases are explicit and unknown routes are retained, never crawled',()=>{
 const pages=[page('/',[link('/staging/old/'),link('/staging/unknown/')],'homepage'),page('/current/',[])];
 const g=summarizeRenderedGraph(pages,{'/old/':{target:'/current/'}});
 assert.equal(g.pages[1].nativeDepth,1);assert.deepEqual(g.unknown,[{route:'/unknown/',sources:['/']}]);
 assert.throws(()=>summarizeRenderedGraph(pages,{'/old/':{target:'/other/'},'/other/':{target:'/old/'}}));
});
