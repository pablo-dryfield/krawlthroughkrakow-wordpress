import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadHalloweenNeutralGuide(){
 const raw=await readFile(new URL('./halloween-neutral-guide.json',import.meta.url)),r=JSON.parse(raw),hash=b=>createHash('sha256').update(b).digest('hex');
 const markup=await readFile(new URL('./content/halloween-neutral-guide.html',import.meta.url),'utf8');
 if(hash(raw)!=='e2be08d8ffc376c34dc8488b43f8d4582149f70fe72505a053c7b1f442319a50'||r.version!=='2026-11-19.halloween-neutral-1'||r.key!=='post-spooktacular-krakow-unveil-the-mysteries-of-halloween'||r.reviewedOn!=='2026-11-19'||r.ownerApproved!==true||hash(markup)!==r.markupSHA256||hash(r.preparedMain)!==r.preparedMainSHA256||hash(r.referenceMain)!==r.referenceMainSHA256||r.photos?.length!==8||r.photoDescriptions?.length!==3)throw Error('Exact owner-approved Halloween guide and original profiles required');
 const source=await readFile(new URL('../docs/code-pages/full-migration/captures/'+r.key+'/production-1920.html',import.meta.url));
 if(hash(source)!==r.sourceSHA256||r.sourceSHA256!=='59aec83f98805978794ea713347813ee65200b8831f8ff81bee5a4cb82e94734')throw Error('Immutable Halloween capture required');
 for(const photo of r.photos)if(hash(await readFile(new URL('../'+photo.local,import.meta.url)))!==photo.sha256)throw Error('Original visually reviewed Halloween photo bytes required');
 if(JSON.stringify(r.containers?.map(c=>c.key))!==JSON.stringify(['archive-category-krakow-guides','archive-author-pubthroughkrakow','blog'])||typeof r.summary!=='string'||r.summary.length<80||r.summary.length>250||/[<>\u0000-\u001f]/.test(r.summary))throw Error('One reviewed Halloween summary and three original containers required');
 for(const c of r.containers){
  if(hash(c.preparedMain)!==c.preparedMainSHA256||hash(c.referenceMain)!==c.referenceMainSHA256||c.targets.length!==(c.key==='blog'?2:1)||hash(await readFile(new URL('../docs/code-pages/full-migration/captures/'+c.key+'/production-1920.html',import.meta.url)))!==c.sourceSHA256)throw Error('Exact original Halloween summary profiles required');
 }
 return {...r,markup};
}

export function reviseHalloweenNeutralGuide({key,revision:r,sourceReference=false}){
 if(!['post-spooktacular-krakow-unveil-the-mysteries-of-halloween','archive-category-krakow-guides','archive-author-pubthroughkrakow','blog'].includes(key))return [];
 if(r?.key!=='post-spooktacular-krakow-unveil-the-mysteries-of-halloween'||r.version!=='2026-11-19.halloween-neutral-1'||r.ownerApproved!==true||typeof r.preparedMain!=='string'||typeof r.referenceMain!=='string'||typeof r.markup!=='string'||r.photoDescriptions?.length!==3||typeof sourceReference!=='boolean')throw Error('Exact reviewed Halloween revision required');
 if(key!==r.key){
  const c=r.containers?.find(c=>c.key===key),main=document.querySelector('#main-content'),original=c&&new DOMParser().parseFromString(sourceReference?c.referenceMain:c.preparedMain,'text/html').querySelector('#main-content');
  if(!c||!main||!original||document.querySelectorAll('#main-content').length!==1||typeof r.summary!=='string'||r.summary.length<80||r.summary.length>250||/[<>\u0000-\u001f]/.test(r.summary)||c.targets.length!==(key==='blog'?2:1))throw Error('Exact Halloween summary container required');
  const apply=root=>{
   for(const t of c.targets){
    const nodes=root.querySelectorAll(t.selector);if(nodes.length!==1)throw Error('One original Halloween summary slot required');const n=nodes[0],p=document.createElement('p');p.dataset.ktkHalloweenSummary=r.version;p.textContent=r.summary;
    if(t.mode==='paragraph'){
     if(t.selector!=='article.post-7472 .post-content-inner > p'||n.outerHTML!==t.before||n.children.length||n.attributes.length)throw Error('Original plain Halloween card excerpt required');n.replaceWith(p);
    }else if(t.mode==='raw'){
     const raw=[...n.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
     if(t.selector!=='article.post-7472'||raw.length!==1||raw[0].textContent!==t.before)throw Error('Original raw Halloween archive excerpt required');raw[0].replaceWith(p,document.createTextNode('\n'));
    }else if(t.mode==='slide'){
     if(t.selector!=='.et_pb_post_slide-7472 .et_pb_slide_content > div'||n.outerHTML!==t.before||n.children.length)throw Error('Original Halloween slider excerpt required');n.replaceChildren(p);
    }else throw Error('Explicit Halloween summary slot mode required');
   }
  };
  const expected=original.cloneNode(true);apply(expected);if(main.outerHTML===expected.outerHTML)return [];
  if(main.outerHTML!==original.outerHTML)throw Error('Original Halloween summary container changed; refuse before mutation');main.replaceWith(expected);
  return c.targets.map(t=>({type:'matching-neutral-halloween-summary',key,selector:t.selector,reviewedOn:r.reviewedOn}));
 }
 const selector='article#post-7472 .entry-content .et_pb_text_0 > .et_pb_text_inner',parse=html=>new DOMParser().parseFromString(html,'text/html'),original=parse(sourceReference?r.referenceMain:r.preparedMain).querySelector('#main-content'),main=document.querySelector('#main-content');
 if(!original||!main||document.querySelectorAll('#main-content').length!==1||original.querySelectorAll(selector).length!==1||main.querySelectorAll(selector).length!==1)throw Error('One original Halloween main and article text module required');
 const allowedLinks=new Set(['__KTK_HOME_URL__store2/halloween-pub-crawl-51/','__KTK_HOME_URL__contact/','https://www.tripadvisor.com/Attraction_Review-g274772-d2725527-Reviews-Krawl_Through_Krakow_Pub_Crawl-Krakow_Lesser_Poland_Province_Southern_Poland.html','https://www.getyourguide.com/krakow-l40/krakow-pub-crawl-1h-open-bar-vip-entry-welcome-shots-t443425/','#halloween-dates','#halloween-event-details','#halloween-costumes','#halloween-reviews','#halloween-planning']);
 const apply=root=>{
  const body=root.querySelector(selector),template=document.createElement('template');template.innerHTML=r.markup;
  for(const n of template.content.querySelectorAll('*')){
   const attrs=n.tagName==='A'?['href']:n.tagName==='NAV'?['id','aria-label']:n.tagName==='SPAN'?['id','aria-hidden']:n.tagName==='DIV'?['data-ktk-halloween-media']:['H2','SUMMARY'].includes(n.tagName)?['id']:[];
   if(!['P','H2','NAV','DETAILS','SUMMARY','UL','LI','A','SPAN','DIV'].includes(n.tagName)||[...n.attributes].some(a=>!attrs.includes(a.name))||n.tagName==='A'&&(!allowedLinks.has(n.getAttribute('href'))||!n.textContent.trim()))throw Error('Only approved Halloween copy, native contents and explicit links required');
  }
  const media=[...body.children].filter(n=>n.querySelector('img,video'));
  if(media.length!==8||media.filter(n=>n.querySelector('video')).length!==1||[...body.querySelectorAll('img')].filter(n=>!n.closest('noscript')).length!==7||[...body.querySelectorAll('form,iframe,input,button,svg')].some(n=>!n.closest('.wp-video')))throw Error('Seven inline image wrappers and original functional video required');
  const slots=[...template.content.querySelectorAll('[data-ktk-halloween-media]')];
  if(slots.length!==8||new Set(slots.map(n=>n.dataset.ktkHalloweenMedia)).size!==8||slots.some(n=>n.childNodes.length||n.attributes.length!==1||!/^\d$/.test(n.dataset.ktkHalloweenMedia)||Number(n.dataset.ktkHalloweenMedia)>7))throw Error('Each original media wrapper must be retained once');
  const ids=[...template.content.querySelectorAll('[id]')].map(n=>n.id),oldIds=[...body.querySelectorAll('[id]')].filter(n=>!n.closest('.wp-video')).map(n=>n.id);
  if(new Set(ids).size!==ids.length||oldIds.some(id=>!ids.includes(id))||template.content.querySelectorAll('nav').length!==1||template.content.querySelectorAll('details').length!==1||template.content.querySelectorAll('summary').length!==1||template.content.querySelectorAll('nav a').length!==5)throw Error('Complete native contents and preserved historical fragments required');
  for(const n of slots)n.replaceWith(media[Number(n.dataset.ktkHalloweenMedia)].cloneNode(true));
  const photos=[...root.querySelectorAll('img')].filter(n=>!n.closest('noscript'));
  if(photos.length!==8)throw Error('All eight Halloween images required');
  // The photo wrappers below are detached clones. Only neutral ALT text changes.
  const inline=[...template.content.querySelectorAll('img')].filter(n=>!n.closest('noscript'));
  for(const row of r.photoDescriptions){
   const originalPhoto=photos[row.index];if(!originalPhoto)throw Error('Original reviewed photo index required');
   const clone=inline.find(n=>(n.getAttribute('data-lazy-src')||n.getAttribute('src'))===(originalPhoto.getAttribute('data-lazy-src')||originalPhoto.getAttribute('src')));
   if(!originalPhoto||!clone||originalPhoto.getAttribute('alt')!==row.before||typeof row.after!=='string'||!row.after||row.after.length>160)throw Error('Exact reviewed photo description required');
   clone.setAttribute('alt',row.after);const link=clone.closest('a');if(link?.hasAttribute('aria-label')){if(link.getAttribute('aria-label')!=='View full-size photo: '+row.before)throw Error('Original media link name changed');link.setAttribute('aria-label','View full-size photo: '+row.after);}
  }
  body.replaceChildren(template.content);body.dataset.ktkHalloweenGuide=r.version;
 };
 const expected=original.cloneNode(true);apply(expected);if(main.outerHTML===expected.outerHTML)return [];
 if(main.outerHTML!==original.outerHTML)throw Error('Complete original Halloween body changed; refuse before mutation');
 const updated=main.cloneNode(true);apply(updated);if(updated.outerHTML!==expected.outerHTML)throw Error('Exact reviewed Halloween result required');main.replaceWith(updated);
 return [{type:'owner-approved-neutral-halloween-guide',key,reviewedOn:r.reviewedOn,retainedPhotos:8,neutralPhotoDescriptions:3,retainedNativeVideos:1,preservedPublication:'2023-10-10',futureProgrammeUnconfirmed:true}];
}

export async function loadHalloweenNeutralStyles(){
 const styles=await readFile(new URL('./halloween-neutral-guide.css',import.meta.url),'utf8');
 if(createHash('sha256').update(styles).digest('hex')!=='3f8678bc451f99af31ba1465c5165949ef8c05470ec6c01d198058a7c3772a2b'||styles.split('/* BEGIN Neutral Halloween guide */').length!==2||styles.split('/* END Neutral Halloween guide */').length!==2)throw Error('Exact reviewed Halloween reading and summary styles required');
 return styles;
}
