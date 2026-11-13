import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyGraphLink,resolveGraphAlias,summarizeInternalGraph} from '../internal-link-graph.mjs';

test('resolves actual staging-relative paths without retaining attribution values',()=>{
 const result=classifyGraphLink('../next/?utm_source=private-value#book','/guide/');
 assert.deepEqual(result,{kind:'page',route:'/next/',hasQuery:true,hasFragment:true,insecure:false});
 assert.ok(!JSON.stringify(result).includes('private-value'));
 assert.equal(classifyGraphLink('?utm_source=value','/guide/').route,'/guide/');
 assert.equal(classifyGraphLink('','/guide/').route,'/guide/');
 assert.equal(classifyGraphLink(null,'/guide/').kind,'invalid');
});
test('does not mistake production, foreign hosts or protected actions for public staging pages',()=>{
 for(const href of ['/guide/','https://krawlthroughkrakow.com/store2/'])assert.equal(classifyGraphLink(href,'/').kind,'outside-staging');
 for(const href of ['https://other.test/staging/','https://krawlthroughkrakow.com.other.test/staging/','https://krawlthroughkrakow.com:444/staging/'])assert.equal(classifyGraphLink(href,'/').kind,'foreign');
 for(const href of ['/staging/store/','/staging/wp-admin/','/staging/wp-json/example','/staging/store2/cart/','/staging/store2/checkout/'])assert.equal(classifyGraphLink(href,'/').kind,'protected');
 assert.equal(classifyGraphLink('https://user:password@krawlthroughkrakow.com/staging/','/').kind,'invalid');
 assert.equal(classifyGraphLink('javascript:alert(1)','/').kind,'non-http');
 assert.equal(classifyGraphLink('/staging/wp-content/uploads/guide.pdf','/').kind,'media');
});
test('preserves exact path identity and exposes insecure links',()=>{
 assert.equal(classifyGraphLink('/staging/Guide','/').route,'/Guide');
 assert.equal(classifyGraphLink('/staging/%67uide/','/').route,'/%67uide/');
 assert.equal(classifyGraphLink('http://krawlthroughkrakow.com/staging/guide/','/').insecure,true);
});
test('only explicit acyclic aliases resolve; invalid targets fail',()=>{
 assert.equal(resolveGraphAlias('/old/',{'/old/':{target:'/next/'},'/next/':{target:'/final/'}}),'/final/');
 assert.equal(resolveGraphAlias('/Other/',{'/other/':{target:'/final/'}}),'/Other/');
 assert.equal(resolveGraphAlias('/toString',{}),'/toString');
 assert.throws(()=>resolveGraphAlias('/a/',{'/a/':{target:'/b/'},'/b/':{target:'/a/'}}),/cycle/);
 assert.throws(()=>resolveGraphAlias('/a/',{'/a/':{target:'//foreign.test/'}}),/target/);
});
test('native reachability excludes script-only and nofollow paths; self/duplicate links do not inflate incoming pages',()=>{
 const link=(href,extra={})=>({href,context:'main',native:true,nofollow:false,...extra});
 const pages=[{route:'/',kind:'home',links:[link('/staging/a/'),link('/staging/a/'),link('/staging/script/',{native:false}),link('/staging/no/',{nofollow:true})]},
  {route:'/a/',kind:'page',links:[link('/staging/a/'),link('/staging/old/'),link('/staging/missing/?token=never-store')]},
  {route:'/b/',kind:'product',links:[]},{route:'/script/',kind:'page',links:[]},{route:'/no/',kind:'page',links:[]}];
 const result=summarizeInternalGraph(pages,{'/old/':{target:'/b/'}});
 assert.equal(result.pages.find(row=>row.route==='/a/').incomingPages,1);
 assert.equal(result.pages.find(row=>row.route==='/b/').nativeDepth,2);
 assert.deepEqual(result.unreachable,['/script/','/no/']);
 assert.deepEqual(result.unknown,[{route:'/missing/',sources:['/a/']}]);
 assert.ok(!JSON.stringify(result).includes('never-store'));
});
test('shell links count for discovery but do not masquerade as contextual links',()=>{
 const result=summarizeInternalGraph([{route:'/',kind:'home',links:[{href:'/staging/a/',native:true,nofollow:false,context:'shell'}]},{route:'/a/',kind:'page',links:[]}]);
 assert.equal(result.pages[1].nativeDepth,1);assert.equal(result.pages[1].mainOnlyDepth,null);assert.equal(result.pages[1].contextualIncomingPages,0);
 assert.throws(()=>summarizeInternalGraph([{route:'/',links:[]},{route:'/',links:[]}]),/Unique/);
});
