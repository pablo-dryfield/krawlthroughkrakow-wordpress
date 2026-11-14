import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===[...keys].sort().join('|');

export async function loadReviewedArticlePresentation({catalogFile=new URL('./reviewed-article-presentation.json',import.meta.url)}={}){
 const bytes=await readFile(catalogFile),data=JSON.parse(bytes),manifest=JSON.parse(await readFile(path.join(root,'docs/code-pages/full-migration/manifest.json'),'utf8')),assetsBytes=await readFile(path.join(root,'docs/code-pages/full-migration/assets.json')),assets=JSON.parse(assetsBytes);
 if(!exactKeys(data,['schemaVersion','status','reviewedOn','version','assetManifestSha256','articles','containers','photo'])||data.schemaVersion!==1||data.status!=='source-reviewed'||data.reviewedOn!=='2026-11-14'||data.version!=='2026-11-14.article-presentation-2'||data.assetManifestSha256!==hash(assetsBytes))throw Error('Reviewed article presentation identity required');
 if(!Array.isArray(data.articles)||data.articles.length!==31||!Array.isArray(data.containers)||data.containers.length!==40)throw Error('Explicit thirty-one-article/forty-container scope required');
 const held=manifest.routes.find(r=>r.key==='post-hostel-hangover-cure');if(!held)throw Error('Held article identity required');
 const articleKeys=new Set(),ids=new Set();
 for(const a of data.articles){
  const r=manifest.routes.find(r=>r.key===a.key);
  if(!exactKeys(a,['key','postId','route','summary'])||!r||r.kind!=='blog post'||a.key===held.key||a.postId===held.postId||a.postId!==r.postId||a.route!==r.route||articleKeys.has(a.key)||ids.has(a.postId)||typeof a.summary!=='string'||a.summary!==a.summary.trim()||a.summary.length<80||a.summary.length>250||/[\u0000-\u001f<>]/.test(a.summary)||/utm_|gclid|gbraid|wbraid|https?:|javascript:/i.test(a.summary))throw Error('Invalid or held reviewed article summary');
  articleKeys.add(a.key);ids.add(a.postId);
 }
 const expected=manifest.routes.filter(r=>r.key==='blog'||r.key.startsWith('archive-')).map(r=>r.key).sort(),keys=data.containers.map(r=>r.key).sort();
 if(JSON.stringify(keys)!==JSON.stringify(expected)||new Set(keys).size!==40)throw Error('Every original blog/archive container must remain represented');
 let cards=0;const revisions=[];
 for(const c of data.containers){
  if(!exactKeys(c,['key','captureSha256','cardKeys'])||!/^[a-f0-9]{64}$/.test(c.captureSha256)||!Array.isArray(c.cardKeys)||new Set(c.cardKeys).size!==c.cardKeys.length||c.cardKeys.some(key=>!articleKeys.has(key)))throw Error('Invalid reviewed card inventory');
  const route=manifest.routes.find(r=>r.key===c.key);if(route.source!=='docs/code-pages/full-migration/captures/'+c.key)throw Error('Original card capture path changed');
  const sourceHtml=await readFile(path.join(root,route.source,'production-1920.html'),'utf8');if(hash(sourceHtml)!==c.captureSha256)throw Error('Original card capture changed: '+c.key);
  cards+=c.cardKeys.length;revisions.push({key:c.key,kind:'cards',version:data.version,reviewedOn:data.reviewedOn,catalogSha256:hash(bytes),sourceHtml,sourceSha256:c.captureSha256,cardKeys:c.cardKeys,articles:data.articles});
 }
 if(cards!==120)throw Error('Review the exact one-hundred-twenty-card scope before expanding it');
 const p=data.photo,article=manifest.routes.find(r=>r.key==='post-stages-of-drunkenness'),asset=assets[p.sourceUrl];
 if(!exactKeys(p,['key','captureSha256','sourceUrl','file','sha256','oldAlt','alt'])||p.key!==article.key||p.captureSha256!=='50a460acbc7a9ba69692f4a17c97397eb284834ad67b5883b0e1d0a06f3c6bc0'||p.sourceUrl!=='https://krawlthroughkrakow.com/wp-content/uploads/2016/07/UDEIMHp.jpg'||p.file!=='media/1cd6452f2538-UDEIMHp.jpg'||asset?.file!==p.file||asset.sha256!==p.sha256||hash(await readFile(path.join(root,'staging/wp-content/mu-plugins/ktk-code-pages-assets',p.file)))!==p.sha256||p.oldAlt!=='A man is lying on the ground, possibly in one of the stages of drunkenness, in front of police officers.'||p.alt!=='Police officers near people on the ground on a city street at night.')throw Error('Exact visually reviewed photo description required');
 const sourceHtml=await readFile(path.join(root,article.source,'production-1920.html'),'utf8');if(hash(sourceHtml)!==p.captureSha256)throw Error('Original photo capture changed');
 revisions.push({key:p.key,kind:'photo',version:data.version,reviewedOn:data.reviewedOn,catalogSha256:hash(bytes),sourceHtml,sourceSha256:p.captureSha256,photo:p});
 return revisions;
}

export function reviseReviewedArticlePresentation({key,revision}){
 const cards=typeof key==='string'&&(key==='blog'||/^archive-[a-z0-9-]+$/.test(key)),photo=key==='post-stages-of-drunkenness';if(!cards&&!photo)return [];
 if(revision?.key!==key||revision.kind!==(photo?'photo':'cards')||revision.version!=='2026-11-14.article-presentation-2'||revision.reviewedOn!=='2026-11-14'||!/^[a-f0-9]{64}$/.test(revision.sourceSha256||'')||!/^[a-f0-9]{64}$/.test(revision.catalogSha256||'')||typeof revision.sourceHtml!=='string')throw Error('Reviewed article presentation identity required');
 const doc=new DOMParser().parseFromString(revision.sourceHtml,'text/html'),main=document.querySelector('#main-content'),original=doc.querySelector('#main-content'),clean=s=>(s||'').replace(/\s+/g,' ').trim();
 if(!main||!original)throw Error('Original article presentation container required');
 if(photo){
  const p=revision.photo;if(!p||p.key!==key||p.sourceUrl!=='https://krawlthroughkrakow.com/wp-content/uploads/2016/07/UDEIMHp.jpg'||p.file!=='media/1cd6452f2538-UDEIMHp.jpg'||p.oldAlt!=='A man is lying on the ground, possibly in one of the stages of drunkenness, in front of police officers.'||p.alt!=='Police officers near people on the ground on a city street at night.')throw Error('Reviewed neutral photo identity required');
  const find=root=>[...root.querySelectorAll('img')].filter(n=>!n.closest('noscript')&&[p.sourceUrl,'__KTK_PAGE_ASSETS__'+p.file].includes(n.getAttribute('data-lazy-src')||n.getAttribute('src'))),a=find(original),b=find(main);
  if(a.length!==1||b.length!==1||a[0].getAttribute('alt')!==p.oldAlt||![p.oldAlt,p.alt].includes(b[0].getAttribute('alt')))throw Error('Original featured photo/description changed');
  if(b[0].getAttribute('alt')===p.alt)return [];
  b[0].setAttribute('alt',p.alt);return[{type:'neutral-article-image-description',key,reviewedOn:revision.reviewedOn,file:p.file}];
 }
 if(!Array.isArray(revision.articles)||revision.articles.length!==31||!Array.isArray(revision.cardKeys))throw Error('Reviewed card identities required');
 const articles=revision.articles,find=root=>[...root.querySelectorAll('article.et_pb_post')].map(node=>({node,article:articles.find(a=>node.classList.contains('post-'+a.postId))})).filter(r=>r.article),sourceCards=find(original),currentCards=find(main),expected=JSON.stringify(revision.cardKeys);
 if(JSON.stringify(sourceCards.map(r=>r.article.key))!==expected||JSON.stringify(currentCards.map(r=>r.article.key))!==expected||new Set(revision.cardKeys).size!==revision.cardKeys.length)throw Error('Original card order/count changed');
 const marker=main.getAttribute('data-ktk-reviewed-excerpts');if(marker&&marker!==revision.version)throw Error('Article-summary version changed');
 const target=node=>{
  const p=node.querySelectorAll('.post-content-inner > p'),wrapped=node.querySelectorAll(':scope > p[data-ktk-reviewed-summary]'),raw=[...node.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&clean(n.textContent));
  if(p.length===1&&!wrapped.length&&!raw.length&&!p[0].querySelector('a,[id],img,video,iframe,form,script,style,input,button'))return{node:p[0],mode:'paragraph',reviewed:p[0].hasAttribute('data-ktk-reviewed-summary')};
  if(!p.length&&wrapped.length===1&&!raw.length&&wrapped[0].children.length===0)return{node:wrapped[0],mode:'text',reviewed:true};
  if(!p.length&&!wrapped.length&&raw.length===1)return{node:raw[0],mode:'text',reviewed:false};
  throw Error('Unreviewed article-summary structure');
 };
 const plans=[];
 for(let i=0;i<currentCards.length;i++){
  const row=currentCards[i],a=sourceCards[i],conf=row.article;
  if(conf.key==='post-hostel-hangover-cure'||typeof conf.summary!=='string'||conf.summary!==conf.summary.trim()||conf.summary.length<80||conf.summary.length>250||/[\u0000-\u001f<>]/.test(conf.summary))throw Error('Invalid or held article summary');
  if(row.node.id!==a.node.id||clean(row.node.querySelector('.entry-title')?.textContent)!==clean(a.node.querySelector('.entry-title')?.textContent)||!row.node.querySelector('.entry-title'))throw Error('Original article-card title/identity changed');
  const before=target(a.node),now=target(row.node);if(before.mode!==now.mode||before.reviewed||now.reviewed!==!!marker||marker&&now.node.getAttribute('data-ktk-reviewed-summary')!==revision.version||clean(now.node.textContent)!==(marker?conf.summary:clean(before.node.textContent)))throw Error('Original or reviewed article summary changed');
  plans.push({node:now.node,mode:now.mode,article:conf});
 }
 if(marker||!plans.length)return [];
 // Validate every card before changing the first one, including late-page cards.
 for(const p of plans){const paragraph=p.mode==='paragraph'?p.node:document.createElement('p');paragraph.textContent=p.article.summary;paragraph.dataset.ktkReviewedSummary=revision.version;if(p.mode==='text')p.node.replaceWith(paragraph);}
 main.dataset.ktkReviewedExcerpts=revision.version;
 return plans.map(p=>({type:'reviewed-article-summary',key:p.article.key,postId:p.article.postId,reviewedOn:revision.reviewedOn,format:p.mode}));
}

const excerptScope='body.ktk-code-page #main-content[data-ktk-reviewed-excerpts="2026-11-14.article-presentation-2"] p[data-ktk-reviewed-summary="2026-11-14.article-presentation-2"]';
const excerptStyles='/* BEGIN Reviewed article summary readability */\n'+excerptScope+' { font-size: 16px; line-height: 1.65; text-align: left; letter-spacing: 0; margin: 0; padding: 0; }\n@media (max-width: 600px) {\n  '+excerptScope+' { padding-right: 24px; }\n}\n/* END Reviewed article summary readability */\n';
export async function buildReviewedArticlePresentationStyles(file){
 const css=await readFile(file,'utf8'),anchor='/* BEGIN Practical night-out guidance */';if(css.split(anchor).length!==2)throw Error('Stable article-summary style anchor required');
 if(css.includes('/* BEGIN Reviewed article summary readability */')||css.includes('/* END Reviewed article summary readability */')){if(css.split('/* BEGIN Reviewed article summary readability */').length!==2||css.split('/* END Reviewed article summary readability */').length!==2||!css.includes(excerptStyles+'\n'+anchor))throw Error('Reviewed article-summary style drift');return;}
 await writeFile(file,css.replace(anchor,excerptStyles+'\n'+anchor));
}
