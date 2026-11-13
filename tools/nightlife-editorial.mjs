import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const key='krakow-nightlife';
const sourceSha256='e83fbda3b261310970c1b2755f11237de8ff9e10b8df328c18d5dcdf193a081e';
export async function loadNightlifeEditorial() {
 const source=await readFile(new URL('../docs/code-pages/full-migration/captures/krakow-nightlife/production-1920.html',import.meta.url));
 if(createHash('sha256').update(source).digest('hex')!==sourceSha256)throw Error('Review changed nightlife capture before applying the editorial revision');
 return {key,sourceSha256,reviewedOn:'2026-11-13',markup:await readFile(new URL('./content/nightlife-hub.html',import.meta.url),'utf8')};
}

// Build-time only: replace nine reviewed text modules, never media, forms or shells.
export function reviseNightlifeEditorial({key,revision}) {
 if(key!=='krakow-nightlife')return [];
 if(revision?.key!==key||revision.sourceSha256!=='e83fbda3b261310970c1b2755f11237de8ff9e10b8df328c18d5dcdf193a081e'||revision.reviewedOn!=='2026-11-13')throw Error('Reviewed nightlife source identity required');
 const source=document.createElement('template');source.innerHTML=revision.markup;
 const templates=[...source.content.children];
 if(templates.length!==9||templates.some(t=>t.tagName!=='TEMPLATE')||[...source.content.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))throw Error('Exactly nine reviewed nightlife templates required');
 const expectedTargets=Array.from({length:9},(_,i)=>`.et_pb_text_${i} .et_pb_text_inner`);
 const allowedTags=new Set(['H1','H2','H3','P','UL','LI','A','STRONG','TIME']);
 const allowedLinks=new Set([
  '__KTK_HOME_URL__wheres-the-cheap-places-to-drink-in-krakow/',
  '__KTK_HOME_URL__krakow-nightclubs/','__KTK_HOME_URL__store2/pub-crawl-28/#book',
  '__KTK_HOME_URL__stagshens/','__KTK_HOME_URL__contact/',
  'https://banialuka.com/index.php/home/','https://www.chicasgorillas.pl/menu',
  'https://oldsmobilpub.pl/','https://www.klub.krakow.pl/',
  'https://www.prozakclub.com/','https://rinclub.makro.bar/?lang=en',
  'https://cococlub.pl/en/','https://ztp.krakow.pl/en/public-transport'
 ]);
 const main=document.querySelector('#main-content');if(!main)throw Error('Nightlife main content required');
 const changes=[];
 for(const [index,template] of templates.entries()){
  const selector=template.dataset.target,prefix=template.dataset.sourcePrefix;
  if(selector!==expectedTargets[index]||!prefix)throw Error('Review changed nightlife template targets');
  for(const node of template.content.querySelectorAll('*')){
   if(!allowedTags.has(node.tagName))throw Error('Unexpected editorial element: '+node.tagName);
   const allowed=node.tagName==='A'?['href']:node.tagName==='TIME'?['datetime']:[];
   if([...node.attributes].some(a=>!allowed.includes(a.name)))throw Error('Unexpected editorial attribute');
   if(node.tagName==='A'&&(!allowedLinks.has(node.getAttribute('href'))||!node.textContent.trim()))throw Error('Unreviewed editorial destination');
   if(node.tagName==='TIME'&&(node.getAttribute('datetime')!==revision.reviewedOn||!node.textContent.trim()))throw Error('Review changed visible source date');
  }
  const targets=main.querySelectorAll(selector);
  if(targets.length!==1)throw Error('Expected exactly one nightlife text module: '+selector);
  const target=targets[0],expected=template.innerHTML;
  if(target.dataset.ktkEditorialReview){
   if(target.dataset.ktkEditorialReview!==revision.reviewedOn||target.innerHTML!==expected||(index>0&&target.style.textAlign!=='left'))throw Error('Review changed existing editorial content');
   continue;
  }
  if(target.closest('form')||target.querySelector('img,iframe,form,input,video,button')||!target.textContent.replace(/\s+/g,' ').trim().startsWith(prefix))throw Error('Review changed original nightlife text module: '+selector);
  changes.push({target,expected,selector,index});
 }
 // Validate the entire revision before changing any module.
 for(const change of changes){change.target.innerHTML=change.expected;change.target.dataset.ktkEditorialReview=revision.reviewedOn;if(change.index>0)change.target.style.textAlign='left';}
 return changes.map(({selector})=>({type:'verified-nightlife-editorial',selector,reviewedOn:revision.reviewedOn}));
}
