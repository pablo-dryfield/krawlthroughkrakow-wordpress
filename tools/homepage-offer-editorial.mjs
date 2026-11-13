import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts,offerTemplateValues} from './site-offer-facts.mjs';

export async function buildHomepageOfferStyles(file){
 const source=await readFile(file,'utf8'),css=(await readFile(new URL('./homepage-offer.css',import.meta.url),'utf8')).trim();
 const start='/* BEGIN homepage offer clearance */',end='/* END homepage offer clearance */',shared='/* BEGIN shared content accessibility */',sharedEnd='/* END shared content accessibility */';
 const count=marker=>source.split(marker).length-1;
 if(count(shared)!==1||count(sharedEnd)!==1||source.indexOf(sharedEnd)<source.indexOf(shared)||count(start)!==count(end)||count(start)>1)throw Error('Ambiguous homepage offer stylesheet boundaries');
 let base=source;
 if(count(start)){
  const first=source.indexOf(start),last=source.indexOf(end);
  if(last<first||source.slice(last+end.length,source.indexOf(shared)).trim()||last>source.indexOf(shared))throw Error('Unexpected homepage offer stylesheet order');
  base=source.slice(0,first).trimEnd()+'\n\n'+source.slice(last+end.length).trimStart();
 }
 const index=base.indexOf(shared);
 await writeFile(file,base.slice(0,index).trimEnd()+'\n\n'+start+'\n'+css+'\n'+end+'\n\n'+base.slice(index));
}

export async function loadHomepageOfferRevision(){
 const sourceHtml=await readFile('docs/homepage-parity/production-source-rendered-1920.html','utf8');
 if(createHash('sha256').update(sourceHtml).digest('hex')!=='3c4b3dd94697bcd942e20420aa136f973929412eb772132347f10fc752041d7e')throw Error('Homepage offer review no longer matches original capture');
 const facts=await loadOfferFacts(),values=offerTemplateValues(facts);
 let html=await readFile(new URL('./content/homepage-offer.html',import.meta.url),'utf8');
 for(const [key,value] of Object.entries(values))html=html.replaceAll('{{'+key+'}}',value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#039;'));
 if(/\{\{|\}\}/.test(html))throw Error('Unresolved offer fact');
 return {sourceHtml,html,reviewedOn:facts.reviewedOn,version:'2026-11-13.offer-1',sourceSha256:'3c4b3dd94697bcd942e20420aa136f973929412eb772132347f10fc752041d7e'};
}

export function reviseHomepageOffer(revision){
 if(!revision)return [];
 if(revision.version!=='2026-11-13.offer-1'||revision.reviewedOn!=='2026-11-13'||revision.sourceSha256!=='3c4b3dd94697bcd942e20420aa136f973929412eb772132347f10fc752041d7e'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.html!=='string')throw Error('Reviewed homepage offer source identity required');
 const source=new DOMParser().parseFromString(revision.sourceHtml,'text/html');
 const templates=new DOMParser().parseFromString(revision.html,'text/html');
 const allowed=new Set(['.et_pb_blurb_3 .et_pb_module_header','.et_pb_blurb_3 .et_pb_blurb_description','.et_pb_blurb_4 .et_pb_blurb_description','.et_pb_blurb_5 .et_pb_blurb_description','.et_pb_blurb_6 .et_pb_module_header','.et_pb_blurb_7 .et_pb_module_header','.et_pb_text_3 .et_pb_text_inner','.et_pb_text_4 .et_pb_text_inner','.et_pb_text_5 .et_pb_text_inner','.et_pb_text_8 .et_pb_text_inner','.et_pb_text_10 .et_pb_text_inner','.et_pb_text_11 .et_pb_text_inner > :is(h2,h3)','.et_pb_text_12 .et_pb_text_inner','.et_pb_text_13 .et_pb_text_inner','.et_pb_text_15 .et_pb_text_inner','.et_pb_text_16 .et_pb_text_inner','.et_pb_blurb_8 .et_pb_module_header','.et_pb_blurb_11 .et_pb_blurb_description','.et_pb_blurb_12 .et_pb_blurb_description','.et_pb_blurb_13 .et_pb_module_header','.et_pb_blurb_13 .et_pb_blurb_description','.et_pb_text_24 .et_pb_text_inner','.et_pb_text_30 .et_pb_text_inner','.et_pb_text_33 .et_pb_text_inner']);
 const pending=[],seen=new Set(),normalize=value=>value.replace(/\s+/g,' ').trim();
 for(const selector of ['.et_pb_text_2 .et_pb_text_inner > :first-child','.et_pb_text_18 .et_pb_text_inner > :is(h2,h3)','.et_pb_text_22 .et_pb_text_inner > :is(h2,h3)'])allowed.add(selector);
 const links=new Set(['/about-us/how-to-join/','/meeting-point/','/faqs/','/new-years-eve/','/krakow-nightlife/','/store2/pub-crawl-28/']);
 const nodes=[...templates.querySelectorAll('template')];
 if(nodes.length!==allowed.size||normalize(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(node=>node.tagName!=='TEMPLATE'))throw Error('Complete reviewed homepage offer templates required');
 for(const template of nodes){
  const selector=template.getAttribute('data-target');
  if(!allowed.has(selector)||seen.has(selector)||template.attributes.length!==1)throw Error('Unreviewed or repeated homepage offer target');seen.add(selector);
  for(const node of template.content.querySelectorAll('*')){
   if(!['P','STRONG','A','SPAN'].includes(node.tagName)||[...node.attributes].some(attribute=>node.tagName!=='A'||attribute.name!=='href'))throw Error('Unexpected offer markup or attribute');
   if(node.tagName==='A'){
    const url=new URL(node.getAttribute('href'));
    if(url.origin!=='https://krawlthroughkrakow.com'||!links.has(url.pathname)||url.search||(url.hash&&!(url.pathname==='/store2/pub-crawl-28/'&&url.hash==='#book'))||!normalize(node.textContent))throw Error('Unreviewed offer link');
   }
  }
  const original=source.querySelectorAll('#main-content '+selector),current=document.querySelectorAll('#main-content '+selector);
  if(original.length!==1||current.length!==1)throw Error('Homepage offer target missing or ambiguous');
  const target=current[0],html=template.innerHTML.trim();
  if(!normalize(template.content.textContent)||target.closest('.et_pb_section_0')||target.querySelector('img,svg,iframe,script,style,form,input,button,[id],a[name]'))throw Error('Unexpected content inside homepage copy target');
  if(target.innerHTML!==html&&normalize(target.textContent)!==normalize(original[0].textContent))throw Error('Homepage copy changed since source review');
  pending.push({selector,target,html});
 }
 for(const {target,html} of pending)target.innerHTML=html;
 return pending.map(({selector})=>({selector,reviewedOn:revision.reviewedOn}));
}
