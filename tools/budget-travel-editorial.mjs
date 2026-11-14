import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts,offerTemplateValues} from './site-offer-facts.mjs';

export async function loadBudgetTravelEditorial(){
 const definitions=[['post-krakow-free-activities-2','free','c8371787f7b9071df572de5fd38c408a04a2591da8965ed1f20d880b0e3d4aa0'],['post-krakow-budget-activities','budget','85a03c9f6a40916954fc07a417efd89a3192324941d5489bb766242df3137320'],['post-krakow-money-saving-tips','money','b894538c8b2ec8a60bf06a4eef994f54536eb430da762210598d604c88c251aa']],rows=[],facts=offerTemplateValues(await loadOfferFacts());
 for(const [key,file,sourceSha256]of definitions){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Original budget-travel capture changed');
  const markup=(await readFile(new URL('./content/travel-'+file+'.html',import.meta.url),'utf8')).replace(/\{\{([A-Za-z]+)\}\}/g,(_,name)=>{if(!['minimumAge','cashReturnInstructions','onlineReturnInstructions'].includes(name))throw Error('Unreviewed budget-travel fact');return facts[name];});if(/[{}]/.test(markup))throw Error('Unresolved budget-travel fact');
  rows.push({key,sourceSha256,sourceHtml,markup,reviewedOn:'2026-11-14',version:'2026-11-14.budget-travel-1'});
 }
 return rows;
}

export function reviseBudgetTravelEditorial({key,revision}){
 const definitions={
  'post-krakow-free-activities-2':{sha:'c8371787f7b9071df572de5fd38c408a04a2591da8965ed1f20d880b0e3d4aa0',rawIds:54,uniqueIds:48,targets:22,label:'Free activities guide contents',technical:['64942a8912ae6_58152','64942a8912ae8_58152'],files:['f55b798c77fa-1681918726_greg-trowman-Gk9WFLxepJA-unsplash.jpg','0caeb91b3fa6-1687439407_1687439404405.png','8de79fcb83a2-1681913480_gabriella-bortolussi-JK09P6ofbWc-unsplash.jpeg','90e7df10d88e-1681916137_grafi-jeremiah-t0q7NwAjDlg-unsplash.jpg','479bb2f9ad5d-1681915176_1681915175294.png','dbf3c0ce15da-1681915318_1681915316550.png']},
  'post-krakow-budget-activities':{sha:'85a03c9f6a40916954fc07a417efd89a3192324941d5489bb766242df3137320',rawIds:61,uniqueIds:55,targets:26,label:'Budget activities guide contents',technical:['64982420dd2ac_64577','64982420dd2af_64577'],files:['bd536e8bf17c-1687692877_1687692872927.png','8fdab52a7a5a-1687693126_1687693122265.png','42209ec555a6-1687693425_1687693421964.png','14887bdcfa9a-1687693779_1687693775656.png','d651048f6cb6-1687693604_1687693601530.png','dc62cc6dc470-1687694752_1687694749166.png','75ac98383b6f-1687694709_1687694706244.png','8935f18a4dfc-1687694343_1687694338494.png']},
  'post-krakow-money-saving-tips':{sha:'b894538c8b2ec8a60bf06a4eef994f54536eb430da762210598d604c88c251aa',rawIds:45,uniqueIds:42,targets:19,label:'Money saving guide contents',technical:['64944ce7a584b_64107','64944ce7a584d_64107'],files:['baf6ce1c4c21-1683482317_1683482316508.png','ff7a942c9b8e-1683482470_1683482468289.png','6e4cabc3cbe8-1683482649_1683482645861.png','7b87340ba77b-1683483134_1683483131399.png','a2bc61f3fcfb-1683483469_1683483465879.png','4fa4118211dc-1683485316_1683485313828.png','f0a162d5bc6b-1683484440_1683484436215.png']}
 };
 if(!Object.hasOwn(definitions,key))return [];
 const conf=definitions[key];if(revision?.key!==key||revision.sourceSha256!==conf.sha||revision.version!=='2026-11-14.budget-travel-1'||revision.reviewedOn!=='2026-11-14'||typeof revision.sourceHtml!=='string'||typeof revision.markup!=='string')throw Error('Reviewed budget-travel identity required');
 const sourceDoc=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),original=sourceDoc.querySelector('#main-content'),bodies=main?.querySelectorAll('.entry-content'),sources=original?.querySelectorAll('.entry-content'),clean=s=>(s||'').replace(/\s+/g,' ').trim();
 if(bodies?.length!==1||sources?.length!==1||!clean(original.querySelector('h1.entry-title')?.textContent)||clean(main.querySelector('h1.entry-title')?.textContent)!==clean(original.querySelector('h1.entry-title')?.textContent)||!clean(original.querySelector('.published')?.textContent)||clean(main.querySelector('.published')?.textContent)!==clean(original.querySelector('.published')?.textContent))throw Error('Original budget-travel publication required');
 const body=bodies[0],source=sources[0],originalIds=[...source.querySelectorAll('[id]')].map(n=>n.id),unique=new Set(originalIds),originalTargets=[...source.querySelectorAll('h2,h3')].filter(n=>n.id!=='main-toc');
 if(originalIds.length!==conf.rawIds||unique.size!==conf.uniqueIds||originalTargets.length!==conf.targets||body.querySelector('form,iframe,video,script,style,input,button,.et_pb_text_inner'))throw Error('Original budget-travel structure changed');
 const template=document.createElement('template');template.innerHTML=revision.markup;
 const links=new Set(['__KTK_HOME_URL__','__KTK_HOME_URL__about-us/how-to-join/','__KTK_HOME_URL__store2/pub-crawl-28/#book','__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__wheres-the-cheap-places-to-drink-in-krakow/','__KTK_HOME_URL__krakow-live-music/','__KTK_HOME_URL__krakow-free-activities-2/','__KTK_HOME_URL__krakow-budget-activities/','__KTK_HOME_URL__krakow-money-saving-tips/','https://wawel.krakow.pl/en/explore','https://wawel.krakow.pl/en/free-november-2026','https://www.katedra-wawelska.pl/en/katedra-wawelska/zaplanuj-wizyte/','https://muzeumkrakowa.pl/en/branches/rynek-underground','https://mariacki.com/en/tours-of-the-basilica/','https://mariacki.com/en/st-marys-basilica/st-marys-towers/','https://www.krakow.pl/instcbi/306312/inst/144486/2751/Planty-krakowskie.html','https://www.starykleparz.com/','https://ztp.krakow.pl/en/kmk-public-transport/kmk-ticket-guide','https://krakowairport.pl/en/passenger/transporten/directions/from-to-krakow-airport','https://krakowairport.pl/en/passenger/transport-en/directions/from-to-krakow-airport/train-en/en','https://ztp.krakow.pl/rower/lajkbike','https://ztp.krakow.pl/rower/park-e-bike']);
 links.add('https://www.krakow.pl/turystyka/1218,artykul,droga-krolewska.html');
 for(const n of template.content.querySelectorAll('*')){
  const attrs=n.tagName==='A'?['href']:['P','H2','H3'].includes(n.tagName)?['id']:n.tagName==='TIME'?['datetime']:n.tagName==='TEMPLATE'?['data-ktk-original-photo','data-ktk-original-contents']:[];
  if(!['P','SMALL','TIME','H2','H3','A','UL','LI','TEMPLATE'].includes(n.tagName)||[...n.attributes].some(a=>!attrs.includes(a.name)))throw Error('Unreviewed budget-travel markup');
  if(n.tagName==='A'&&(!links.has(n.getAttribute('href'))||!clean(n.textContent)))throw Error('Unreviewed budget-travel destination');
  if(n.tagName==='TIME'&&(n.getAttribute('datetime')!==revision.reviewedOn||n.textContent!=='14 November 2026'))throw Error('Budget-travel review date changed');
 }
 const times=template.content.querySelectorAll('time'),navSlots=[...template.content.querySelectorAll('template[data-ktk-original-contents]')],slots=[...template.content.querySelectorAll('template[data-ktk-original-photo]')];
 if(times.length!==1||navSlots.length!==1||navSlots[0].attributes.length!==1||navSlots[0].getAttribute('data-ktk-original-contents')!==''||navSlots[0].innerHTML.trim()||slots.length!==conf.files.length||slots.some((n,i)=>n.attributes.length!==1||n.getAttribute('data-ktk-original-photo')!==String(i)||n.innerHTML.trim())||template.content.querySelectorAll('template').length!==slots.length+1)throw Error('Exact ordered photo and native contents slots required');
 const nav=document.createElement('nav'),details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');nav.setAttribute('aria-label',conf.label);nav.id=conf.technical[0];details.id=conf.technical[1];summary.id='main-toc';summary.textContent='Contents';details.append(summary,list);nav.append(details);
 for(const heading of originalTargets){
  const target=[...template.content.querySelectorAll('[id]')].filter(n=>n.id===heading.id);if(target.length!==1||!['H2','H3','P'].includes(target[0].tagName)||!clean(target[0].textContent)||!unique.has(heading.id+'-toc'))throw Error('Every original budget topic must remain a native target');
  const li=document.createElement('li'),a=document.createElement('a');a.id=heading.id+'-toc';a.setAttribute('href','#'+heading.id);a.textContent=target[0].tagName==='P'?'Plan an outdoor-first day':clean(target[0].textContent);li.append(a);list.append(li);
 }
 navSlots[0].replaceWith(nav);
 const ids=[...template.content.querySelectorAll('[id]')].map(n=>n.id);if(ids.length!==unique.size||new Set(ids).size!==unique.size||ids.some(id=>!unique.has(id)))throw Error('Every unique original budget fragment must remain once');
 const photos=[...body.querySelectorAll('img')].filter(n=>!n.closest('noscript')),oldPhotos=[...source.querySelectorAll('img')].filter(n=>!n.closest('noscript'));if(photos.length!==conf.files.length||oldPhotos.length!==photos.length)throw Error('Original budget photo count changed');
 for(let i=0;i<photos.length;i++){
  const n=photos[i],old=oldPhotos[i],src=n.dataset.lazySrc||n.getAttribute('src'),oldSrc=old.dataset.lazySrc||old.getAttribute('src'),p=n.closest('p'),oldP=old.closest('p'),a=n.closest('a'),oldA=old.closest('a'),portable='__KTK_PAGE_ASSETS__media/'+conf.files[i];
  if(![oldSrc,portable].includes(src)||!p||!oldP||p.textContent.trim()||oldP.textContent.trim()||p.hasAttribute('id')||p.querySelector('[id]')||[...p.querySelectorAll('img')].filter(n=>!n.closest('noscript')).length!==1||!!a!==!!oldA||a&&![oldA.getAttribute('href'),portable].includes(a.getAttribute('href'))||[...p.querySelectorAll('*')].some(n=>!['A','IMG','NOSCRIPT'].includes(n.tagName)))throw Error('Original budget photo identity or wrapper changed');
  const clone=p.cloneNode(true);clone.querySelectorAll('noscript').forEach(n=>n.remove());slots[i].replaceWith(clone);
 }
 const marker=body.getAttribute('data-ktk-budget-travel-review');if(marker){if(marker!==revision.version||body.innerHTML!==template.innerHTML)throw Error('Changed reviewed budget-travel copy');return [];}
 const text=n=>{const c=n.cloneNode(true);c.querySelectorAll('script,style,noscript').forEach(n=>n.remove());return clean(c.textContent);};
 if(text(body)!==text(source)||JSON.stringify([...body.querySelectorAll('[id]')].map(n=>n.id))!==JSON.stringify(originalIds))throw Error('Original budget-travel copy or fragments changed');
 // Validate the complete replacement and all media before changing the live body.
 body.innerHTML=template.innerHTML;body.dataset.ktkBudgetTravelReview=revision.version;
 return[{type:'budget-travel-guide-review',key,reviewedOn:revision.reviewedOn,retainedOriginalPhotos:photos.length,originalUniqueFragments:unique.size,removedDuplicateIds:originalIds.length-unique.size,nativeContentsTargets:conf.targets}];
}

const scope='body.ktk-code-page:is([data-ktk-page="post-krakow-free-activities-2"],[data-ktk-page="post-krakow-budget-activities"],[data-ktk-page="post-krakow-money-saving-tips"]) #main-content [data-ktk-budget-travel-review]';
const styles='/* BEGIN Practical budget travel guides */\n'+scope+' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n'+scope+' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n'+scope+' h2 { font-size: 22px; }\n'+scope+' h3 { font-size: 18px; }\n'+scope+' nav { margin: 1em 0; }\n'+scope+' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n'+scope+' a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }\n'+scope+' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  '+scope+' { padding-right: 24px; }\n}\n/* END Practical budget travel guides */\n';
export async function buildBudgetTravelStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Optional games resource guidance */';if(css.split(anchor).length!==2)throw Error('Stable budget-travel style anchor required');
 if(css.includes('/* BEGIN Practical budget travel guides */')||css.includes('/* END Practical budget travel guides */')){if(css.split('/* BEGIN Practical budget travel guides */').length!==2||css.split('/* END Practical budget travel guides */').length!==2||!css.includes(styles+'\n'+anchor))throw Error('Budget-travel style drift');return;}
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
