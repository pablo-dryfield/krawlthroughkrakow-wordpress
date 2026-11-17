import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadHomepageAliasExcerpts() {
  const raw=await readFile(new URL('./homepage-alias-excerpts.json',import.meta.url));
  if(createHash('sha256').update(raw).digest('hex')!=='633fcc554ab4113716a9291cf64831b99cada3a17e2d33a29a7c0bb0519e0287')throw Error('Exact reviewed homepage-alias input required');
  const data=JSON.parse(raw),keys=['archive-author-dpbowman','archive-category-drinking-games','archive-category-krakow-guides','archive-category-krakow-nightlife','blog'];
  const manifest=JSON.parse(await readFile(new URL('../docs/code-pages/full-migration/manifest.json',import.meta.url),'utf8'));
  if(data.schemaVersion!==1||data.version!=='2026-11-17.homepage-alias-excerpts-1'||data.sourceCommit!=='275c9482b99c146ccaec2b5bad4c0d0b73eb3063'||data.reviewedOn!=='2026-11-17'||JSON.stringify(data.pages.map(r=>r.key))!==JSON.stringify(keys)
    ||manifest.aliases.filter(r=>r.route==='/krakow-pub-crawl/'&&r.target==='/'&&r.status==='existing-homepage-canonical-alias').length!==1)throw Error('Exact existing homepage alias and five container identities required');
  for(const r of data.pages)if(!manifest.routes.some(p=>p.key===r.key)||createHash('sha256').update(r.preparedHtml).digest('hex')!==r.preparedSha256||r.targets.length!==(r.key==='blog'?2:1))throw Error('Exact prepared alias excerpts required');
  return data.pages.map(r=>({...r,version:data.version,summary:data.summary}));
}

export function reviseHomepageAliasExcerpts({key,revision,sourceReference=false}) {
  if(!['archive-author-dpbowman','archive-category-drinking-games','archive-category-krakow-guides','archive-category-krakow-nightlife','blog'].includes(key))return [];
  if(revision?.key!==key||revision.version!=='2026-11-17.homepage-alias-excerpts-1'||typeof revision.preparedHtml!=='string'||typeof revision.summary!=='string'||revision.summary.length<80||revision.summary.length>250||/[<>\u0000-\u001f]/.test(revision.summary)||!Array.isArray(revision.targets)||revision.targets.length!==(key==='blog'?2:1)||typeof sourceReference!=='boolean')throw Error('Exact reviewed homepage-alias revision required');
  const current=document.querySelector('#main-content'),reference=new DOMParser().parseFromString(revision.preparedHtml,'text/html').querySelector('#main-content');
  if(!current||!reference||document.querySelectorAll('#main-content').length!==1||reference.querySelector('[data-ktk-homepage-excerpt]'))throw Error('One original alias container main required');
  const selectors=key==='blog'?['article.post-6403 .post-content-inner > p','.et_pb_post_slide-6403 .et_pb_slide_content > div > p']:['article.post-6403'];
  const apply=root=>{
    const inverses=[];
    for(const [i,t] of revision.targets.entries()){
      if(t.selector!==selectors[i]||t.mode!==(key==='blog'?'paragraph':'raw')||typeof t.before!=='string')throw Error('Exact six original alias excerpt slots required');
      const matches=root.querySelectorAll(t.selector);if(matches.length!==1)throw Error('One original alias excerpt slot required');const target=matches[0];
      const paragraph=document.createElement('p');paragraph.setAttribute('data-ktk-homepage-excerpt',revision.version);paragraph.textContent=revision.summary;
      if(t.mode==='paragraph'){
        if(target.outerHTML!==t.before||target.children.length||target.attributes.length)throw Error('Original plain Blog excerpt changed');
        const original=target.cloneNode(true);target.replaceWith(paragraph);inverses.push(()=>paragraph.replaceWith(original));
      }else{
        const raw=[...target.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
        if(raw.length!==1||raw[0].textContent!==t.before||target.querySelector('[data-ktk-homepage-excerpt]'))throw Error('Original raw archive excerpt changed');
        const original=raw[0].cloneNode(true),space=document.createTextNode(t.before.match(/\s*$/)[0]);raw[0].replaceWith(paragraph,space);inverses.push(()=>{paragraph.replaceWith(original);space.remove();});
      }
    }
    return inverses;
  };
  const candidate=reference.cloneNode(true);apply(candidate);if(current.outerHTML===candidate.outerHTML)return [];
  if(sourceReference){
    // Original remote/lazy/Rocket image attributes remain in the read-only projection.
    // Exact application bytes are enforced by the separate portable branch and source inverses.
    const facts=n=>({text:n.textContent.replace(/\s+/g,' ').trim(),ids:[n,...n.querySelectorAll('[id]')].filter(n=>n.id).map(n=>n.id),headings:[...n.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n=>[n.tagName,n.id,n.textContent]),photos:[...n.querySelectorAll('img')].map(n=>['alt','width','height'].map(a=>n.getAttribute(a)))});
    if(JSON.stringify(facts(current))!==JSON.stringify(facts(reference)))throw Error('Complete original alias source-reference semantics required');
  }else if(current.outerHTML!==reference.outerHTML)throw Error('Prepared alias body changed; refuse before mutation');
  const detached=current.cloneNode(true),before=detached.outerHTML,inverses=apply(detached),updated=detached.cloneNode(true);for(const undo of inverses.reverse())undo();
  if(detached.outerHTML!==before)throw Error('Every byte outside alias excerpts must remain');
  current.replaceWith(updated);return revision.targets.map(t=>({type:'homepage-alias-excerpt',key,selector:t.selector,version:revision.version}));
}

export async function buildHomepageAliasExcerptStyles(file) {
  const source=await readFile(file,'utf8'),styles=await readFile(new URL('./homepage-alias-excerpts.css',import.meta.url),'utf8'),anchor='/* END Category archive navigation */\n';
  if(source.split(anchor).length!==2)throw Error('Exact category-navigation boundary required');
  if(source.includes('/* BEGIN Homepage alias excerpts */')||source.includes('/* END Homepage alias excerpts */')){
    if(source.split('/* BEGIN Homepage alias excerpts */').length!==2||source.split('/* END Homepage alias excerpts */').length!==2||!source.includes(anchor+styles))throw Error('Homepage-alias styles changed');return;
  }
  await writeFile(file,source.replace(anchor,anchor+styles));
}
