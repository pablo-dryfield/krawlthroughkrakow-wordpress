import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts,offerTemplateValues} from './site-offer-facts.mjs';

export async function loadGroupPlanningEditorial(){
 const values=offerTemplateValues(await loadOfferFacts()),result=[];
 const definitions=[['krakow-stag-do','stag','c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1'],['krakow-hen-do','hen','d41c1552178ec5c628d41549d71ac03df468a3f990cd5d4bcfa8112705461297'],['student-trips-poland','student','cf7f98481f2a3e4acf16f3111ad49a468aafa92a83ccbb9c2a85911cb75ade89']];
 for(const [key,file,sourceSha256]of definitions){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/'+key+'/production-1920.html',import.meta.url),'utf8');
  if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Group planning source changed: '+key);
  let markup=await readFile(new URL('./content/group-planning-'+file+'.html',import.meta.url),'utf8');
  markup=markup.replace(/\{\{([A-Za-z]+)\}\}/g,(_,name)=>{if(!['minimumAge','regularTime'].includes(name))throw Error('Unreviewed group offer fact');return values[name];});
  if(/[{}]/.test(markup))throw Error('Unresolved group offer facts');
  result.push({key,sourceSha256,sourceHtml,markup,reviewedOn:'2026-11-14',version:'2026-11-14.group-planning-1'});
 }
 return result;
}

export function reviseGroupPlanningEditorial({key,revision}){
 const identities=new Map([['krakow-stag-do','c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1'],['krakow-hen-do','d41c1552178ec5c628d41549d71ac03df468a3f990cd5d4bcfa8112705461297'],['student-trips-poland','cf7f98481f2a3e4acf16f3111ad49a468aafa92a83ccbb9c2a85911cb75ade89']]);
 if(!identities.has(key))return [];
 if(revision?.key!==key||revision.sourceSha256!==identities.get(key)||revision.reviewedOn!=='2026-11-14'||revision.version!=='2026-11-14.group-planning-1'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string')throw Error('Reviewed group planning identity required');
 const student=key==='student-trips-poland',intro='.et_pb_text_'+(student?'2':'0')+' .et_pb_text_inner',selectors=[intro];
 if(student)for(let i=0;i<4;i++)selectors.push('.et_pb_blurb_'+i+' .et_pb_module_header > span','.et_pb_blurb_'+i+' .et_pb_blurb_description');
 const fragment=student?'#et_pb_contact_form_0':key==='krakow-stag-do'?'#stag_trip_form':'#hen_do_form';
 const source=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),parts=[...templates.querySelectorAll('template')],seen=new Set(),pending=[],clean=s=>(s||'').replace(/\s+/g,' ').trim();
 if(parts.length!==selectors.length||clean(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Complete group planning templates required');
 const links=new Set([fragment,'__KTK_HOME_URL__about-us/how-to-join/','__KTK_HOME_URL__other-tours/']);
 for(const part of parts){
  const selector=part.getAttribute('data-target');if(part.attributes.length!==1||!selectors.includes(selector)||seen.has(selector))throw Error('Unreviewed group planning target');seen.add(selector);
  const heading=selector.endsWith('> span');
  if(!clean(part.content.textContent)||heading&&part.content.children.length)throw Error('Plain group label or nonempty copy required');
  for(const n of part.content.querySelectorAll('*'))if(!['P','H2','UL','LI','STRONG','A'].includes(n.tagName)||[...n.attributes].some(a=>n.tagName!=='A'||a.name!=='href')||n.tagName==='A'&&(!links.has(n.getAttribute('href'))||!clean(n.textContent)))throw Error('Unreviewed group planning markup or link');
  if(selector===intro&&(part.content.querySelectorAll('h2').length!==1||part.content.querySelectorAll('ul > li').length!==4||part.content.querySelectorAll('a[href="'+fragment+'"]').length!==1))throw Error('Complete group planning introduction required');
  if(selector!==intro&&part.content.querySelector('h2,ul,li,a'))throw Error('Student feature copy must stay compact');
  const old=source.querySelectorAll('#main-content '+selector),targets=document.querySelectorAll('#main-content '+selector);
  if(old.length!==1||targets.length!==1)throw Error('Missing or ambiguous group planning module');
  const target=targets[0],html=part.innerHTML.trim(),review=target.getAttribute('data-ktk-group-planning-review');
  if(target.querySelector('img,svg,iframe,script,style,form,input,button,a[name]'))throw Error('Protected control inside group planning text');
  if(review){if(review!==revision.reviewedOn||target.innerHTML!==html)throw Error('Changed reviewed group planning copy');}
  else if(target.innerHTML.trim()!==old[0].innerHTML.trim())throw Error('Original group planning markup changed');
  pending.push({selector,target,html});
 }
 // Validate the final feature and enquiry anchor before changing any module.
 if(document.querySelectorAll(fragment).length!==1||!document.querySelector(fragment).querySelector('form'))throw Error('Original group enquiry anchor required');
 for(const {target,html}of pending){target.innerHTML=html;target.dataset.ktkGroupPlanningReview=revision.reviewedOn;}
 return pending.map(({selector})=>({type:'group-planning-review',selector,reviewedOn:revision.reviewedOn}));
}

const styles='/* BEGIN Group planning */\nbody.ktk-code-page #main-content [data-ktk-group-planning-review] { text-align: left; }\nbody.ktk-code-page #main-content [data-ktk-group-planning-review] h2 { font-family: inherit; font-size: 22px; font-weight: 700; line-height: 1.35; margin: 18px 0 12px; }\nbody.ktk-code-page #main-content [data-ktk-group-planning-review] ul { padding-left: 1.25em; margin-bottom: 1em; }\nbody.ktk-code-page #main-content [data-ktk-group-planning-review] li + li { margin-top: .5em; }\nbody.ktk-code-page #main-content [data-ktk-group-planning-review] a { color: #c8006c; text-decoration: underline; text-underline-offset: .15em; }\n@media (max-width: 600px) {\n  body.ktk-code-page #main-content [data-ktk-group-planning-review] { padding-right: 24px; }\n}\n/* END Group planning */\n';
export async function buildGroupPlanningStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Established NYE guide */';if(css.split(anchor).length!==2)throw Error('Stable group style anchor required');
 if(css.includes('/* BEGIN Group planning */')||css.includes('/* END Group planning */')){if(css.split('/* BEGIN Group planning */').length!==2||css.split('/* END Group planning */').length!==2||!css.includes(styles+'\n'+anchor))throw Error('Group planning style drift');return;}
 await writeFile(file,css.replace(anchor,styles+'\n'+anchor));
}
