import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const key='post-krakow-new-years-eve',identity='29ed98a37bb9da5abf4c0b8d0c540e27f5919d16fc9f5fa390a386d94d9a2729';
export async function loadEstablishedNyeEditorial(){
 const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');
 if(createHash('sha256').update(sourceHtml).digest('hex')!==identity)throw Error('Review changed established NYE source');
 return {key,sourceSha256:identity,sourceHtml,reviewedOn:'2026-11-14',version:'2026-11-14.established-nye-1',markup:await readFile(new URL('./content/established-nye-guide.html',import.meta.url),'utf8')};
}
export function reviseEstablishedNyeEditorial({key,revision}){
 if(key!=='post-krakow-new-years-eve')return [];
 if(revision?.key!==key||revision.sourceSha256!=='29ed98a37bb9da5abf4c0b8d0c540e27f5919d16fc9f5fa390a386d94d9a2729'||revision.reviewedOn!=='2026-11-14'||revision.version!=='2026-11-14.established-nye-1'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string')throw Error('Reviewed established NYE identity required');
 const clean=s=>(s||'').replace(/\s+/g,' ').trim(),source=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html');
 const parts=[...templates.querySelectorAll('template')],seen=new Set(),pending=[];
 const links=new Set(['__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__wheres-the-cheap-places-to-drink-in-krakow/','__KTK_HOME_URL__new-years-eve/','__KTK_HOME_URL__about-us/how-to-join/','__KTK_HOME_URL__contact/','https://opera.krakow.pl/en/repertoire','https://krakow.travel/en','https://mpk.krakow.pl/en/timetables','https://kiermasze.com.pl/','https://bialkatatrzanska.pl/en/resort-map/','https://www.pkl.pl/kasprowy-wierch/koleje-i-trasy.html?setlang=2']);
 if(parts.length!==5||clean(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Five complete established NYE parts required');
 for(const part of parts){
  const index=part.getAttribute('data-target');if(part.attributes.length!==1||!/[0-4]/.test(index)||index.length!==1||seen.has(index))throw Error('Unreviewed established NYE target');seen.add(index);
  for(const node of part.content.querySelectorAll('*')){
   if(!['H1','H2','P','A','STRONG'].includes(node.tagName)||[...node.attributes].some(a=>node.tagName!=='A'||a.name!=='href')||node.tagName==='A'&&(!links.has(node.getAttribute('href'))||!clean(node.textContent)))throw Error('Unreviewed established NYE markup or destination');
  }
  const selector='#main-content .et_pb_text_'+index+' .et_pb_text_inner',old=source.querySelectorAll(selector),targets=document.querySelectorAll(selector);
  if(old.length!==1||targets.length!==1||!clean(part.content.textContent))throw Error('Missing or ambiguous established NYE module');
  const target=targets[0],oldHeadings=[...old[0].querySelectorAll('h1,h2,h3,h4,h5,h6')],currentHeadings=[...target.querySelectorAll('h1,h2,h3,h4,h5,h6')],newHeadings=[...part.content.querySelectorAll('h1,h2')];
  if(oldHeadings.length!==currentHeadings.length||oldHeadings.length!==newHeadings.length)throw Error('Preserve established NYE heading count');
  for(let i=0;i<oldHeadings.length;i++){
   const original=oldHeadings[i],current=currentHeadings[i],origin=current.getAttribute('data-ktk-heading-origin')||current.tagName.toLowerCase(),copy=document.createElement(original.tagName);
   for(const a of current.attributes)if(a.name!=='data-ktk-heading-origin')copy.setAttribute(a.name,a.value);copy.innerHTML=current.innerHTML;
   if(origin!==original.tagName.toLowerCase()||copy.outerHTML!==original.outerHTML||clean(newHeadings[i].textContent)!==clean(original.textContent))throw Error('Preserve exact established NYE heading identity');
   let retained=current.cloneNode(true);const desired=index==='0'&&i===0?'H1':'H2';
   if(retained.tagName!==desired){const replacement=document.createElement(desired);for(const a of retained.attributes)replacement.setAttribute(a.name,a.value);replacement.dataset.ktkHeadingOrigin=original.tagName.toLowerCase();replacement.append(...retained.childNodes);retained=replacement;}
   newHeadings[i].replaceWith(retained);
  }
  const html=part.innerHTML.trim(),review=target.getAttribute('data-ktk-established-nye-review');
  if(review){if(review!==revision.reviewedOn||target.innerHTML!==html)throw Error('Changed reviewed established NYE copy');}
  else{
   const corrected=old[0].cloneNode(true);if(index==='4'){
    const paragraphs=[...corrected.querySelectorAll('p')].filter(n=>n.textContent.trim().startsWith('The best part though? Ski passes'));
    if(paragraphs.length!==1)throw Error('Original established NYE ski correction missing');
    paragraphs[0].textContent='Check current lift-pass prices, snow conditions and transport with the resort before planning a ski day. Prices and opening dates vary; an old price comparison is not a current quote.';
   }
   if(target.querySelector('img,svg,iframe,script,style,form,input,button,[id],a[name]')||![clean(old[0].textContent),clean(corrected.textContent)].includes(clean(target.textContent)))throw Error('Review changed original established NYE copy');
  }
  pending.push({index,target,html});
 }
 // No partial edit if a late section or a retained heading has drifted.
 for(const {target,html}of pending){target.innerHTML=html;target.dataset.ktkEstablishedNyeReview=revision.reviewedOn;}
 return pending.map(({index})=>({type:'established-NYE-guide-review',module:Number(index),reviewedOn:revision.reviewedOn}));
}
const styles='/* BEGIN Established NYE guide */\n@media (max-width: 600px) {\n  body.ktk-code-page[data-ktk-page="post-krakow-new-years-eve"] #main-content [data-ktk-established-nye-review] { padding-right: 24px; }\n}\nbody.ktk-code-page[data-ktk-page="post-krakow-new-years-eve"] #main-content [data-ktk-established-nye-review] a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }\n/* END Established NYE guide */\n';
export async function buildEstablishedNyeStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Contact details */';if(css.split(anchor).length!==2)throw Error('Stable established NYE insertion anchor required');
 if(css.includes('/* BEGIN Established NYE guide */')||css.includes('/* END Established NYE guide */')){
  if(css.split('/* BEGIN Established NYE guide */').length!==2||css.split('/* END Established NYE guide */').length!==2||!css.includes(styles+'\n'+anchor))throw Error('Established NYE styles changed or misplaced');return;
 }
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
