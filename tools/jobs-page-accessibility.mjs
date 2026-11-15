import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadJobsPageAccessibility(){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/pub-crawl-jobs/production-1920.html',import.meta.url),'utf8'),sourceSha256='a228d14bb3c9f6d9a1f39db3dcdf50b0b5347444d02c2bb1235bd9239341e916';
  if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Original Jobs capture changed');
  return {key:'pub-crawl-jobs',sourceSha256,sourceHtml,version:'2026-11-15.jobs-accessibility-1'};
}

// Build-time only. Validate every text-only container and the complete marker state before replacing any node.
export function reviseJobsPageAccessibility({key,revision}){
  if(key!=='pub-crawl-jobs')return [];
  const version='2026-11-15.jobs-accessibility-1',sha='a228d14bb3c9f6d9a1f39db3dcdf50b0b5347444d02c2bb1235bd9239341e916';
  if(revision?.key!==key||revision.version!==version||revision.sourceSha256!==sha||typeof revision.sourceHtml!=='string')throw Error('Reviewed Jobs identity required');
  const main=document.querySelector('#main-content'),source=new DOMParser().parseFromString(revision.sourceHtml,'text/html').querySelector('#main-content');
  if(!main||!source||main.dataset.ktkSemanticHeadings!=='1')throw Error('Original Jobs root and prior semantic pass required');
  const clean=s=>(s||'').replace(/\s+/g,' ').trim(),one=(root,selector)=>{const rows=root.querySelectorAll(selector);if(rows.length!==1)throw Error('Unique Jobs target required: '+selector);return rows[0];};
  const oldTitle='WORK FOR THE BIGGEST PUB CRAWL IN EUROPE',newTitle='Pub Crawl Jobs in Krakow',oldPrefix='Working for the biggest Krakow’s Pub Crawl',newPrefix='Working with Krawl Through Krakow';
  const labels={0:'the position',3:'REQUIREMENTS',4:'BENEFITS OF BEING A GUIDE',7:'apply now!'},blurbText=['You speak english fluently.',"You're available for at least 1 month.","You're a responsible drinker & a party animal.",'You have a great outgoing personality.','You are able do work also a couple of hours during the day doing street promotion','Lots of Fun!','Free Drinks','Earn Money by Partying','Flexible Working Hours','Incentives & Bonuses','Free Accommodation'];
  const rename=(node,tag)=>{if(node.tagName.toLowerCase()===tag)return node;const n=document.createElement(tag);for(const a of node.attributes)n.setAttribute(a.name,a.value);if(!n.hasAttribute('data-ktk-heading-origin'))n.dataset.ktkHeadingOrigin=node.tagName.toLowerCase();n.append(...node.childNodes);node.replaceWith(n);return n;};
  const plans=[],add=(selector,before,after)=>{const target=one(main,selector),old=target.outerHTML===before.outerHTML,revised=target.outerHTML===after.outerHTML;if(!old&&!revised)throw Error('Original/reviewed Jobs shape changed: '+selector);plans.push({selector,target,after,revised});};
  const titleSelector='.et_pb_fullwidth_header_0 h1.et_pb_module_header',oldHeading=one(source,titleSelector).cloneNode(true);
  if(oldHeading.attributes.length!==1||oldHeading.className!=='et_pb_module_header'||oldHeading.children.length||oldHeading.textContent!==oldTitle)throw Error('Original Jobs primary title changed');
  const title=oldHeading.cloneNode(true);title.textContent=newTitle;title.dataset.ktkJobsTitle=version;add(titleSelector,oldHeading,title);
  for(const [kind,indices] of [['text',[0,1,3,4,5,6,7]],['blurb',Array.from({length:11},(_,i)=>i)]])for(const index of indices){
    const selector='.et_pb_'+kind+'_'+index+' .et_pb_'+(kind==='text'?'text_inner':'blurb_container'),before=one(source,selector).cloneNode(true);
    if(before.attributes.length!==1||before.className!=='et_pb_'+(kind==='text'?'text_inner':'blurb_container')||before.querySelector('img,svg,video,iframe,form,input,select,textarea,button,script,style,noscript,[id]'))throw Error('Original Jobs text-only boundary changed');
    if(kind==='blurb'){
      const h=one(before,index<5?'h4.et_pb_module_header':'h3.et_pb_module_header');
      if(clean(h.textContent)!==blurbText[index])throw Error('Original Jobs criterion/benefit changed');
      if(index<5)rename(h,'h2');
    }
    if(kind==='text'&&index===5){const h=one(before,'h1');if(clean(h.textContent)!=='Life As a Guide')throw Error('Original Jobs guide heading changed');rename(h,'h2');}
    const after=before.cloneNode(true);after.dataset.ktkJobsCopy=version;
    if(kind==='text'&&Object.hasOwn(labels,index)){
      if(before.children.length!==1||before.firstElementChild.tagName!=='P'||before.firstElementChild.attributes.length||before.firstElementChild.children.length||before.firstElementChild.textContent!==labels[index]||clean(before.textContent)!==labels[index])throw Error('Original Jobs section label changed');
      rename(after.firstElementChild,'h2').dataset.ktkJobsSection=version;
    }
    if(kind==='text'&&index===1){
      const p=one(after,'p:first-child');if(p.children.length||p.childNodes.length!==1||!p.textContent.startsWith(oldPrefix+' during the night & promoting and leading the pub crawl'))throw Error('Original Jobs introduction changed');
      p.firstChild.textContent=p.firstChild.textContent.replace(oldPrefix,newPrefix);p.dataset.ktkJobsIntro=version;
    }
    if(kind==='blurb'&&index<5)rename(one(after,'h2'),'h3').dataset.ktkJobsSubheading=version;
    if(kind==='text'&&index===6){const h=one(after,'h2');if(clean(h.textContent)!=='Want hear about the Guide Experience? Check out this Blog Post Here')throw Error('Original Jobs guide link heading changed');rename(h,'h3').dataset.ktkJobsSubheading=version;}
    add(selector,before,after);
  }
  const revised=plans.every(p=>p.revised);
  if(plans.some(p=>p.revised)&&!revised)throw Error('Partially reviewed Jobs page');
  const expectedMarkers={'data-ktk-jobs-title':1,'data-ktk-jobs-copy':18,'data-ktk-jobs-section':4,'data-ktk-jobs-subheading':6,'data-ktk-jobs-intro':1};
  for(const [name,count] of Object.entries(expectedMarkers))if(main.querySelectorAll('['+name+']').length!==(revised?count:0))throw Error('Unknown Jobs review marker');
  for(const n of main.querySelectorAll('*'))for(const a of n.attributes)if(a.name.startsWith('data-ktk-jobs-')&&!Object.hasOwn(expectedMarkers,a.name))throw Error('Unknown Jobs marker name');
  if(revised)return [];
  for(const p of plans)p.target.replaceWith(p.after);
  return plans.map(p=>({type:'jobs-accessibility',selector:p.selector,version}));
}

const scope='body.ktk-code-page[data-ktk-page="pub-crawl-jobs"] #main-content';
const styles=`/* BEGIN Jobs page accessibility */
${scope} [data-ktk-jobs-section] { line-height: 1.25; padding-bottom: 0; }
@media (max-width: 600px) {
  ${scope} [data-ktk-jobs-copy] { box-sizing: border-box; padding-right: 24px; }
  ${scope} [data-ktk-jobs-section] { font-size: clamp(22px, 7vw, 30px); letter-spacing: .04em; }
}
/* END Jobs page accessibility */
`;
export async function buildJobsPageAccessibilityStyles(file){
  const css=await readFile(file,'utf8'),anchor='/* END Withheld embed alternatives */\n';
  if(css.split(anchor).length!==2)throw Error('Stable embed style boundary required');
  if(css.includes('/* BEGIN Jobs page accessibility */')||css.includes('/* END Jobs page accessibility */')){
    if(css.split('/* BEGIN Jobs page accessibility */').length!==2||css.split('/* END Jobs page accessibility */').length!==2||!css.includes(anchor+styles))throw Error('Jobs stylesheet drift');return;
  }
  await writeFile(file,css.replace(anchor,anchor+styles));
}
