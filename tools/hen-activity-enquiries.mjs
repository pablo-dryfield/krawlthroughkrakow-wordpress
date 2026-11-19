import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const captureSHA256='d41c1552178ec5c628d41549d71ac03df468a3f990cd5d4bcfa8112705461297';
const markupSHA256='2b05b54ca7cc996a82245d7134af87c0380163139a4704e6a2942ede6f046065';

export async function loadHenActivityEnquiries(){
  const sourceHtml=await readFile(new URL('../docs/code-pages/full-migration/captures/krakow-hen-do/production-1920.html',import.meta.url),'utf8');
  const markup=await readFile(new URL('./content/hen-activity-enquiries.html',import.meta.url),'utf8');
  const sha=value=>createHash('sha256').update(value).digest('hex');
  if(sha(sourceHtml)!==captureSHA256||sha(markup)!==markupSHA256)throw Error('Exact original Hen capture and owner-approved enquiry wording required');
  return {key:'krakow-hen-do',sourceHtml,sourceSha256:captureSHA256,markup,markupSha256:markupSHA256,reviewedOn:'2026-11-19',version:'2026-11-19.hen-activity-enquiries-1'};
}

export function reviseHenActivityEnquiries({key,revision}){
  if(key!=='krakow-hen-do')return [];
  if(revision?.key!==key||revision.sourceSha256!=='d41c1552178ec5c628d41549d71ac03df468a3f990cd5d4bcfa8112705461297'||revision.markupSha256!=='2b05b54ca7cc996a82245d7134af87c0380163139a4704e6a2942ede6f046065'||revision.reviewedOn!=='2026-11-19'||revision.version!=='2026-11-19.hen-activity-enquiries-1'||typeof revision.sourceHtml!=='string'||typeof revision.markup!=='string')throw Error('Reviewed Hen activity enquiry identity required');
  const selectors=[2,3,4,5,6].map(n=>`.et_pb_text_${n} > .et_pb_text_inner`);
  const original=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),parts=[...templates.querySelectorAll('template')],pending=[],seen=new Set(),clean=s=>(s||'').replace(/\s+/g,' ').trim();
  if(parts.length!==5||clean(templates.body.textContent)||[...templates.head.children,...templates.body.children].some(n=>n.tagName!=='TEMPLATE'))throw Error('Complete five-section Hen enquiry templates required');
  for(const part of parts){
    const selector=part.getAttribute('data-target');
    if(part.attributes.length!==1||!selectors.includes(selector)||seen.has(selector))throw Error('Unexpected or repeated Hen enquiry target');seen.add(selector);
    if(part.content.children.length!==2||[...part.content.querySelectorAll('*')].some(n=>n.tagName!=='P'||n.attributes.length)||!clean(part.content.textContent))throw Error('Two plain approved Hen enquiry paragraphs required');
    const old=original.querySelectorAll('#main-content '+selector),nodes=document.querySelectorAll('#main-content '+selector);
    if(old.length!==1||nodes.length!==1)throw Error('Missing or ambiguous Hen enquiry module');
    const node=nodes[0];
    if(node.querySelector('form,input,textarea,select,button,img,picture,source,iframe,video,svg,script,style,a,[id]'))throw Error('Protected content inside Hen enquiry text');
    pending.push({selector,node,oldHTML:old[0].innerHTML.trim(),html:part.innerHTML.trim(),marker:node.getAttribute('data-ktk-hen-activity-review')});
  }
  const headingSelector='#main-content .et_pb_heading_3 .et_pb_module_heading',heads=document.querySelectorAll(headingSelector),oldHeads=original.querySelectorAll(headingSelector);
  if(heads.length!==1||oldHeads.length!==1||heads[0].tagName!=='H2'||clean(oldHeads[0].textContent)!=='Stretch Hummer with Strippers and Champagne'||heads[0].querySelector('*')||heads[0].id)throw Error('Exact original Hen transport heading required');
  if(document.querySelectorAll('#hen_do_form').length!==1||!document.querySelector('#hen_do_form form'))throw Error('Original Hen enquiry form destination required');
  const allOriginal=pending.every(p=>p.marker===null),allReviewed=pending.every(p=>p.marker==='2026-11-19');
  if(!allOriginal&&!allReviewed)throw Error('Mixed or unknown Hen enquiry review state');
  if(allReviewed){if(pending.some(p=>p.node.innerHTML!==p.html)||heads[0].innerHTML!=='Group Transport')throw Error('Reviewed Hen enquiry wording changed');return [];}
  if(pending.some(p=>p.node.innerHTML.trim()!==p.oldHTML)||heads[0].innerHTML!==oldHeads[0].innerHTML)throw Error('Original Hen enquiry preimage changed');
  // All five interiors, the heading and the form destination pass before mutation.
  // Existing reading/clearance selectors already cover these five modules.
  for(const {node,html}of pending){node.innerHTML=html;node.dataset.ktkHenActivityReview='2026-11-19';}
  heads[0].textContent='Group Transport';
  return [{type:'hen-activity-enquiry-review',key,reviewedOn:revision.reviewedOn,selectors,heading:headingSelector,formAndMediaUnchanged:true}];
}
