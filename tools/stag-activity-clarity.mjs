import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadStagActivityClarity(){
 const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/krakow-stag-do/production-1920.html',import.meta.url),'utf8');
 const sourceSha256='c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1';
 if(createHash('sha256').update(sourceHtml).digest('hex')!==sourceSha256)throw Error('Original Stag activity source changed');
 return {key:'krakow-stag-do',sourceSha256,sourceHtml,markup:await readFile(new URL('./content/stag-activity-clarity.html',import.meta.url),'utf8'),reviewedOn:'2026-11-15',version:'2026-11-15.stag-activity-clarity-2'};
}

export function reviseStagActivityClarity({key,revision}){
 if(key!=='krakow-stag-do')return [];
 if(revision?.key!==key||revision.sourceSha256!=='c8c66dcbcefc50a3c0a0e2c6a381976624f1ab946055c3afcbc7eabf0b4c94c1'||revision.reviewedOn!=='2026-11-15'||revision.version!=='2026-11-15.stag-activity-clarity-2'||typeof revision.sourceHtml!=='string'||!revision.sourceHtml.includes('main-content')||typeof revision.markup!=='string')throw Error('Reviewed Stag activity identity required');
 const definitions=[[1,1],[2,2],[3,3],[4,1],[5,5],[7,7],[8,8],[9,9],[10,10],[11,11],[12,12],[13,13],[17,1]],selectors=definitions.map(([row,text])=>'.et_pb_row_'+row+' .et_pb_text_'+text+' > .et_pb_text_inner');
 const headlines=[['.et_pb_row_3 :is(h1,h2)','Stretch Hummer with Strippers and Champagne','Stretch Hummer Enquiries'],['.et_pb_row_5 :is(h1,h2)','Krakow AK47 Shooting Range Package','Krakow Shooting Range']];
 const original=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),parts=[...templates.querySelectorAll('template')],seen=new Set(),pending=[],headPending=[],clean=s=>(s||'').replace(/\s+/g,' ').trim();
 const one=(doc,selector)=>{const nodes=doc.querySelectorAll('#main-content '+selector);if(nodes.length!==1)throw Error('Missing or ambiguous Stag activity target');return nodes[0];};
 const attrs=n=>[...n.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0]));
 if(parts.length!==13||clean(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Complete Stag activity templates required');
 for(const part of parts){
  const selector=part.getAttribute('data-target');
  if(part.attributes.length!==1||!selectors.includes(selector)||seen.has(selector))throw Error('Unreviewed Stag activity template target');seen.add(selector);
  if(!clean(part.content.textContent))throw Error('Nonempty Stag activity copy required');
  for(const n of part.content.querySelectorAll('*'))if(!['P','H3','UL','LI','STRONG'].includes(n.tagName)||n.attributes.length||n.tagName==='H3'&&selector!==selectors[6])throw Error('Unreviewed Stag activity markup');
  const old=one(original,selector),node=one(document,selector),html=part.innerHTML.trim(),marker=node.getAttribute('data-ktk-stag-activity-review');
  if(node.tagName!==old.tagName||node.hasAttribute('data-ktk-group-planning-review')||node.hasAttribute('data-ktk-group-activity-review')||node.querySelector('img,svg,iframe,video,script,style,form,input,button,a,[id]'))throw Error('Protected Stag activity content');
  const expected=attrs(old);if(marker)expected.push(['data-ktk-stag-activity-review',revision.reviewedOn]);expected.sort((a,b)=>a[0].localeCompare(b[0]));
  if(JSON.stringify(attrs(node))!==JSON.stringify(expected))throw Error('Original Stag activity attributes changed');
  if(marker){if(marker!==revision.reviewedOn||node.innerHTML!==html)throw Error('Changed reviewed Stag activity copy');}
  else if(node.innerHTML.trim()!==old.innerHTML.trim())throw Error('Original Stag activity copy changed');
  pending.push({node,html,selector});
 }
 for(const [selector,before,after]of headlines){
  const old=one(original,selector),node=one(document,selector),marker=node.getAttribute('data-ktk-stag-activity-headline');
  if(old.tagName!=='H1'||old.children.length||old.textContent!==before||!['H1','H2'].includes(node.tagName)||node.children.length)throw Error('Exact Stag headline source required');
  const expected=attrs(old);if(node.tagName==='H2')expected.push(['data-ktk-heading-origin','h1']);if(marker)expected.push(['data-ktk-stag-activity-headline',revision.reviewedOn]);expected.sort((a,b)=>a[0].localeCompare(b[0]));
  if(JSON.stringify(attrs(node))!==JSON.stringify(expected)||marker&&marker!==revision.reviewedOn||node.textContent!==(marker?after:before))throw Error('Stag activity headline drift');
  headPending.push({node,text:after,selector});
 }
 // The original Airsoft wrapper also contains an unrelated three-P shooting tail.
 // Its nested Airsoft child is one of the thirteen reviewed interiors above.
 const tailSelector='.et_pb_row_17 .et_pb_text_17 > .et_pb_text_inner',oldOuter=one(original,tailSelector),outer=one(document,tailSelector),tailMarker=outer.getAttribute('data-ktk-stag-tail-cleared');
 const oldTail=[...oldOuter.children].filter(n=>n.tagName==='P'),tail=[...outer.children].filter(n=>n.tagName==='P');
 if(oldTail.length!==3||clean(oldTail[0].textContent)||!oldTail[1].textContent.includes('most experienced and professional instructors')||!oldTail[2].textContent.includes('M4, MP5')||oldTail.some(n=>n.querySelector('*'))||outer.querySelector('a,[id],form,input,button,img,svg,iframe,video'))throw Error('Exact misplaced shooting tail required');
 const tailAttrs=attrs(oldOuter);if(tailMarker)tailAttrs.push(['data-ktk-stag-tail-cleared',revision.reviewedOn]);tailAttrs.sort((a,b)=>a[0].localeCompare(b[0]));
 if(JSON.stringify(attrs(outer))!==JSON.stringify(tailAttrs)||tailMarker&&tailMarker!==revision.reviewedOn||(tailMarker?tail.length!==0:JSON.stringify(tail.map(n=>n.outerHTML))!==JSON.stringify(oldTail.map(n=>n.outerHTML))))throw Error('Misplaced shooting tail drift');
 const forms=document.querySelectorAll('#stag_trip_form');if(forms.length!==1||!forms[0].querySelector('form'))throw Error('Original unique Stag enquiry form required');
 // All copy, headline, attribute and form checks finish before the first mutation.
 for(const {node,html}of pending){node.innerHTML=html;node.dataset.ktkStagActivityReview=revision.reviewedOn;}
 for(const {node,text}of headPending){node.textContent=text;node.dataset.ktkStagActivityHeadline=revision.reviewedOn;}
 for(const n of tail)n.remove();outer.dataset.ktkStagTailCleared=revision.reviewedOn;
 return [...pending.map(({selector})=>({type:'stag-activity-clarity',selector,reviewedOn:revision.reviewedOn})),...headPending.map(({selector})=>({type:'stag-activity-headline',selector,reviewedOn:revision.reviewedOn})),{type:'stag-misplaced-shooting-tail',selector:tailSelector,reviewedOn:revision.reviewedOn}];
}
