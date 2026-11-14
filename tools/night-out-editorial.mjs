import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadNightOutEditorial(){
 const rows=[];
 for(const [key,file,sourceSha256]of [['post-survive-pub-crawl','survive','3c034ef5559b8ae34f0a902accd264b668e56e48d5bf6e031e4a9c25626401b0'],['post-stages-of-drunkenness','stages','50a460acbc7a9ba69692f4a17c97397eb284834ad67b5883b0e1d0a06f3c6bc0']]){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');
  if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Night-out source changed: '+key);
  const markup=await readFile(new URL('./content/night-out-'+file+'.html',import.meta.url),'utf8');
  if(/[{}]/.test(markup))throw Error('Unreviewed night-out template value');
  rows.push({key,sourceSha256,sourceHtml,markup,reviewedOn:'2026-11-14',version:'2026-11-14.night-out-1'});
 }
 return rows;
}

export function reviseNightOutEditorial({key,revision}){
 const definitions={
  'post-survive-pub-crawl':{sha:'3c034ef5559b8ae34f0a902accd264b668e56e48d5bf6e031e4a9c25626401b0',title:'How to Survive a Pub Crawl',label:'Pub crawl planning contents',ids:['night-out-contents','before-leaving','your-own-pace','group-plan','boundaries','return-journey','urgent-help','no-quick-fix','joining-information']},
  'post-stages-of-drunkenness':{sha:'50a460acbc7a9ba69692f4a17c97397eb284834ad67b5883b0e1d0a06f3c6bc0',title:'Eleven Stages of Drunkenness',label:'Alcohol and night-out choices contents',ids:['night-out-contents','not-a-scale','stop-pressure','take-concerns-seriously','urgent-help','look-after-people','plan-a-different-night']}
 };
 if(!Object.hasOwn(definitions,key))return [];
 const conf=definitions[key],clean=s=>(s||'').replace(/\s+/g,' ').trim();
 if(revision?.key!==key||revision.sourceSha256!==conf.sha||revision.version!=='2026-11-14.night-out-1'||revision.reviewedOn!=='2026-11-14'||typeof revision.sourceHtml!=='string'||typeof revision.markup!=='string')throw Error('Reviewed night-out identity required');
 const doc=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),original=doc.querySelector('#main-content'),selector='.et_pb_text_0 > .et_pb_text_inner',nodes=main?.querySelectorAll(selector),old=original?.querySelectorAll(selector);
 if(nodes?.length!==1||old?.length!==1||main.querySelectorAll('h1').length!==1||original.querySelectorAll('h1').length!==1||clean(main.querySelector('h1').textContent)!==conf.title||clean(original.querySelector('h1').textContent)!==conf.title)throw Error('Original night-out title/module required');
 const body=nodes[0],source=old[0],template=document.createElement('template');template.innerHTML=revision.markup;
 const links=new Set(conf.ids.map(id=>'#'+id).concat(['tel:112','__KTK_HOME_URL__about-us/how-to-join/','__KTK_HOME_URL__krakow-nightlife/','__KTK_HOME_URL__survive-pub-crawl/','__KTK_HOME_URL__hostel-etiquette-tips/','__KTK_HOME_URL__the-ultimate-guide-to-dating-in-nightlife-krakow/','https://www.nhs.uk/conditions/alcohol-poisoning/','https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-dangers-of-alcohol-overdose','https://www.gov.pl/web/mswia-en/emergency-number-112']));
 for(const n of template.content.querySelectorAll('*')){
  const attrs=n.tagName==='A'?['href']:['H2','SUMMARY'].includes(n.tagName)?['id']:n.tagName==='NAV'?['aria-label']:n.tagName==='TIME'?['datetime']:[];
  if(!['P','SMALL','TIME','NAV','DETAILS','SUMMARY','UL','LI','STRONG','H2','A'].includes(n.tagName)||[...n.attributes].some(a=>!attrs.includes(a.name)))throw Error('Unreviewed night-out markup');
  if(n.tagName==='A'&&(!links.has(n.getAttribute('href'))||!clean(n.textContent)))throw Error('Unreviewed night-out destination');
  if(n.tagName==='NAV'&&n.getAttribute('aria-label')!==conf.label)throw Error('Night-out contents label changed');
  if(n.tagName==='TIME'&&(n.getAttribute('datetime')!==revision.reviewedOn||n.textContent!=='14 November 2026'))throw Error('Night-out guidance date changed');
 }
 const nav=template.content.querySelector('nav'),details=nav?.querySelector(':scope > details'),ids=[...template.content.querySelectorAll('[id]')].map(n=>n.id),headings=[...template.content.querySelectorAll('h2')],toc=[...template.content.querySelectorAll('nav a')];
 if(JSON.stringify(ids)!==JSON.stringify(conf.ids)||new Set(ids).size!==ids.length)throw Error('Exact night-out fragment inventory required');
 if(template.content.querySelectorAll('nav').length!==1||template.content.querySelectorAll('details').length!==1||template.content.querySelectorAll('summary').length!==1||template.content.querySelectorAll('time').length!==1||!details||nav.children.length!==1||details.children.length!==2||details.children[0].tagName!=='SUMMARY'||details.children[1].tagName!=='UL'||nav.querySelector('p,small,time,h2'))throw Error('Only native night-out contents may collapse');
 if(headings.length!==conf.ids.length-1||toc.length!==headings.length||toc.some((a,i)=>a.getAttribute('href')!=='#'+headings[i].id)||template.content.querySelectorAll('a[href="tel:112"]').length!==1)throw Error('Complete night-out contents and local emergency link required');
 if(body.querySelector('img,svg,form,iframe,video,script,style,input,button')||source.querySelector('[id],img,svg,form,iframe,video,input,button'))throw Error('Protected element inside night-out text module');
 const marker=body.getAttribute('data-ktk-night-out-review');
 if(marker){if(marker!==revision.version||body.innerHTML!==template.innerHTML)throw Error('Changed reviewed night-out text');return [];}
 const text=n=>{const clone=n.cloneNode(true);clone.querySelectorAll('script,style,noscript').forEach(n=>n.remove());return clean(clone.textContent);};
 if(text(body)!==text(source)||body.querySelector('[id]'))throw Error('Original night-out copy/fragments changed');
 // All reviewed destinations and the original module are checked before mutation.
 body.innerHTML=template.innerHTML;body.dataset.ktkNightOutReview=revision.version;
 return [{type:'night-out-guidance-review',key,reviewedOn:revision.reviewedOn,originalFragments:0,nativeSections:headings.length}];
}

const scope='body.ktk-code-page:is([data-ktk-page="post-survive-pub-crawl"],[data-ktk-page="post-stages-of-drunkenness"]) #main-content [data-ktk-night-out-review]';
const styles='/* BEGIN Practical night-out guidance */\n'+scope+' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n'+scope+' h2 { font-family: inherit; font-size: 22px; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n'+scope+' nav { margin: 1em 0; }\n'+scope+' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n'+scope+' a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }\n'+scope+' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  '+scope+' { padding-right: 24px; }\n}\n/* END Practical night-out guidance */\n';
export async function buildNightOutStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Practical party guides */';if(css.split(anchor).length!==2)throw Error('Stable night-out style anchor required');
 const initial=styles.replace('letter-spacing: 0; text-align: left;','letter-spacing: 0;');
 if(css.split('/* BEGIN Practical night-out guidance */').length===2&&css.split('/* END Practical night-out guidance */').length===2&&css.includes(initial+'\n'+anchor)){await writeFile(file,css.replace(initial,styles));return;}
 if(css.includes('/* BEGIN Practical night-out guidance */')||css.includes('/* END Practical night-out guidance */')){if(css.split('/* BEGIN Practical night-out guidance */').length!==2||css.split('/* END Practical night-out guidance */').length!==2||!css.includes(styles+'\n'+anchor))throw Error('Night-out style drift');return;}
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
