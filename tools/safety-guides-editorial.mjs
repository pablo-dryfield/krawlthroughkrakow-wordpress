import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts,offerTemplateValues} from './site-offer-facts.mjs';

export async function loadSafetyGuidesEditorial(){
 const definitions=[['post-is-krakow-safe-for-stag','stag','37b55436f5904b95df5dee4ad17dc05ef0d6c9463a7b6d9cb349198a4993f038'],['post-krakow-safety-guide','city','45d903c276936b713d8e4c49f37edf393d74d91245a547cfd04e53c3f528c180']],rows=[],values=offerTemplateValues(await loadOfferFacts());
 for(const [key,file,sourceSha256]of definitions){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Original safety source changed: '+key);
  const markup=(await readFile(new URL('./content/safety-'+file+'.html',import.meta.url),'utf8')).replace(/\{\{([A-Za-z]+)\}\}/g,(_,name)=>{if(name!=='minimumAge')throw Error('Unreviewed safety-guide fact');return values[name];});if(/[{}]/.test(markup))throw Error('Unresolved safety-guide fact');
  rows.push({key,sourceSha256,sourceHtml,markup,reviewedOn:'2026-11-14',version:'2026-11-14.safety-guides-1'});
 }
 return rows;
}

export function reviseSafetyGuidesEditorial({key,revision}){
 const definitions={
  'post-is-krakow-safe-for-stag':{sha:'37b55436f5904b95df5dee4ad17dc05ef0d6c9463a7b6d9cb349198a4993f038',photos:6,rawIds:18,toc:18,label:'Stag safety guide contents',extra:['whichpolishcityisbestforstagparties'],files:['5a889a50a6f3-1684995437_1684995431782.jpeg','c0e7ae71f155-1684994882_1684994878683.png','80d82354dd08-1684994999_1684994995934.png','a93b11ee13a5-1685001178_1685001171664.jpeg','c59635e1b456-1685001345_1685001337163.jpeg','82d10f2997f7-1685001706_1685001698150.jpeg']},
  'post-krakow-safety-guide':{sha:'45d903c276936b713d8e4c49f37edf393d74d91245a547cfd04e53c3f528c180',photos:3,rawIds:24,toc:17,label:'Krakow safety guide contents',extra:[],files:['17a08a394086-1684312361_1684312358573.jpeg','95ecfc905c14-1684312574_1684312573221.jpeg','0da31764ab8d-1684312542_1684312537372.jpeg']}
 };
 if(!Object.hasOwn(definitions,key))return [];
 const conf=definitions[key];if(revision?.key!==key||revision.sourceSha256!==conf.sha||revision.version!=='2026-11-14.safety-guides-1'||revision.reviewedOn!=='2026-11-14'||typeof revision.sourceHtml!=='string'||typeof revision.markup!=='string')throw Error('Reviewed safety-guide identity required');
 const sourceDoc=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),original=sourceDoc.querySelector('#main-content'),selector=key==='post-krakow-safety-guide'?'.et_pb_text_inner':'.entry-content',nodes=main?.querySelectorAll(selector),sources=original?.querySelectorAll(selector),clean=s=>(s||'').replace(/\s+/g,' ').trim();
 if(nodes?.length!==1||sources?.length!==1||!clean(original.querySelector('h1.entry-title')?.textContent)||clean(main.querySelector('h1.entry-title')?.textContent)!==clean(original.querySelector('h1.entry-title')?.textContent)||!clean(original.querySelector('.published')?.textContent)||clean(main.querySelector('.published')?.textContent)!==clean(original.querySelector('.published')?.textContent))throw Error('Original safety-guide publication identity required');
 const body=nodes[0],source=sources[0],originalIds=[...source.querySelectorAll('[id]')].map(n=>n.id),allowedIds=new Set([...originalIds,...conf.extra]);if(originalIds.length!==conf.rawIds)throw Error('Original safety fragment inventory changed');
 const template=document.createElement('template');template.innerHTML=revision.markup;
 const links=new Set([...allowedIds].map(id=>'#'+id).concat(['__KTK_HOME_URL__about-us/how-to-join/','__KTK_HOME_URL__faqs/','__KTK_HOME_URL__krakow-stag-do/','__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__stag-pranks/','__KTK_HOME_URL__is-krakow-safe-for-stag/','https://www.gov.uk/foreign-travel-advice/poland/safety-and-security','https://www.gov.uk/foreign-travel-advice/poland/health','https://www.gov.uk/foreign-travel-advice/poland/getting-help','https://respectkrakow.um.krakow.pl/','https://mpk.krakow.pl/','https://mpk.krakow.pl/bilety','https://mpk.krakow.pl/dostepnosc-dla-osob-z-ograniczona-mobilnoscia','https://www.gov.pl/web/numer-alarmowy-112/numeralarmowy112','tel:112']));
 for(const n of template.content.querySelectorAll('*')){
  const attrs=n.tagName==='A'?['href']:['H2','H3','SUMMARY','P'].includes(n.tagName)?['id']:n.tagName==='NAV'?['aria-label']:n.tagName==='TIME'?['datetime']:n.tagName==='TEMPLATE'?['data-ktk-original-photo']:[];
  if(!['P','SMALL','TIME','NAV','DETAILS','SUMMARY','UL','LI','H2','H3','A','TEMPLATE'].includes(n.tagName)||[...n.attributes].some(a=>!attrs.includes(a.name)))throw Error('Unreviewed safety-guide markup');
  if(n.tagName==='A'&&(!links.has(n.getAttribute('href'))||!clean(n.textContent)))throw Error('Unreviewed safety-guide destination');
  if(n.tagName==='NAV'&&n.getAttribute('aria-label')!==conf.label)throw Error('Safety contents label changed');
  if(n.tagName==='TIME'&&(n.getAttribute('datetime')!==revision.reviewedOn||n.textContent!=='14 November 2026'))throw Error('Safety source-review date changed');
 }
 const ids=[...template.content.querySelectorAll('[id]')].map(n=>n.id),nav=template.content.querySelector('nav'),details=nav?.querySelector(':scope > details'),headings=[...template.content.querySelectorAll('h2,h3')],toc=[...template.content.querySelectorAll('nav a')],slots=[...template.content.querySelectorAll('template')];
 if(ids.length!==allowedIds.size||new Set(ids).size!==allowedIds.size||ids.some(id=>!allowedIds.has(id)))throw Error('Preserve every unique safety fragment once');
 if(template.content.querySelectorAll('nav').length!==1||template.content.querySelectorAll('details').length!==1||template.content.querySelectorAll('summary').length!==1||template.content.querySelectorAll('time').length!==1||!details||nav.children.length!==1||details.children.length!==2||details.children[0].tagName!=='SUMMARY'||details.children[1].tagName!=='UL'||nav.querySelector('p,small,time,template,h2,h3'))throw Error('Only native safety contents may collapse');
 if(toc.length!==conf.toc||headings.length!==conf.toc||toc.some((a,i)=>a.getAttribute('href')!=='#'+headings[i].id)||template.content.querySelectorAll('a[href="tel:112"]').length!==1)throw Error('Complete safety contents and emergency signposting required');
 if(slots.length!==conf.photos||slots.some((n,i)=>n.attributes.length!==1||n.getAttribute('data-ktk-original-photo')!==String(i)||n.innerHTML.trim()))throw Error('Ordered original safety photo slots required');
 if(body.querySelector('form,iframe,video,script,style,input,button'))throw Error('Protected control inside safety text module');
 const photos=[...body.querySelectorAll('img')].filter(n=>!n.closest('noscript')),oldPhotos=[...source.querySelectorAll('img')].filter(n=>!n.closest('noscript'));if(photos.length!==conf.photos||oldPhotos.length!==conf.photos)throw Error('Original safety photo count changed');
 for(let i=0;i<photos.length;i++){
  const src=photos[i].getAttribute('data-lazy-src')||photos[i].getAttribute('src'),old=oldPhotos[i].getAttribute('data-lazy-src')||oldPhotos[i].getAttribute('src'),p=photos[i].closest('p');
  if(![old,'__KTK_PAGE_ASSETS__media/'+conf.files[i]].includes(src)||!p||p.textContent.trim()||[...p.querySelectorAll('img')].filter(n=>!n.closest('noscript')).length!==1||p.hasAttribute('id')||p.querySelector('[id]'))throw Error('Original safety photo identity/wrapper changed');
  const clone=p.cloneNode(true);clone.querySelectorAll('noscript,script,style').forEach(n=>n.remove());slots[i].replaceWith(clone);
 }
 const marker=body.getAttribute('data-ktk-safety-review');if(marker){if(marker!==revision.version||body.innerHTML!==template.innerHTML)throw Error('Changed reviewed safety copy');return [];}
 const text=n=>{const clone=n.cloneNode(true);clone.querySelectorAll('script,style,noscript').forEach(n=>n.remove());return clean(clone.textContent);},prepared=source.cloneNode(true);
 if(key==='post-is-krakow-safe-for-stag'){const omitted=prepared.querySelectorAll('#main-toc a[href="#whichpolishcityisbestforstagparties"]');if(omitted.length!==1||!omitted[0].closest('li')||sourceDoc.getElementById('whichpolishcityisbestforstagparties'))throw Error('Exact prior safety TOC preparation required');omitted[0].closest('li').remove();}
 if(![text(source),text(prepared)].includes(text(body))||JSON.stringify([...body.querySelectorAll('[id]')].map(n=>n.id))!==JSON.stringify(originalIds))throw Error('Original safety copy or fragments changed');
 // Validate both known source states and every photo before replacing the module.
 body.innerHTML=template.innerHTML;body.dataset.ktkSafetyReview=revision.version;
 return[{type:'practical-safety-guide-review',key,reviewedOn:revision.reviewedOn,originalUniqueFragments:new Set(originalIds).size,removedDuplicateIds:originalIds.length-new Set(originalIds).size,addedContentsTargets:conf.extra.length,retainedOriginalPhotos:conf.photos}];
}

const scope='body.ktk-code-page:is([data-ktk-page="post-is-krakow-safe-for-stag"],[data-ktk-page="post-krakow-safety-guide"]) #main-content [data-ktk-safety-review]';
const styles='/* BEGIN Practical safety guides */\n'+scope+' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n'+scope+' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n'+scope+' h2 { font-size: 22px; }\n'+scope+' h3 { font-size: 18px; }\n'+scope+' nav { margin: 1em 0; }\n'+scope+' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n'+scope+' a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }\n'+scope+' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  '+scope+' { padding-right: 24px; }\n}\n/* END Practical safety guides */\n';
export async function buildSafetyGuidesStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Reviewed article summary readability */';if(css.split(anchor).length!==2)throw Error('Stable safety-guide style anchor required');
 if(css.includes('/* BEGIN Practical safety guides */')||css.includes('/* END Practical safety guides */')){if(css.split('/* BEGIN Practical safety guides */').length!==2||css.split('/* END Practical safety guides */').length!==2||!css.includes(styles+'\n'+anchor))throw Error('Safety-guide style drift');return;}
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
