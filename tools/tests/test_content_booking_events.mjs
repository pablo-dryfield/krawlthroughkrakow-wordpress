import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js',import.meta.url),'utf8');
const end=source.indexOf('\n  const mobileNav =');
assert.ok(end>0,'Reviewed boundary after the actual tracking bootstrap is required');
const bootstrap=source.slice(0,end)+'\n})();';

function fixture(href,{consent=true,header=false,floating=false,blockedStorage=false}={}){
 const location=new URL('https://krawlthroughkrakow.com/staging/krakow-stag-do/?utm_source=partner&gclid=example-click');
 const handlers=[],stored=new Map();
 class Element{}
 class Anchor extends Element{
  constructor(){super();this.href=new URL(href,location).href;this.id=floating?'ktk-cta':'';}
  closest(selector){if(selector==='a[href]')return this;if(selector==='#main-header')return header?{}:null;return null;}
 }
 const anchor=new Anchor(),window={KTK_ANALYTICS_CONSENT:consent};
 const document={body:{classList:{add(){},toggle(){}},dataset:{ktkPage:'krakow-stag-do'}},querySelectorAll:selector=>selector==='a[href]'?[anchor]:[],addEventListener:(name,callback)=>{if(name==='click')handlers.push(callback);}};
 const context=vm.createContext({window,document,Element,URL,URLSearchParams,location,navigator:{userAgent:'Chrome/154',platform:'Win32',maxTouchPoints:0},localStorage:{getItem:key=>{if(blockedStorage)throw Error('Storage unavailable');return stored.get(key)||null;},setItem:(key,value)=>{if(blockedStorage)throw Error('Storage unavailable');stored.set(key,value);}}});
 vm.runInContext(bootstrap,context);
 return {anchor,handlers,context,window,click:()=>handlers.forEach(callback=>callback({target:anchor})),events:()=>JSON.parse(JSON.stringify(window.dataLayer||[]))};
}

test('matching Go-Karting link retains attribution and emits product30 after consent',()=>{
 const f=fixture('/staging/store2/go-karting-30/#book');f.click();
 assert.deepEqual(f.events(),[{event:'ktk_page_booking_click',page:'krakow-stag-do',product_id:30,cta_position:'content'}]);
 assert.equal(new URL(f.anchor.href).searchParams.get('utm_source'),'partner');
 assert.equal(new URL(f.anchor.href).hash,'#book');
});

test('our Polish Vodka Tasting links emit product44 with attribution and no duplicate initialization',()=>{
 for(const prefix of ['/staging','']){
  const f=fixture(prefix+'/store2/polish-vodka-tasting-44/#book');
  vm.runInContext(bootstrap,f.context);assert.equal(f.handlers.length,1);f.click();
  assert.deepEqual(f.events(),[{event:'ktk_page_booking_click',page:'krakow-stag-do',product_id:44,cta_position:'content'}]);
  assert.equal(new URL(f.anchor.href).searchParams.get('utm_source'),'partner');assert.equal(new URL(f.anchor.href).hash,'#book');
 }
});

test('product44 tracking follows consent transitions without changing the booking destination',()=>{
 const f=fixture('/staging/store2/polish-vodka-tasting-44/#book',{consent:false});f.click();assert.deepEqual(f.events(),[]);
 f.window.KTK_ANALYTICS_CONSENT=true;f.click();assert.equal(f.events().length,1);assert.equal(f.events()[0].product_id,44);
 f.window.KTK_ANALYTICS_CONSENT=false;f.click();assert.equal(f.events().length,1);assert.equal(new URL(f.anchor.href).pathname,'/staging/store2/polish-vodka-tasting-44/');
});

test('our Food Tour48 links preserve attribution, consent transitions and singular initialization',()=>{
 for(const prefix of ['/staging','']){
  const f=fixture(prefix+'/store2/food-tour-krakow-48/#book',{consent:false});
  vm.runInContext(bootstrap,f.context);assert.equal(f.handlers.length,1);f.click();assert.deepEqual(f.events(),[]);
  assert.equal(new URL(f.anchor.href).searchParams.get('utm_source'),'partner');assert.equal(new URL(f.anchor.href).hash,'#book');
  f.window.KTK_ANALYTICS_CONSENT=true;f.click();
  assert.deepEqual(f.events(),[{event:'ktk_page_booking_click',page:'krakow-stag-do',product_id:48,cta_position:'content'}]);
  f.window.KTK_ANALYTICS_CONSENT=false;f.click();assert.equal(f.events().length,1);
 }
});

test('inherited object properties cannot become public product events',()=>{
 for(const slug of ['constructor','toString','__proto__','hasOwnProperty','inherited-44']){
  const f=fixture('/staging/store2/'+slug+'/');
  vm.runInContext('Object.prototype["inherited-44"]=44;',f.context);f.click();assert.deepEqual(f.events(),[]);
 }
});
test('rejection withholds the booking event without losing the existing attribution behavior',()=>{
 const f=fixture('/staging/store2/go-karting-30/#book',{consent:false});f.click();
 assert.deepEqual(f.events(),[]);assert.equal(new URL(f.anchor.href).searchParams.get('gclid'),'example-click');
});
test('known existing offers and CTA positions retain their identities; initialization stays singular',()=>{
 for(const [slug,id] of [['pub-crawl-28',28],['nye-pub-crawl-32',32],['halloween-pub-crawl-51',51]]){
  const f=fixture('/staging/store2/'+slug+'/#book',{header:id===28,floating:id===32});
  vm.runInContext(bootstrap,f.context);assert.equal(f.handlers.length,1);f.click();
  assert.equal(f.events()[0].product_id,id);assert.equal(f.events()[0].cta_position,id===28?'header':id===32?'floating':'content');
 }
});
test('foreign, unknown and malformed destinations do not become product events, including unavailable storage',()=>{
 for(const href of ['https://other.test/staging/store2/go-karting-30/','/staging/store2/unknown-999/','/staging/store2/go-karting-30/extra/']){
  const f=fixture(href,{blockedStorage:true});f.click();assert.deepEqual(f.events(),[]);
 }
 const f=fixture('/staging/store2/go-karting-30/?utm_source=existing#book',{blockedStorage:true});f.click();
 assert.equal(new URL(f.anchor.href).searchParams.get('utm_source'),'existing');assert.equal(f.events()[0].product_id,30);
});
