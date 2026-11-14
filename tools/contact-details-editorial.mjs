import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts,offerTemplateValues} from './site-offer-facts.mjs';

const identity='c0f6e6e1025cff0ac10331bc3a81568e13822f082093d1af825ccde71b1c2903';
export async function loadContactDetails(){
 const sourceHtml=await readFile('docs/code-pages/full-migration/captures/contact/production-1920.html','utf8');
 if(createHash('sha256').update(sourceHtml).digest('hex')!==identity)throw Error('Contact source identity changed');
 const facts=await loadOfferFacts();let markup=await readFile(new URL('./content/contact-details.html',import.meta.url),'utf8');
 for(const [key,value]of Object.entries(offerTemplateValues(facts))){
  if(typeof value!=='string'||!value.trim()||/[<>\u0000-\u001f]/.test(value))throw Error('Plain confirmed Contact facts required');
  markup=markup.replaceAll('{{'+key+'}}',value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#039;'));
 }
 if(/[{}]/.test(markup))throw Error('Unresolved Contact facts');
 return {key:'contact',sourceSha256:identity,sourceHtml,markup,version:'2026-11-14.contact-1',reviewedOn:'2026-11-14'};
}

export function reviseContactDetails({key,revision}){
 if(key!=='contact')return [];
 if(!revision||revision.key!==key||revision.sourceSha256!=='c0f6e6e1025cff0ac10331bc3a81568e13822f082093d1af825ccde71b1c2903'||revision.version!=='2026-11-14.contact-1'||revision.reviewedOn!=='2026-11-14'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('post-195')||typeof revision.markup!=='string')throw Error('Reviewed Contact source identity required');
 const clean=s=>(s||'').replace(/\s+/g,' ').trim(),original=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html');
 const one=(doc,selector)=>{const found=[...doc.querySelectorAll('#main-content '+selector)];if(found.length!==1)throw Error('Missing or ambiguous Contact target: '+selector);return found[0];};
 const parts=[...templates.querySelectorAll('template')],seen=new Set(),html={};
 if(parts.length!==2||clean(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Complete Contact templates required');
 for(const part of parts){
  const name=part.getAttribute('data-part');if(part.attributes.length!==1||!['copy','map'].includes(name)||seen.has(name))throw Error('Unreviewed or repeated Contact part');seen.add(name);
  for(const node of part.content.querySelectorAll('*')){
   if(!['P','STRONG','BR','A','DIV'].includes(node.tagName))throw Error('Unexpected Contact markup');
   if(node.tagName==='DIV'){
    if(name!=='map'||node.className!=='ktk-contact-map-fallback'||node.getAttribute('data-ktk-contact-map-fallback')!==revision.reviewedOn||node.attributes.length!==2)throw Error('Invalid Contact map fallback');
   }else if(node.tagName==='A'){
    const href=node.getAttribute('href'),internal=['__KTK_HOME_URL__store2/pub-crawl-28/#book','__KTK_HOME_URL__meeting-point/'].includes(href),external=href==='https://maps.app.goo.gl/S3kQZC5rdABdpA1G9';
    if((!internal&&!external)||!clean(node.textContent)||[...node.attributes].some(a=>!['href','target','rel'].includes(a.name))||internal&&node.attributes.length!==1||external&&(node.getAttribute('target')!=='_blank'||node.getAttribute('rel')!=='noopener noreferrer'))throw Error('Unreviewed Contact destination');
   }else if(node.attributes.length)throw Error('Unexpected Contact attributes');
  }
  if(!clean(part.content.textContent)||name==='map'&&(part.content.children.length!==1||part.content.firstElementChild.tagName!=='DIV'||part.content.querySelectorAll('[data-ktk-contact-map-fallback]').length!==1))throw Error('Empty or malformed Contact part');
  html[name]=part.innerHTML.trim();
 }
 const copy=one(document,'.et_pb_text_2 .et_pb_text_inner'),oldCopy=one(original,'.et_pb_text_2 .et_pb_text_inner');
 if(copy.querySelector('img,svg,iframe,script,style,form,input,button,[id],a[name]')||copy.innerHTML!==html.copy&&clean(copy.textContent)!==clean(oldCopy.textContent)||copy.hasAttribute('data-ktk-contact-copy')&&copy.dataset.ktkContactCopy!==revision.reviewedOn)throw Error('Contact copy changed since review');
 const map=one(document,'.et_pb_code_0 .et_pb_code_inner'),oldMap=one(original,'.et_pb_code_0 .et_pb_code_inner');
 const frame=map.querySelector('iframe'),oldFrame=oldMap.querySelector('iframe');
 if(!frame||!oldFrame||map.querySelectorAll('iframe').length!==1)throw Error('Contact map identity missing');
 const effective=frame.dataset.ktkEmbedSrc||frame.dataset.lazySrc||frame.dataset.suppressedsrc||frame.dataset.cmpSrc||frame.getAttribute('src'),url=new URL(effective,'https://krawlthroughkrakow.com/');
 if(url.protocol!=='https:'||url.hostname!=='www.google.com'||url.pathname!=='/maps/d/embed'||url.searchParams.get('mid')!=='1_Pv-09EbFJQWehlbyeS1V3xMofKCz-g'||url.searchParams.get('ehbc')!=='2E312F'||[...url.searchParams].length!==2||frame.getAttribute('width')!==oldFrame.getAttribute('width')||frame.getAttribute('height')!==oldFrame.getAttribute('height')||![(oldFrame.getAttribute('title')||''),'Embedded map 1','Krawl Through Krakow map'].includes(frame.getAttribute('title')||''))throw Error('Contact map identity changed');
 const reviewed=map.dataset.ktkContactMap===revision.reviewedOn,fallback=map.querySelector('[data-ktk-contact-map-fallback]');
 if(map.hasAttribute('data-ktk-contact-map')&&!reviewed||(reviewed?(map.children.length!==2||!fallback||frame.nextElementSibling!==fallback||fallback.outerHTML!==html.map):(map.children.length!==1||clean(map.textContent))))throw Error('Contact map structure changed');
 const emails=[...document.querySelectorAll('#main-content a[href^="mailto:"]')],oldEmails=[...original.querySelectorAll('#main-content a[href^="mailto:"]')];
 if(emails.length!==1||oldEmails.length!==1)throw Error('Contact email identity missing');
 const address=decodeURIComponent(oldEmails[0].getAttribute('href').slice(7)).trim(),href='mailto:'+address;
 if(address!=='pubthroughkrakow@gmail.com'||![oldEmails[0].getAttribute('href'),href].includes(emails[0].getAttribute('href'))||clean(emails[0].textContent)!==clean(oldEmails[0].textContent))throw Error('Contact email identity changed');
 // Validate all late targets before modifying copy, the gated map or the public email link.
 copy.innerHTML=html.copy;copy.dataset.ktkContactCopy=revision.reviewedOn;
 if(!reviewed){map.insertAdjacentHTML('beforeend',html.map);map.dataset.ktkContactMap=revision.reviewedOn;}frame.title='Krawl Through Krakow map';
 emails[0].setAttribute('href',href);
 return [{type:'reviewed-contact-copy',reviewedOn:revision.reviewedOn},{type:'contact-map-fallback',preservesConsent:true},{type:'contact-email-href'}];
}

const styles=`/* BEGIN Contact details */
body.ktk-code-page[data-ktk-page="contact"] [data-ktk-contact-map] > iframe { width: 100%; max-width: 100%; height: auto; aspect-ratio: 4 / 3; }
body.ktk-code-page[data-ktk-page="contact"] [data-ktk-contact-map] > iframe[src="about:blank"] { display: none; }
body.ktk-code-page[data-ktk-page="contact"] .ktk-contact-map-fallback { padding: 24px 0; overflow-wrap: anywhere; }
body.ktk-code-page[data-ktk-page="contact"] :is([data-ktk-contact-copy],.ktk-contact-map-fallback) a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }
@media (max-width: 600px) {
  body.ktk-code-page[data-ktk-page="contact"] :is([data-ktk-contact-copy],[data-ktk-contact-map]) { padding-right: 24px; }
}
/* END Contact details */
`;
export async function buildContactDetailsStyles(file){
 let css=await readFile(file,'utf8');const start='/* BEGIN Contact details */',end='/* END Contact details */',anchor='/* Native interaction states, layered over the captured page cascade. */';
 if(css.split(anchor).length!==2)throw Error('Stable Contact style insertion point required');
 if(css.includes(start)||css.includes(end)){
  if(css.split(start).length!==2||css.split(end).length!==2||!css.includes(styles+'\n'+anchor))throw Error('Contact style block changed or misplaced');
  return;
 }
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
