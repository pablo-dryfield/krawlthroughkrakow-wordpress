import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadSecondaryNyeEditorial(){
 const raw=await readFile(new URL('./secondary-nye-editorial.json',import.meta.url));
 if(createHash('sha256').update(raw).digest('hex')!=='3a28375883a83c6df346c06afc427655479a5b0ac13baf8acbdce389d466d98f')throw Error('Exact reviewed secondary NYE source required');
 const r=JSON.parse(raw);
 if(r.schemaVersion!==1||r.key!=='post-new-years-eve-in-krakow'||r.route!=='/new-years-eve-in-krakow/'||r.version!=='2026-11-17.secondary-nye-1'||r.reviewedOn!=='2026-11-17'||r.sourceCommit!=='4bd859fac27ef8829e502a638d70560bbab24682'||r.replacements.length!==37||r.readingSlots?.length!==19||r.photos.length!==10||r.headingRole?.text!=='How do Polish people celebrate New Year?'||createHash('sha256').update(r.preparedHtml).digest('hex')!==r.preparedSha256)throw Error('Exact holiday-guide identity, slots and photos required');
 for(const p of r.photos){if(createHash('sha256').update(await readFile(new URL('../'+p.local,import.meta.url))).digest('hex')!==p.sha256||typeof p.afterAlt!=='string'||!p.afterAlt||p.afterAlt.length>160)throw Error('Reviewed holiday photo bytes and neutral description required');}
 const presentation=JSON.parse(await readFile(new URL('./reviewed-article-presentation.json',import.meta.url),'utf8'));
 if(presentation.articles.find(a=>a.key===r.key)?.summary!==r.retainedSummary.summary||r.retainedSummary.containers.length!==3)throw Error('Exact four retained matching summary/teaser slots required');
 return r;
}

export function reviseSecondaryNyeEditorial({key,revision:r,sourceReference=false}){
 if(key!=='post-new-years-eve-in-krakow')return [];
 if(r?.key!==key||r.version!=='2026-11-17.secondary-nye-1'||typeof r.preparedHtml!=='string'||r.replacements?.length!==37||r.readingSlots?.length!==19||r.photos?.length!==10||typeof r.galleryContext!=='string'||r.headingRole?.text!=='How do Polish people celebrate New Year?'||typeof r.headingRole.before!=='string'||typeof r.headingRole.after!=='string'||typeof sourceReference!=='boolean')throw Error('Exact reviewed secondary NYE revision required');
 const main=document.querySelector('#main-content'),reference=new DOMParser().parseFromString(r.preparedHtml,'text/html').querySelector('#main-content');
 if(!main||!reference||document.querySelectorAll('#main-content').length!==1||reference.querySelectorAll('article#post-7506 > .entry-content').length!==1||reference.hasAttribute('data-ktk-secondary-nye-review'))throw Error('One original holiday-guide main and article required');
 const clean=s=>(s||'').replace(/\s+/g,' ').trim(),normalize=s=>(s||'').replace(/^https:\/\/krawlthroughkrakow\.com\//,'__KTK_HOME_URL__'),slotFacts=n=>({tag:n.tagName,text:clean(n.textContent),ids:[n,...n.querySelectorAll('[id]')].filter(n=>n.id).map(n=>n.id),links:[...n.querySelectorAll('a')].map(a=>[normalize(a.getAttribute('href')),a.textContent])});
 const allowed=new Set(['__KTK_HOME_URL__krakow-new-years-eve/','__KTK_HOME_URL__new-years-eve/','https://mariacki.com/en/tourists/','https://krakow.pl/aktualnosci/345994%2C33%2Ckomunikat%2Ckiermasz_bozonarodzeniowy_wraca_na_maly_rynek__swieta_wsrod_krakowskich_tradycji_i_rekodziela.html']);
 const apply=(root,semantic)=>{
  const inverses=[],slots=new Map(['.entry-content p','.entry-content li'].map(s=>[s,[...root.querySelectorAll(s)]])),seen=new Set();
  for(const t of r.replacements){
   if(!slots.has(t.selector)||!Number.isSafeInteger(t.index)||t.index<0||seen.has(t.selector+'/'+t.index)||typeof t.before!=='string'||typeof t.after!=='string')throw Error('Exact distinct original holiday prose slot required');seen.add(t.selector+'/'+t.index);
   const n=slots.get(t.selector)[t.index],old=new DOMParser().parseFromString(t.before,'text/html').body.firstElementChild,template=document.createElement('template');template.innerHTML=t.after;const p=template.content.firstElementChild;
   if(!n||!old||n.querySelector('img,iframe,form,script,style,video,input,button')||n.closest('.ktk-embed-fallback,[data-ktk-embed-fallback],[data-ktk-embed-alternative]')||n.hasAttribute('id')||n.querySelector('[id]')||(!semantic?n.outerHTML!==t.before:JSON.stringify(slotFacts(n))!==JSON.stringify(slotFacts(old))))throw Error('Original holiday prose changed before mutation');
   if(template.content.childNodes.length!==1||p?.tagName!==n.tagName||p.attributes.length!==1||p.getAttribute('data-ktk-secondary-nye-copy')!==r.version||!clean(p.textContent)||[...p.querySelectorAll('*')].some(e=>!['A','STRONG'].includes(e.tagName)||e.tagName==='STRONG'&&e.attributes.length||e.tagName==='A'&&(e.attributes.length!==1||!allowed.has(e.getAttribute('href'))||!clean(e.textContent))))throw Error('Plain reviewed holiday prose and explicit destinations required');
   const original=n.cloneNode(true);n.replaceWith(p);inverses.push(()=>p.replaceWith(original));
  }
  for(const t of r.readingSlots){
   if(!slots.has(t.selector)||!Number.isSafeInteger(t.index)||t.index<0||seen.has(t.selector+'/'+t.index)||typeof t.before!=='string')throw Error('Distinct unrewritten holiday reading slot required');seen.add(t.selector+'/'+t.index);const n=slots.get(t.selector)[t.index],old=new DOMParser().parseFromString(t.before,'text/html').body.firstElementChild;
   if(!n||!old||n.querySelector('img,iframe,form,script,style,video,input,button')||n.closest('.ktk-embed-fallback,[data-ktk-embed-fallback],[data-ktk-embed-alternative]')||n.hasAttribute('data-ktk-secondary-nye-reading')||(!semantic?n.outerHTML!==t.before:JSON.stringify(slotFacts(n))!==JSON.stringify(slotFacts(old))))throw Error('Original unrewritten holiday reading slot changed');n.setAttribute('data-ktk-secondary-nye-reading',r.version);inverses.push(()=>n.removeAttribute('data-ktk-secondary-nye-reading'));
  }
  const question=[...root.querySelectorAll('article#post-7506 > .entry-content h2')].filter(n=>n.textContent===r.headingRole.text);if(question.length!==1||(!semantic&&question[0].outerHTML!==r.headingRole.before)||question[0].hasAttribute('data-ktk-heading-origin'))throw Error('One original FAQ question heading required');const originalQuestion=question[0].cloneNode(true),updatedQuestion=document.createElement('h3');for(const a of question[0].attributes)updatedQuestion.setAttribute(a.name,a.value);updatedQuestion.setAttribute('data-ktk-heading-origin','h2');updatedQuestion.append(...[...question[0].childNodes].map(n=>n.cloneNode(true)));if(!semantic&&updatedQuestion.outerHTML!==r.headingRole.after)throw Error('Exact subordinate FAQ heading required');question[0].replaceWith(updatedQuestion);inverses.push(()=>updatedQuestion.replaceWith(originalQuestion));
  const images=[...root.querySelectorAll('img')];if(images.length!==10)throw Error('Ten original holiday images required');
  for(const p of r.photos){const image=images[p.index];if(!image||image.getAttribute('alt')!==p.beforeAlt||(!semantic&&image.outerHTML!==p.before)||typeof p.afterAlt!=='string'||!p.afterAlt||/[<>\u0000-\u001f]/.test(p.afterAlt))throw Error('Exact original holiday photo required');const before=image.getAttribute('alt');image.setAttribute('alt',p.afterAlt);inverses.push(()=>image.setAttribute('alt',before));const a=image.closest('a');if(a&&a.hasAttribute('aria-label')){const label=a.getAttribute('aria-label');if(label!=='View full-size photo: '+p.beforeAlt)throw Error('Original photo-link accessible name changed');a.setAttribute('aria-label','View full-size photo: '+p.afterAlt);inverses.push(()=>a.setAttribute('aria-label',label));}}
  const heading=[...root.querySelectorAll('h3')].filter(n=>n.textContent.trim()==='Check out more photos here!');if(heading.length!==1)throw Error('One original gallery context boundary required');const template=document.createElement('template');template.innerHTML=r.galleryContext;const context=template.content.firstElementChild;if(template.content.childNodes.length!==1||context?.tagName!=='P'||context.attributes.length!==1||context.getAttribute('data-ktk-secondary-nye-gallery')!==r.version||context.children.length||!clean(context.textContent))throw Error('One reviewed plain historical-photo context required');const galleries=root.querySelectorAll('ul.et_post_gallery');if(galleries.length!==1||galleries[0].querySelectorAll(':scope > li > a[href]').length!==6)throw Error('One original six-photo native gallery required');galleries[0].before(context);inverses.push(()=>context.remove());
  if(root.hasAttribute('data-ktk-secondary-nye-review'))throw Error('Partial holiday revision');root.setAttribute('data-ktk-secondary-nye-review',r.version);inverses.push(()=>root.removeAttribute('data-ktk-secondary-nye-review'));return inverses;
 };
 const expected=reference.cloneNode(true);apply(expected,false);if(main.outerHTML===expected.outerHTML)return [];
 if(sourceReference){
  // This read-only projection preserves original remote/lazy/Rocket attributes.
  // Portable application bytes and original media attributes are enforced separately.
  const facts=n=>({text:clean(n.textContent),ids:[n,...n.querySelectorAll('[id]')].filter(n=>n.id).map(n=>n.id),headings:[...n.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n=>[n.tagName,n.id,n.textContent]),photos:[...n.querySelectorAll('img')].map(n=>['alt','width','height'].map(a=>n.getAttribute(a)))});
  if(JSON.stringify(facts(main))!==JSON.stringify(facts(reference)))throw Error('Complete original secondary NYE reference semantics required');
 }else if(main.outerHTML!==reference.outerHTML)throw Error('Complete prepared secondary NYE body changed; refuse before mutation');
 const detached=main.cloneNode(true),before=detached.outerHTML,inverses=apply(detached,sourceReference),updated=detached.cloneNode(true);for(const undo of inverses.reverse())undo();if(detached.outerHTML!==before)throw Error('Every holiday-guide byte outside reviewed slots must remain');main.replaceWith(updated);
 return [{type:'secondary-holiday-planning-review',key,version:r.version,proseSlots:37,unrewrittenReadingLeaves:19,photoDescriptions:10,originalHeadings:35,headingRoleChanges:1,originalTopics:8}];
}

export async function buildSecondaryNyeStyles(file){
 const css=await readFile(file,'utf8'),styles=await readFile(new URL('./secondary-nye-editorial.css',import.meta.url),'utf8'),anchor='/* END Homepage alias excerpts */\n';if(css.split(anchor).length!==2)throw Error('Exact homepage-excerpt style boundary required');
 if(css.includes('/* BEGIN Secondary holiday guide */')||css.includes('/* END Secondary holiday guide */')){if(css.split('/* BEGIN Secondary holiday guide */').length!==2||css.split('/* END Secondary holiday guide */').length!==2||!css.includes(anchor+styles))throw Error('Secondary holiday styles changed');return;}
 await writeFile(file,css.replace(anchor,anchor+styles));
}
