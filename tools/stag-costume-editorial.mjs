import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const key='post-stag-do-costume',identity='258c1f7336f42665f685b4d240dfd1e53cb8d078ebf51199784fb67e8a5b4615';
export async function loadStagCostumeEditorial(){
 const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');if(createHash('sha256').update(sourceHtml).digest('hex')!==identity)throw Error('Costume source capture changed');
 return {key,sourceSha256:identity,sourceHtml,reviewedOn:'2026-11-14',version:'2026-11-14.stag-costume-1',markup:await readFile(new URL('./content/stag-costume-guide.html',import.meta.url),'utf8')};
}

export function reviseStagCostumeEditorial({key,revision}){
 if(key!=='post-stag-do-costume')return [];
 if(revision?.key!==key||revision.sourceSha256!=='258c1f7336f42665f685b4d240dfd1e53cb8d078ebf51199784fb67e8a5b4615'||revision.version!=='2026-11-14.stag-costume-1'||revision.reviewedOn!=='2026-11-14'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string')throw Error('Reviewed costume identity required');
 const original=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),bodies=main?.querySelectorAll('.entry-content'),sourceBodies=original.querySelectorAll('#main-content .entry-content');
 if(bodies?.length!==1||sourceBodies.length!==1||main.querySelector('h1.entry-title')?.textContent.trim()!=='Krakow Stag Do: Unleashing Fun with Creative Stag Do Costume Ideas'||main.querySelector('.published')?.textContent.trim()!=='Mar 18, 2024')throw Error('Original costume publication identity required');
 const body=bodies[0],source=sourceBodies[0],review=body.getAttribute('data-ktk-costume-review'),template=document.createElement('template');template.innerHTML=revision.markup;
 const ids='main-toc|thethrillofstagpartycostumes|alltogethernowgroupthemesrule|beyondchucklesbuildingbondsthroughbanter|thesignificanceofthegroomscostume|theweddingdressphenomenon|popularstagpartycostumechoices|morphsuitsmadness|superheroshenanigans|unconventionalstagpartycostumes|ladyboylaughsunleashingyourinnerdiva|animalcostumeswildfunonyourstagweekend|customizedtshirtsasimpleyeteffectivechoice|themagictouchofpersonalization|creatingyourownuniquestagdocostume|craftingcomfortablecostumes|tipsforcraftinganunforgettableoutfit|howtochoosetherightcostumeforyourstagdo|pickingoutfitsbasedonthemeslocations|faqsinrelationtostagdocostume|whatdoyouweartoastagdo|whatisthepointofstagdo|whatisthehistoryofthestagparty|conclusion'.split('|');
 const allowedIds=new Set([...ids,...ids.slice(1).map(id=>id+'-toc'),'64d4b9d8ef643_103602','64d4b9d8ef647_103602']);
 const links=new Set([...ids.slice(1).map(id=>'#'+id),'__KTK_HOME_URL__faqs/','__KTK_HOME_URL__krakow-stag-do/','__KTK_HOME_URL__about-us/how-to-join/']);
 for(const node of template.content.querySelectorAll('*')){
  const attrs=node.tagName==='A'?['id','href']:['H2','H3','H4','SUMMARY','UL'].includes(node.tagName)?['id']:node.tagName==='NAV'?['aria-label']:node.tagName==='TIME'?['datetime']:node.tagName==='TEMPLATE'?['data-ktk-original-photo']:[];
  if(!['P','SMALL','TIME','NAV','DETAILS','SUMMARY','UL','LI','H2','H3','H4','A','TEMPLATE'].includes(node.tagName)||[...node.attributes].some(a=>!attrs.includes(a.name)))throw Error('Unreviewed costume markup');
  if(node.tagName==='A'&&(!links.has(node.getAttribute('href'))||!node.textContent.trim()))throw Error('Unreviewed costume destination');
  if(node.tagName==='NAV'&&node.getAttribute('aria-label')!=='Costume guide contents')throw Error('Costume contents label changed');
  if(node.tagName==='TIME'&&(node.getAttribute('datetime')!==revision.reviewedOn||node.textContent!=='14 November 2026'))throw Error('Costume review date changed');
 }
 const newIds=[...template.content.querySelectorAll('[id]')].map(n=>n.id),slots=[...template.content.querySelectorAll('template')],toc=[...template.content.querySelectorAll('nav a')];
 const nav=template.content.querySelector('nav'),details=nav?.querySelector(':scope > details');
 if(newIds.length!==allowedIds.size||new Set(newIds).size!==allowedIds.size||newIds.some(id=>!allowedIds.has(id)))throw Error('Preserve all original unique costume fragments');
 if(template.content.querySelectorAll('nav').length!==1||template.content.querySelectorAll('details').length!==1||template.content.querySelectorAll('summary').length!==1||template.content.querySelector('summary')?.id!=='main-toc'||template.content.querySelectorAll('time').length!==1||toc.length!==23||toc.some(n=>n.id!==n.getAttribute('href').slice(1)+'-toc'||!template.content.querySelector('#'+n.getAttribute('href').slice(1))))throw Error('Complete native costume contents required');
 if(!details||nav.children.length!==1||details.children.length!==2||details.children[0].tagName!=='SUMMARY'||details.children[1].tagName!=='UL'||nav.querySelector('p,small,time,template,h2,h3,h4')||template.content.querySelectorAll('h2,h3,h4').length!==23)throw Error('Only the contents list may be collapsed, not article sections');
 if(slots.length!==9||slots.some((n,i)=>n.attributes.length!==1||n.getAttribute('data-ktk-original-photo')!==String(i)||n.innerHTML.trim()))throw Error('Nine ordered original costume photograph slots required');
 if(body.querySelector('form,iframe,video,script,style,input,button'))throw Error('Protected content inside costume article');
 const photos=[...body.querySelectorAll('img')].filter(n=>!n.closest('noscript')),sourcePhotos=[...source.querySelectorAll('img')].filter(n=>!n.closest('noscript'));
 const files=['378ca4590b7f-1691672396_saksham-gangwar-YVgOh8w1R4s-unsplash.jpg','e9dc4ef2dd0b-1691672760_stem-list--Ba2BMyleDU-unsplash_20_1_.jpg','12c75fd34aaa-1691673048_ali-choubin-4ZXv-tRsaDA-unsplash_20_1_.jpg','f8031edc6da2-1691674678_viktor-forgacs-KqehHSPhcds-unsplash.jpg','0ed761b37f8b-1691673238_marjan-blan-8I-ht65iRww-unsplash.jpg','614710a3cf51-1691673358_jesus-boscan-uk078sotWrc-unsplash.jpg','97d0bbe86fb2-1691673499_sara-kurfess-cZT2PkicNn0-unsplash.jpg','608ab3ba3034-1691673839_ashley-nicole-7cfwMS9dItg-unsplash.jpg','bf7b6c5312e7-1691674056_ali-barzegarahmadi-nm4DIW7F-dU-unsplash.jpg'];
 if(photos.length!==9||sourcePhotos.length!==9)throw Error('Original costume photograph count changed');
 for(let i=0;i<9;i++){
  const src=photos[i].getAttribute('data-lazy-src')||photos[i].getAttribute('src'),original=sourcePhotos[i].getAttribute('data-lazy-src')||sourcePhotos[i].getAttribute('src');if(![original,'__KTK_PAGE_ASSETS__media/'+files[i]].includes(src))throw Error('Original costume photograph identity changed');
  const paragraph=document.createElement('p');paragraph.append(photos[i].cloneNode(true));slots[i].replaceWith(paragraph);
 }
 if(review){if(review!==revision.version||body.innerHTML!==template.innerHTML)throw Error('Changed reviewed costume article');return [];}
 const cleanBody=n=>{const clone=n.cloneNode(true);clone.querySelectorAll('script,style,noscript').forEach(e=>e.remove());return clone.textContent.replace(/\s+/g,' ').trim();};
 const actualIds=[...body.querySelectorAll('[id]')].map(n=>n.id),counts=new Map();actualIds.forEach(id=>counts.set(id,(counts.get(id)||0)+1));
 if(cleanBody(body)!==cleanBody(source)||actualIds.length!==57||counts.size!==49||[...allowedIds].some(id=>counts.get(id)!==(id==='64d4b9d8ef647_103602'?9:1)))throw Error('Original costume copy or fragment inventory changed');
 // All copy, photograph identities, fragments and controls are validated before the swap.
 body.innerHTML=template.innerHTML;body.dataset.ktkCostumeReview=revision.version;
 return [{type:'reviewed-stag-costume-guide',reviewedOn:revision.reviewedOn,preservedUniqueFragments:49,retainedOriginalPhotos:9,removedDuplicateIds:8}];
}

const focusRule='body.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n';
const initialStyles='/* BEGIN Stag costume guide */\nbody.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] nav { margin: 1em 0; }\nbody.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] summary { cursor: pointer; font-weight: 700; }\nbody.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }\n@media (max-width: 600px) {\n  body.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] { padding-right: 24px; }\n}\n/* END Stag costume guide */\n';
const focusedStyles=initialStyles.replace('@media (max-width: 600px)',focusRule+'@media (max-width: 600px)');
const typeRules='body.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] { font-size: 16px; line-height: 1.65; letter-spacing: 0; }\nbody.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] :is(h2,h3,h4) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\nbody.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] h2 { font-size: 22px; }\nbody.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] h3 { font-size: 18px; }\nbody.ktk-code-page[data-ktk-page="post-stag-do-costume"] #main-content [data-ktk-costume-review] h4 { font-size: 16px; }\n';
const styles=focusedStyles.replace('/* BEGIN Stag costume guide */\n','/* BEGIN Stag costume guide */\n'+typeRules);
export async function buildStagCostumeStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Group planning */';if(css.split(anchor).length!==2)throw Error('Stable costume style anchor required');
 if(css.includes('/* BEGIN Stag costume guide */')||css.includes('/* END Stag costume guide */')){
  if(css.split('/* BEGIN Stag costume guide */').length!==2||css.split('/* END Stag costume guide */').length!==2)throw Error('Costume style drift');
  if(css.includes(styles+'\n'+anchor))return;
  const known=[initialStyles,focusedStyles].find(version=>css.includes(version+'\n'+anchor));if(known){await writeFile(file,css.replace(known,styles));return;}
  throw Error('Costume style drift');
 }
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
