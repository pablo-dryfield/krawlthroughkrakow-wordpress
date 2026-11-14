import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadGroupActivitiesEditorial(){
 const definitions=[['krakow-stag-do','stag','c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1'],['krakow-hen-do','hen','d41c1552178ec5c628d41549d71ac03df468a3f990cd5d4bcfa8112705461297']],rows=[];
 for(const [key,file,sourceSha256]of definitions){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');
  if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Group activity source changed: '+key);
  rows.push({key,sourceSha256,sourceHtml,markup:await readFile(new URL('./content/group-activities-'+file+'.html',import.meta.url),'utf8'),reviewedOn:'2026-11-14',version:'2026-11-14.group-activities-1'});
 }
 return rows;
}

export function reviseGroupActivitiesEditorial({key,revision}){
 const identities={'krakow-stag-do':'c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1','krakow-hen-do':'d41c1552178ec5c628d41549d71ac03df468a3f990cd5d4bcfa8112705461297'};
 if(!Object.hasOwn(identities,key))return [];
 if(revision?.key!==key||revision.sourceSha256!==identities[key]||revision.reviewedOn!=='2026-11-14'||revision.version!=='2026-11-14.group-activities-1'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string')throw Error('Reviewed group activity identity required');
 const stag=key==='krakow-stag-do',selectors=stag?['.et_pb_row_4 .et_pb_text_2 > .et_pb_text_inner','.et_pb_row_6 .et_pb_text_6 > .et_pb_text_inner','.et_pb_row_14 .et_pb_text_14 > .et_pb_text_inner','.et_pb_row_15 .et_pb_text_15 > .et_pb_text_inner','.et_pb_row_16 .et_pb_text_1 > .et_pb_text_inner','.et_pb_row_16 .et_pb_text_2 > .et_pb_text_inner']:['.et_pb_row_1 .et_pb_text_1 > .et_pb_text_inner'];
 const original=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),parts=[...templates.querySelectorAll('template')],pending=[],seen=new Set(),clean=s=>(s||'').replace(/\s+/g,' ').trim();
 if(parts.length!==selectors.length||clean(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Complete group activity templates required');
 for(const part of parts){
  const selector=part.getAttribute('data-target');
  if(part.attributes.length!==1||!selectors.includes(selector)||seen.has(selector))throw Error('Unreviewed group activity target');seen.add(selector);
  if(!clean(part.content.textContent))throw Error('Nonempty group activity copy required');
  for(const n of part.content.querySelectorAll('*')){
   if(!['P','H3','UL','LI','STRONG','A'].includes(n.tagName)||[...n.attributes].some(a=>n.tagName!=='A'||a.name!=='href'))throw Error('Unreviewed group activity markup');
   if(n.tagName==='A'&&(selector!=='.et_pb_row_15 .et_pb_text_15 > .et_pb_text_inner'||n.getAttribute('href')!=='https://www.gov.uk/foreign-travel-advice/poland/safety-and-security'||!clean(n.textContent)))throw Error('Unreviewed group activity link');
  }
  const old=original.querySelectorAll('#main-content '+selector),nodes=document.querySelectorAll('#main-content '+selector);
  if(old.length!==1||nodes.length!==1)throw Error('Missing or ambiguous group activity module');
  const node=nodes[0],html=part.innerHTML.trim(),marker=node.getAttribute('data-ktk-group-activity-review');
  if(node.querySelector('img,svg,iframe,script,style,form,input,button,a[name],[id]'))throw Error('Protected content inside group activity text');
  if(marker){if(marker!==revision.reviewedOn||node.innerHTML!==html)throw Error('Changed reviewed group activity copy');}
  else if(node.innerHTML.trim()!==old[0].innerHTML.trim())throw Error('Original group activity markup changed');
  pending.push({selector,node,html});
 }
 const fragment=stag?'#stag_trip_form':'#hen_do_form';
 if(document.querySelectorAll(fragment).length!==1||!document.querySelector(fragment).querySelector('form'))throw Error('Original group activity enquiry target required');
 // Validate the final target and enquiry contract before changing the first module.
 for(const {node,html}of pending){node.innerHTML=html;node.dataset.ktkGroupActivityReview=revision.reviewedOn;}
 return pending.map(({selector})=>({type:'group-activity-review',selector,reviewedOn:revision.reviewedOn}));
}

const initialStyles='/* BEGIN Group activity clarity */\nbody.ktk-code-page #main-content [data-ktk-group-activity-review] { text-align: left; }\n@media (max-width: 600px) {\n  body.ktk-code-page #main-content [data-ktk-group-activity-review] { padding-right: 24px; }\n}\n/* END Group activity clarity */\n';
const heightOnlyStyles=initialStyles.replace('/* END Group activity clarity */','body.ktk-code-page[data-ktk-page="krakow-stag-do"] #main-content .et_pb_row_16:has([data-ktk-group-activity-review]) { height: auto !important; }\n/* END Group activity clarity */');
const styles=initialStyles.replace('/* END Group activity clarity */','body.ktk-code-page[data-ktk-page="krakow-stag-do"] #main-content .et_pb_row_16:has([data-ktk-group-activity-review]) { max-height: none; }\n/* END Group activity clarity */');
export async function buildGroupActivityStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Stag costume guide */';
 if(css.split(anchor).length!==2)throw Error('Stable group activity style anchor required');
 if(css.includes('/* BEGIN Group activity clarity */')||css.includes('/* END Group activity clarity */')){if(css.split('/* BEGIN Group activity clarity */').length!==2||css.split('/* END Group activity clarity */').length!==2)throw Error('Group activity style drift');if(css.includes(styles+'\n'+anchor))return;const known=[initialStyles,heightOnlyStyles].find(s=>css.includes(s+'\n'+anchor));if(known){await writeFile(file,css.replace(known,styles));return;}throw Error('Group activity style drift');}
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
