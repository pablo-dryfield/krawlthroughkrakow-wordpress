import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts,offerTemplateValues} from './site-offer-facts.mjs';

export async function loadPracticalGuidesEditorial(){
 const definitions=[['post-stag-pranks','pranks','0f987bd37a69ff0b3d81829266185d242ae924c1e40eb5ffdd44a40214a01456'],['post-hostel-etiquette-tips','hostel','56207c93c1a9c18d7e1826e8f1107d0514c5a767aae5db9b461115e817913c80'],['post-the-ultimate-guide-to-dating-in-nightlife-krakow','dating','5e3c450420688969b73ff7791dd0787d310341c646a61d3d400c6e93c40b4716']],rows=[],values=offerTemplateValues(await loadOfferFacts());
 for(const [key,file,sourceSha256]of definitions){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');
  if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Practical guide source changed: '+key);
  let markup=await readFile(new URL('./content/practical-'+file+'.html',import.meta.url),'utf8');
  markup=markup.replace(/\{\{([A-Za-z]+)\}\}/g,(_,name)=>{if(!['minimumAge','regularTime'].includes(name))throw Error('Unreviewed practical guide fact');return values[name];});
  if(/[{}]/.test(markup))throw Error('Unresolved practical guide fact');
  rows.push({key,sourceSha256,sourceHtml,markup,reviewedOn:'2026-11-14',version:'2026-11-14.practical-guides-1'});
 }
 return rows;
}

export function revisePracticalGuidesEditorial({key,revision}){
 const definitions={
  'post-stag-pranks':{sha:'0f987bd37a69ff0b3d81829266185d242ae924c1e40eb5ffdd44a40214a01456',photos:6,toc:23,label:'Stag prank guide contents',extra:[],files:['8dcf8e067aac-1691758951_sincerely-media-RrIYmJaqe04-unsplash_20_1_.jpg','d63a6dfe56f7-1691759198_toa-heftiba-xLUwi3yDNb0-unsplash.jpg','e7ff261fc5d8-1691759360_eric-nopanen-72eYgGJVzQM-unsplash_20_1_.jpg','d89f1fe4cc02-1691759523_yayas-film---QCk9mzwiA-unsplash.jpg','8c072ad08690-1691759640_reno-laithienne-HQ_USRr5AU4-unsplash.jpg','589b33f86a74-1691760207_sonny-mauricio-JfdfEbc8Gm4-unsplash.jpg']},
  'post-hostel-etiquette-tips':{sha:'56207c93c1a9c18d7e1826e8f1107d0514c5a767aae5db9b461115e817913c80',photos:5,toc:20,label:'Hostel etiquette guide contents',extra:['packing-and-belongings','privacy-and-visitors'],files:['373b90d70d8d-1684499139_1684499135119.jpeg','245d63ded6a9-1684499277_1684499273988.jpeg','d6cb59a31101-1684499018_1684499012109.jpeg','439bdcdc53a8-1684510787_1684510783352.jpeg','c9be0f0bc5ea-1684503021_1684503013724.jpeg']},
  'post-the-ultimate-guide-to-dating-in-nightlife-krakow':{sha:'5e3c450420688969b73ff7791dd0787d310341c646a61d3d400c6e93c40b4716',photos:5,toc:11,label:'Nightlife dating guide contents',extra:['dating-contents','pub-crawl-date','different-date','shared-experiences','conversation','variety','ktk-social-night','respectful-first-impression','approach','meeting-people','conclusion','plan-your-night'],files:['41a0db070988-priscilla-du-preez-g86airJZ4Gs-unsplash-scaled.jpg','a082f7d95ae6-petr-sidorov-kKscQ9w7SuY-unsplash-scaled.jpg','c65b4e5cc6ec-brooke-cagle-4gfbg7IulGA-unsplash-scaled.jpg','c0ac8ddd36d7-ihnatsi-yfull-UvJm0OFfQ3U-unsplash-scaled.jpg','a38a4ba997ec-DSCF5276-1-scaled.jpg']}
 };
 if(!Object.hasOwn(definitions,key))return [];
 const conf=definitions[key];
 if(revision?.key!==key||revision.sourceSha256!==conf.sha||revision.version!=='2026-11-14.practical-guides-1'||revision.reviewedOn!=='2026-11-14'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string')throw Error('Reviewed practical guide identity required');
 const sourceDoc=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),originalMain=sourceDoc.querySelector('#main-content'),selector=key==='post-the-ultimate-guide-to-dating-in-nightlife-krakow'?'.et_pb_text_0 > .et_pb_text_inner':'.entry-content',nodes=main?.querySelectorAll(selector),originals=originalMain?.querySelectorAll(selector),clean=s=>(s||'').replace(/\s+/g,' ').trim();
 if(nodes?.length!==1||originals?.length!==1||clean(main.querySelector('h1.entry-title')?.textContent)!==clean(originalMain.querySelector('h1.entry-title')?.textContent)||!clean(main.querySelector('.published')?.textContent)||clean(main.querySelector('.published')?.textContent)!==clean(originalMain.querySelector('.published')?.textContent))throw Error('Original practical guide publication identity required');
 const body=nodes[0],source=originals[0],template=document.createElement('template');template.innerHTML=revision.markup;
 const originalIds=[...source.querySelectorAll('[id]')].map(n=>n.id),allowedIds=new Set([...originalIds,...conf.extra]);
 const links=new Set([...allowedIds].map(id=>'#'+id).concat(['__KTK_HOME_URL__','__KTK_HOME_URL__about-us/how-to-join/','__KTK_HOME_URL__faqs/','__KTK_HOME_URL__krakow-stag-do/','__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__stag-do-costume/','__KTK_HOME_URL__hostel-etiquette-tips/','__KTK_HOME_URL__the-ultimate-guide-to-dating-in-nightlife-krakow/','https://respectkrakow.um.krakow.pl/','https://www.nhs.uk/symptoms/snoring/','https://rainn.org/share-the-facts/consent-101-respect-boundaries-and-building-trust/']));
 for(const n of template.content.querySelectorAll('*')){
  const attrs=n.tagName==='A'?['id','href']:['H2','H3','H4','SUMMARY','UL'].includes(n.tagName)?['id']:n.tagName==='NAV'?['aria-label']:n.tagName==='TIME'?['datetime']:n.tagName==='TEMPLATE'?['data-ktk-original-photo']:[];
  if(!['P','SMALL','TIME','NAV','DETAILS','SUMMARY','UL','OL','LI','STRONG','H2','H3','H4','A','TEMPLATE'].includes(n.tagName)||[...n.attributes].some(a=>!attrs.includes(a.name)))throw Error('Unreviewed practical guide markup');
  if(n.tagName==='A'&&(!links.has(n.getAttribute('href'))||!clean(n.textContent)))throw Error('Unreviewed practical guide destination');
  if(n.tagName==='NAV'&&n.getAttribute('aria-label')!==conf.label)throw Error('Practical contents label changed');
  if(n.tagName==='TIME'&&(n.getAttribute('datetime')!==revision.reviewedOn||n.textContent!=='14 November 2026'))throw Error('Practical guide review date changed');
 }
 const ids=[...template.content.querySelectorAll('[id]')].map(n=>n.id),nav=template.content.querySelector('nav'),details=nav?.querySelector(':scope > details'),toc=[...template.content.querySelectorAll('nav a')],slots=[...template.content.querySelectorAll('template')],headings=[...template.content.querySelectorAll('h2,h3,h4')];
 if(ids.length!==allowedIds.size||new Set(ids).size!==allowedIds.size||ids.some(id=>!allowedIds.has(id)))throw Error('Preserve every original unique practical fragment');
 if(template.content.querySelectorAll('nav').length!==1||template.content.querySelectorAll('details').length!==1||template.content.querySelectorAll('summary').length!==1||template.content.querySelectorAll('time').length!==1||!details||nav.children.length!==1||details.children.length!==2||details.children[0].tagName!=='SUMMARY'||details.children[1].tagName!=='UL'||nav.querySelector('p,small,time,template,h2,h3,h4'))throw Error('Only native contents may be collapsed');
 if(toc.length!==conf.toc||headings.length!==conf.toc||toc.some(a=>!headings.some(h=>'#'+h.id===a.getAttribute('href')))||new Set(toc.map(a=>a.getAttribute('href'))).size!==conf.toc)throw Error('Complete practical guide contents required');
 if(slots.length!==conf.photos||slots.some((n,i)=>n.attributes.length!==1||n.getAttribute('data-ktk-original-photo')!==String(i)||n.innerHTML.trim()))throw Error('Ordered original practical photo slots required');
 if(body.querySelector('form,iframe,video,script,style,input,button'))throw Error('Protected control inside practical article');
 const photos=[...body.querySelectorAll('img')].filter(n=>!n.closest('noscript')),originalPhotos=[...source.querySelectorAll('img')].filter(n=>!n.closest('noscript'));
 if(photos.length!==conf.photos||originalPhotos.length!==conf.photos)throw Error('Original practical photo count changed');
 for(let i=0;i<photos.length;i++){
  const src=photos[i].getAttribute('data-lazy-src')||photos[i].getAttribute('src'),old=originalPhotos[i].getAttribute('data-lazy-src')||originalPhotos[i].getAttribute('src');
  if(![old,'__KTK_PAGE_ASSETS__media/'+conf.files[i]].includes(src))throw Error('Original practical photo identity changed');
  const paragraph=photos[i].closest('p');if(!paragraph||paragraph.textContent.trim()||[...paragraph.querySelectorAll('img')].filter(n=>!n.closest('noscript')).length!==1)throw Error('Original practical photo wrapper changed');
  const clone=paragraph.cloneNode(true);clone.querySelectorAll('noscript,script,style').forEach(n=>n.remove());slots[i].replaceWith(clone);
 }
 const marker=body.getAttribute('data-ktk-practical-review');
 if(marker){if(marker!==revision.version||body.innerHTML!==template.innerHTML)throw Error('Changed reviewed practical article');return [];}
 const text=n=>{const clone=n.cloneNode(true);clone.querySelectorAll('script,style,noscript').forEach(n=>n.remove());return clean(clone.textContent);},actualIds=[...body.querySelectorAll('[id]')].map(n=>n.id);
 if(text(body)!==text(source)||JSON.stringify(actualIds)!==JSON.stringify(originalIds))throw Error('Original practical copy or fragments changed');
 // Copy, all original photo slots and the last fragment are checked before the swap.
 body.innerHTML=template.innerHTML;body.dataset.ktkPracticalReview=revision.version;
 return [{type:'practical-guide-review',key,reviewedOn:revision.reviewedOn,originalUniqueFragments:new Set(originalIds).size,removedDuplicateIds:originalIds.length-new Set(originalIds).size,retainedOriginalPhotos:conf.photos}];
}

const scope='body.ktk-code-page:is([data-ktk-page="post-stag-pranks"],[data-ktk-page="post-hostel-etiquette-tips"],[data-ktk-page="post-the-ultimate-guide-to-dating-in-nightlife-krakow"]) #main-content [data-ktk-practical-review]';
const styles='/* BEGIN Practical party guides */\n'+scope+' { font-size: 16px; line-height: 1.65; letter-spacing: 0; }\n'+scope+' :is(h2,h3,h4) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n'+scope+' h2 { font-size: 22px; }\n'+scope+' h3 { font-size: 18px; }\n'+scope+' h4 { font-size: 16px; }\n'+scope+' nav { margin: 1em 0; }\n'+scope+' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n'+scope+' a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }\n'+scope+' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  '+scope+' { padding-right: 24px; }\n}\n/* END Practical party guides */\n';
export async function buildPracticalGuideStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Group activity clarity */';if(css.split(anchor).length!==2)throw Error('Stable practical guide style anchor required');
 if(css.includes('/* BEGIN Practical party guides */')||css.includes('/* END Practical party guides */')){if(css.split('/* BEGIN Practical party guides */').length!==2||css.split('/* END Practical party guides */').length!==2||!css.includes(styles+'\n'+anchor))throw Error('Practical guide style drift');return;}
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
