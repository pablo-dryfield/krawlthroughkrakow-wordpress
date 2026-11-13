import {readFile,writeFile} from 'node:fs/promises';

export function initializeEventPromotions(){
 if(window.__KTK_EVENT_PROMOTIONS_INITIALIZED__)return;
 const roots=[...document.querySelectorAll('[data-ktk-event-promotion="nye"][data-ktk-promotion-ends]')];
 if(!roots.length)return;
 window.__KTK_EVENT_PROMOTIONS_INITIALIZED__=true;
 let timer;
 const select=(root,selector)=>[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
 const refresh=()=>{
  clearTimeout(timer);let next=Infinity;
  for(const root of roots){
   const raw=root.dataset.ktkPromotionEnds;if(!/^\d{10}$/.test(raw||''))continue;
   const remaining=Number(raw)*1000-Date.now();
   if(remaining>0&&root.dataset.ktkPromotionState!=='expired'){next=Math.min(next,remaining,60000);continue;}
   if(root.dataset.ktkPromotionState==='expired'&&root.dataset.ktkPromotionApplied==='true')continue;
   for(const template of root.querySelectorAll('template[data-ktk-promotion-replaces]')){
    const selector=template.dataset.ktkPromotionReplaces;
    if(selector!=='.et_pb_countdown_timer')continue;
    const targets=root.querySelectorAll(selector);
    if(targets.length===1){
     const content=template.content.cloneNode(true),primary=content.querySelector('[data-ktk-promotion-primary]');
     if(primary){const heading=document.createElement('h1');for(const attribute of primary.attributes)heading.setAttribute(attribute.name,attribute.value);heading.append(...primary.childNodes);primary.replaceWith(heading);}
     targets[0].replaceWith(content);template.remove();
    }
   }
   for(const node of select(root,'[data-ktk-expired-text]'))node.textContent=node.dataset.ktkExpiredText;
   for(const node of select(root,'a[data-ktk-expired-href]')){
    let url;try{url=new URL(node.dataset.ktkExpiredHref,location.href);}catch{continue;}
    if(url.origin!==location.origin||!/^\/(?:staging\/)?new-years-eve\/$/.test(url.pathname)||url.search)continue;
    node.href=url.href;node.removeAttribute('data-product-id');
    if(node.dataset.ktkExpiredLabel)(node.querySelector('[data-ktk-promotion-label]')||node).textContent=node.dataset.ktkExpiredLabel;
    if(node.dataset.ktkExpiredAriaLabel)node.setAttribute('aria-label',node.dataset.ktkExpiredAriaLabel);
    if(node.dataset.book)node.dataset.book='nye-updates';
   }
   for(const node of root.querySelectorAll('[data-ktk-promotion-remove]'))node.remove();
   if(root.dataset.ktkExpiredDescription){
    const description=root.dataset.ktkExpiredDescription,headline=root.dataset.ktkExpiredHeadline;
    for(const meta of document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'))meta.content=description;
    for(const script of document.querySelectorAll('script[type="application/ld+json"][data-ktk-event-schema]')){
     try{const data=JSON.parse(script.textContent),entities=data['@graph']||[data];
      for(const entity of entities){
       if(entity['@type']==='WebPage'){entity.description=description;if(headline)entity.name=headline;}
       if(entity['@type']==='BreadcrumbList'&&headline)for(const item of entity.itemListElement||[])if(item.position===2)item.name=headline;
      }
      script.textContent=JSON.stringify(data);
     }catch(_){/* Preserve an unrecognized schema rather than inventing it. */}
    }
   }
   root.dataset.ktkPromotionState='expired';root.dataset.ktkPromotionApplied='true';
  }
  if(Number.isFinite(next))timer=setTimeout(refresh,Math.max(1,next));
 };
 refresh();
 addEventListener('pageshow',refresh);
 document.addEventListener('visibilitychange',refresh);
}

export async function buildEventPromotionRuntime(file){
 const start='/* BEGIN shared event promotion runtime */',end='/* END shared event promotion runtime */';
 const original=await readFile(file,'utf8');let source=original;
 const a=source.split(start).length-1,b=source.split(end).length-1;
 if(a||b){if(a!==1||b!==1||source.indexOf(start)>source.indexOf(end))throw Error('Malformed event-promotion runtime markers');source=source.slice(0,source.indexOf(start)).trimEnd()+source.slice(source.indexOf(end)+end.length);}
 const output=source.trimEnd()+'\n\n'+start+'\n('+initializeEventPromotions.toString()+')();\n'+end+'\n';
 if(output!==original)await writeFile(file,output);
}
