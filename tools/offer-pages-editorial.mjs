import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadOfferFacts,offerTemplateValues} from './site-offer-facts.mjs';

export async function loadOfferPageRevisions(){
 const facts=await loadOfferFacts();
 const reviews=JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);require $argv[1];echo json_encode(array_column(ktk_homepage_review_sources(),'url','name'));",'staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php'],{encoding:'utf8'}));
 const values={...offerTemplateValues(facts),googleReviews:reviews.Google,tripadvisorReviews:reviews.Tripadvisor,getyourguideReviews:reviews.GetYourGuide};
 const definitions=[['how-to-join','8ac39c6381242d3adbcedac6e8bcc45690bc19c4b3cc1f89fb5422ae67518bda'],['meeting-point','fc579c884982fe304439b6f030d5d9027cc95ca74df44521956beea44412d65c'],['faqs','b4fe58b2ee407c980e99317a553663c1911eca98b5f58644aa33435ea6facd94']];
 const result=[];
 for(const [key,sourceSha256] of definitions){
  const sourceHtml=await readFile('docs/code-pages/full-migration/captures/'+key+'/production-1920.html','utf8');
  if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Offer-page source identity changed: '+key);
  let markup=await readFile(new URL('./content/offer-'+key+'.html',import.meta.url),'utf8');
  for(const [name,value] of Object.entries(values)){
   if(typeof value!=='string'||!value.trim()||/[<>\u0000-\u001f]/.test(value))throw Error('Plain reviewed offer value required');
   markup=markup.replaceAll('{{'+name+'}}',value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#039;'));
  }
  if(/\{\{|\}\}/.test(markup))throw Error('Unresolved offer-page facts');
  result.push({key,sourceSha256,sourceHtml,markup,reviewedOn:facts.reviewedOn,version:'2026-11-13.offer-pages-1',reviewLinks:Object.values(reviews)});
 }
 return result;
}

export function reviseOfferPages({key,revision}){
 const identities=new Map([['how-to-join','8ac39c6381242d3adbcedac6e8bcc45690bc19c4b3cc1f89fb5422ae67518bda'],['meeting-point','fc579c884982fe304439b6f030d5d9027cc95ca74df44521956beea44412d65c'],['faqs','b4fe58b2ee407c980e99317a553663c1911eca98b5f58644aa33435ea6facd94']]);
 if(!identities.has(key))return [];
 if(!revision||revision.key!==key||revision.sourceSha256!==identities.get(key)||revision.version!=='2026-11-13.offer-pages-1'||revision.reviewedOn!=='2026-11-13'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string'||!Array.isArray(revision.reviewLinks)||revision.reviewLinks.length!==3)throw Error('Reviewed offer-page source identity required');
 const external=new Set(['https://www.facebook.com/krawlthroughkrakow/photos','https://www.instagram.com/krawlthroughkrakow/']);
 const reviewHosts=new Set();
 for(const href of revision.reviewLinks){
  const u=new URL(href);
  if(u.protocol!=='https:'||u.search||u.hash||u.username||u.password||!((u.hostname==='www.google.com'&&u.pathname.startsWith('/maps/place/Krawl+Through+Krakow+-+Pub+crawl/'))||(u.hostname==='www.tripadvisor.com'&&u.pathname.includes('-d2725527-Reviews-Krawl_Through_Krakow_Pub_Crawl-'))||(u.hostname==='www.getyourguide.com'&&u.pathname==='/krakow-l40/krakow-pub-crawl-1h-open-bar-vip-entry-welcome-shots-t443425/')))throw Error('Review source must remain the existing operator profile');
  external.add(href);
  reviewHosts.add(u.hostname);
 }
 if(reviewHosts.size!==3)throw Error('Three distinct existing review platforms required');
 const selectors=key==='faqs'?['.et_pb_text_1 .et_pb_text_inner','.et_pb_text_2 .et_pb_text_inner','.et_pb_text_5 .et_pb_text_inner']:key==='how-to-join'?['.et_pb_text_1 .et_pb_text_inner','.et_pb_blurb_2 .et_pb_module_header','.et_pb_cta_0 .et_pb_promo_description > div']:['.et_pb_text_1 .et_pb_text_inner'];
 const questions=key==='faqs'?['How much does the crawl cost?','How can I join?','Do you guys run every night?','Where is your meeting point',"What if I'm late?",'What bars/clubs are we going?','How long is the Pub Crawl?','Do you stay close to the main square?',"What if I'm Alone?",'Is there a Dress Code?','Where are your Photos?','Can I Read your Reviews?']:[];
 const allowed=new Set([...selectors.map(s=>'target:'+s),...questions.map(q=>'question:'+q)]),seen=new Set(),pending=[];
 const source=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),normalize=s=>s.replace(/\s+/g,' ').trim();
 const nodes=[...templates.querySelectorAll('template')];
 if(nodes.length!==allowed.size||normalize(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Complete reviewed offer-page templates required');
 const match=(doc,selector,question)=>question?[...doc.querySelectorAll('#main-content .et_pb_toggle')].filter(n=>normalize(n.querySelector('.et_pb_toggle_title')?.textContent||'')===question).map(n=>n.querySelector('.et_pb_toggle_content')).filter(Boolean):[...doc.querySelectorAll('#main-content '+selector)];
 for(const template of nodes){
  const selector=template.getAttribute('data-target'),question=template.getAttribute('data-question'),identity=selector?'target:'+selector:'question:'+question;
  if(template.attributes.length!==1||!allowed.has(identity)||seen.has(identity))throw Error('Unreviewed, missing or repeated offer-page target');seen.add(identity);
  for(const n of template.content.querySelectorAll('*')){
   if(!['P','STRONG','A','SPAN'].includes(n.tagName)||[...n.attributes].some(a=>n.tagName!=='A'||a.name!=='href'))throw Error('Unexpected offer-page markup');
   if(n.tagName==='A'){
    const href=n.getAttribute('href'),relative=href.startsWith('__KTK_HOME_URL__')?href.slice('__KTK_HOME_URL__'.length):null;
    const paths=new Set(['about-us/how-to-join/','meeting-point/','faqs/','contact/','gallery/','krakow-nightlife/','new-years-eve/','terms-and-conditions/','store2/pub-crawl-28/#book']);
    if(!(relative!==null?paths.has(relative):external.has(href))||!normalize(n.textContent))throw Error('Unreviewed offer-page link');
   }
  }
  const original=match(source,selector,question),current=match(document,selector,question);
  if(original.length!==1||current.length!==1)throw Error('Offer-page target missing or ambiguous');
  const target=current[0],html=template.innerHTML.trim();
  if(!normalize(template.content.textContent)||target.querySelector('img,svg,iframe,script,style,form,input,button,[id],a[name]'))throw Error('Protected content inside offer-page target');
  if(target.innerHTML!==html&&normalize(target.textContent)!==normalize(original[0].textContent))throw Error('Offer-page copy changed since source review');
  if(target.hasAttribute('data-ktk-offer-copy')&&target.getAttribute('data-ktk-offer-copy')!==revision.reviewedOn)throw Error('Offer-page review marker changed');
  pending.push({identity,target,html});
 }
 for(const {target,html} of pending){target.innerHTML=html;target.dataset.ktkOfferCopy=revision.reviewedOn;}
 return pending.map(({identity})=>({type:'reviewed-offer-copy',identity,reviewedOn:revision.reviewedOn}));
}
