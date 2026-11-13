import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const key='post-jazz-bars-in-krakow';
const sourceSha256='64a6ab3ac4e3b25e71f6d97f1aafdb90b64e2760d5b116454e35f1b04ecebb1c';
export async function loadJazzEditorial(){
 const source=await readFile(new URL('../docs/code-pages/full-migration/captures/post-jazz-bars-in-krakow/production-1920.html',import.meta.url));
 if(createHash('sha256').update(source).digest('hex')!==sourceSha256)throw Error('Review changed jazz capture before applying factual corrections');
 return {key,sourceSha256,reviewedOn:'2026-11-13',edits:JSON.parse(await readFile(new URL('./content/jazz-facts.json',import.meta.url),'utf8'))};
}

// Build-time only: validate all eight scoped edits before changing any original node.
export function reviseJazzEditorial({key,revision}){
 if(key!=='post-jazz-bars-in-krakow')return [];
 if(revision?.key!==key||revision.sourceSha256!=='64a6ab3ac4e3b25e71f6d97f1aafdb90b64e2760d5b116454e35f1b04ecebb1c'||revision.reviewedOn!=='2026-11-13')throw Error('Reviewed jazz source identity required');
 const main=document.querySelector('#main-content'),body=main?.querySelector('.entry-content');
 if(!body||main.querySelector('h1.entry-title')?.textContent.trim()!=='Jazz Bars in Krakow: Experience Vibrant Nightlife & Charm'||main.querySelector('.post-meta .published')?.textContent.trim()!=='Jul 18, 2023')throw Error('Review changed jazz article identity');
 if(!Array.isArray(revision.edits)||revision.edits.length!==8)throw Error('Exactly eight reviewed jazz edits required');
 const selectors=['#harrispianojazzbarthebirthplaceofpolishjazz','a[href="#harrispianojazzbarthebirthplaceofpolishjazz"]',...Array(6).fill('p')];
 const links=new Set(['https://harris.krakow.pl/o-nas/','https://www.piecart.pl/?lang=pl','https://jazzumuniaka.club/','https://jazzumuniaka.club/regulamin/','__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__store2/pub-crawl-28/#book']);
 const normalize=text=>text.replace(/\s+/g,' ').trim();
 const notice=document.createElement('p');notice.dataset.ktkJazzReview=revision.reviewedOn;
 const strong=document.createElement('strong');strong.textContent='Venue checks: ';
 const time=document.createElement('time');time.dateTime=revision.reviewedOn;time.textContent='13 November 2026';
 notice.append(strong,document.createTextNode('the Harris, PIEC Art and U Muniaka details below were checked by Krawl Through Krakow on '),time,document.createTextNode('. Programmes and admission arrangements may change; follow each venue\'s own information for your visit.'));
 const existing=body.querySelector('[data-ktk-jazz-review]');
 if(existing&&(existing.outerHTML!==notice.outerHTML||existing!==body.firstElementChild))throw Error('Review changed jazz venue-check notice');
 const targets=[],seen=new Set();
 for(const [index,edit] of revision.edits.entries()){
  if(edit.selector!==selectors[index]||typeof edit.expectedText!=='string'||!edit.expectedText.trim()||typeof edit.markup!=='string'||!edit.markup.trim())throw Error('Changed jazz edit scope');
  const fragment=document.createElement('template');fragment.innerHTML=edit.markup;
  for(const node of fragment.content.querySelectorAll('*')){
   if(!['A','STRONG'].includes(node.tagName)||[...node.attributes].some(attr=>node.tagName!=='A'||attr.name!=='href')||(node.tagName==='A'&&(!links.has(node.getAttribute('href'))||!node.textContent.trim())))throw Error('Unreviewed jazz markup or destination');
  }
  const matches=[...body.querySelectorAll(edit.selector)].filter(node=>existing?node.innerHTML===fragment.innerHTML:normalize(node.textContent)===edit.expectedText);
  if(matches.length!==1||seen.has(matches[0]))throw Error('Review changed or duplicated original jazz text');
  seen.add(matches[0]);targets.push({node:matches[0],markup:fragment.innerHTML});
 }
 if(existing)return [];
 for(const {node,markup} of targets)node.innerHTML=markup;
 body.prepend(notice);
 return [{type:'jazz-venue-facts',reviewedOn:revision.reviewedOn,edits:targets.length,publicationPreserved:true}];
}
