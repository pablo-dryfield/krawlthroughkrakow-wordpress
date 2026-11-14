import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const key='post-all-you-need-to-know-about-visiting-auschwitz';
const sourceSha256='80cfb9edc3e360db859377bcc39557707a034f4a563551032535aa40b5707028';
export async function loadMemorialEditorial(){
 const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');
 if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Review changed Memorial-guide capture');
 const photo=await readFile(new URL('../staging/wp-content/mu-plugins/ktk-code-pages-assets/media/e8063d1c3832-alexey-soucho-EcEFnQ2FLSo-unsplash-1080x675.jpg',import.meta.url));
 if(createHash('sha256').update(photo).digest('hex')!=='c96ad12bb3fe534196e3802b7b034440e2763514b5107b77701a1b47f43b300d')throw Error('Review changed Memorial featured photo');
 return {key,sourceSha256,sourceHtml,reviewedOn:'2026-11-14',version:'2026-11-14.memorial-1',markup:await readFile(new URL('./content/memorial-visitor-guide.html',import.meta.url),'utf8')};
}

// All targets are checked before any existing copy or the one reviewed alt is changed.
export function reviseMemorialEditorial({key,revision}){
 if(key!=='post-all-you-need-to-know-about-visiting-auschwitz')return [];
 if(revision?.key!==key||revision.sourceSha256!=='80cfb9edc3e360db859377bcc39557707a034f4a563551032535aa40b5707028'||revision.reviewedOn!=='2026-11-14'||revision.version!=='2026-11-14.memorial-1'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string')throw Error('Reviewed Memorial-guide source identity required');
 const source=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),normalize=s=>s.replace(/\s+/g,' ').trim();
 const ids=['memorial-location','memorial-entry','memorial-transport','memorial-bus','memorial-train','memorial-tour-package','memorial-duration','memorial-hours','memorial-food','memorial-photography','memorial-preparation'];
 const links=new Set(['https://visit.auschwitz.org/?lang=en','https://www.auschwitz.org/en/visiting/basic-information/','https://www.auschwitz.org/en/visiting/guided-tours-for-individual-visitors/','https://www.auschwitz.org/en/visiting/getting-to-the-museum/','https://www.auschwitz.org/en/visiting/opening-hours/','https://www.auschwitz.org/en/accessibility/','https://www.lajkonikbus.pl/krakow-oswiecim.html',...ids.map(id=>'#'+id)]);
 const nodes=[...templates.querySelectorAll('template')],seen=new Set(),pending=[];
 if(nodes.length!==12||normalize(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Complete Memorial-guide templates required');
 const allIds=[...templates.querySelectorAll('template')].flatMap(t=>[...t.content.querySelectorAll('[id]')].map(n=>n.id));
 if(allIds.length!==ids.length||new Set(allIds).size!==ids.length||allIds.some(id=>!ids.includes(id)))throw Error('Only reviewed unique Memorial heading fragments');
 for(const template of nodes){
  const index=template.getAttribute('data-target');
  if(template.attributes.length!==1||!/^([0-9]|1[01])$/.test(index)||seen.has(index))throw Error('Unexpected Memorial-guide target');seen.add(index);
  for(const n of template.content.querySelectorAll('*')){
   const attrs=n.tagName==='A'?['href']:n.tagName==='H2'?['id']:n.tagName==='NAV'?['aria-label']:n.tagName==='TIME'?['datetime']:[];
   if(!['P','H2','A','STRONG','SMALL','TIME','NAV','UL','LI'].includes(n.tagName)||[...n.attributes].some(a=>!attrs.includes(a.name)))throw Error('Unexpected Memorial-guide markup');
   if(n.tagName==='A'&&(!links.has(n.getAttribute('href'))||!normalize(n.textContent)))throw Error('Unreviewed Memorial-guide destination');
   if(n.tagName==='TIME'&&(n.getAttribute('datetime')!==revision.reviewedOn||n.textContent!=='14 November 2026'))throw Error('Unexpected Memorial review date');
   if(n.tagName==='NAV'&&n.getAttribute('aria-label')!=='Visitor guide contents')throw Error('Unexpected Memorial navigation label');
  }
  const selector='#main-content .et_pb_text_'+index+' .et_pb_text_inner',old=source.querySelectorAll(selector),current=document.querySelectorAll(selector),html=template.innerHTML.trim();
  if(old.length!==1||current.length!==1||!normalize(template.content.textContent))throw Error('Missing or ambiguous Memorial-guide module');
  const target=current[0],review=target.getAttribute('data-ktk-memorial-review');
  if(review){if(review!==revision.reviewedOn||target.innerHTML!==html)throw Error('Changed reviewed Memorial-guide copy');}
  else if(target.querySelector('img,svg,iframe,script,style,form,input,button,[id],a[name]')||normalize(target.textContent)!==normalize(old[0].textContent))throw Error('Review changed original Memorial-guide module');
  if(Number(index)>0&&(template.content.querySelectorAll('h2').length!==1||template.content.querySelector('h2').id!==ids[Number(index)-1]||normalize(template.content.querySelector('h2').textContent)!==normalize(old[0].querySelector('h2')?.textContent||'')))throw Error('Preserve original Memorial section identities');
  pending.push({index,target,html});
 }
 const photos=document.querySelectorAll('#main-content .et_post_meta_wrapper > img'),originalPhotos=source.querySelectorAll('#main-content .et_post_meta_wrapper > img');
 const alt='Person walking beside railway tracks towards a brick gate building under a cloudy sky.';
 if(photos.length!==1||originalPhotos.length!==1)throw Error('Review changed Memorial featured photo count');
 const originalSource=originalPhotos[0].getAttribute('data-lazy-src')||originalPhotos[0].getAttribute('src'),currentSource=photos[0].getAttribute('data-lazy-src')||photos[0].getAttribute('src');
 if(!['__KTK_PAGE_ASSETS__media/e8063d1c3832-alexey-soucho-EcEFnQ2FLSo-unsplash-1080x675.jpg',originalSource].includes(currentSource)||![originalPhotos[0].getAttribute('alt'),alt].includes(photos[0].getAttribute('alt')))throw Error('Review changed Memorial featured photo identity/alt');
 const maps=document.querySelectorAll('#main-content .et_pb_map_0'),directions=document.querySelectorAll('#main-content [data-ktk-memorial-directions]');
 const replacement=document.createElement('p');replacement.className='et_pb_module ktk-memorial-directions';replacement.dataset.ktkMemorialDirections=revision.reviewedOn;
 const link=document.createElement('a');link.href='https://www.auschwitz.org/en/visiting/getting-to-the-museum/';link.textContent="View the Memorial's current directions and entrance map";replacement.append(link);
 if(maps.length===1&&!directions.length){
  const children=maps[0].querySelectorAll('*'),map=children[0];
  if(children.length!==1||map.tagName!=='DIV'||map.className!=='et_pb_map'||normalize(map.textContent)||map.getAttribute('data-center-lat')!=='50.0274106'||map.getAttribute('data-center-lng')!=='19.2019829'||map.getAttribute('data-zoom')!=='13'||maps[0].querySelector('iframe,img,form,script'))throw Error('Review changed empty Memorial map module');
 }else if(maps.length||directions.length!==1||directions[0].outerHTML!==replacement.outerHTML)throw Error('Review changed Memorial directions replacement');
 for(const {target,html}of pending){target.innerHTML=html;target.dataset.ktkMemorialReview=revision.reviewedOn;}
 photos[0].setAttribute('alt',alt);
 if(maps.length)maps[0].replaceWith(replacement);
 return pending.map(({index})=>({type:'reviewed-Memorial-visitor-copy',module:Number(index),reviewedOn:revision.reviewedOn}));
}

export async function buildMemorialStyles(file){
 const start='/* BEGIN Memorial visitor guide */',end='/* END Memorial visitor guide */',original=await readFile(file,'utf8');let base=original;
 const a=original.indexOf(start),b=original.indexOf(end);
 if((a<0)!==(b<0)||a>=0&&(a!==0||b<a||original.indexOf(start,a+1)>=0||original.indexOf(end,b+1)>=0))throw Error('Malformed Memorial styles');
 if(a>=0)base=original.slice(b+end.length).replace(/^\n\n/,'');
 const css='@media (max-width: 600px) {\n  body.ktk-code-page[data-ktk-page="post-all-you-need-to-know-about-visiting-auschwitz"] #main-content [data-ktk-memorial-review],\n  body.ktk-code-page[data-ktk-page="post-all-you-need-to-know-about-visiting-auschwitz"] #main-content [data-ktk-memorial-directions] {\n    padding-right: 24px;\n  }\n}';
 await writeFile(file,start+'\n'+css+'\n'+end+'\n\n'+base);
}
