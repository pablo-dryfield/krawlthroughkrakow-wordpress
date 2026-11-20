import {classifyGraphLink,resolveGraphAlias} from './internal-link-graph.mjs';

// Runs in a browser. Inert parsing is used only for the separate initial-HTML graph.
export function extractRenderedLinkFacts({html=null}={}){
 const live=html===null,doc=live?document:new DOMParser().parseFromString(html,'text/html');
 const main=doc.querySelector('#main-content,main,#ktk-storefront-public-content,#ktk-storefront-root');
 if(!main)throw Error('Real main content required');
 const bands=[...doc.querySelectorAll('.et_pb_section')].filter(section=>{
  const paths=[...section.querySelectorAll('a[href]')].map(a=>{try{return new URL(a.getAttribute('href'),'https://krawlthroughkrakow.com/staging/').pathname;}catch{return '';}});
  return ['terms-and-conditions/','privacy-policy/','tour-service-disclaimer/'].every(p=>paths.some(h=>h.endsWith('/'+p)))&&paths.some(h=>/^\/staging\/store2\/(?:pub-crawl-28\/?)?$/.test(h));
 });
 const links=[...doc.querySelectorAll('a[href],[data-parity-href]')].map(node=>{
  const rect=live?node.getBoundingClientRect():null,s=live?getComputedStyle(node):null;
  return {href:node.getAttribute('href')??node.getAttribute('data-parity-href'),native:node.matches('a[href]'),context:node.closest('footer,#main-footer,.et-l--footer,.et-l--header,#main-header')||bands.some(b=>b.contains(node))?'shell':node.closest('#main-content,main,#ktk-storefront-public-content,#ktk-storefront-root')?'main':'shell',nofollow:node.getAttribute('rel')?.toLowerCase().split(/\s+/).includes('nofollow')||false,visible:live?rect.width>0&&rect.height>0&&s.display!=='none'&&s.visibility==='visible':null,ariaHidden:!!node.closest('[aria-hidden="true"],[inert]')};
 });
 return {links,h1:[...doc.querySelectorAll('h1')].map(n=>n.textContent.trim()),robots:doc.querySelector('meta[name="robots"]')?.content||null,readyState:live?doc.readyState:null};
}

export function classifySnapshotLinks(links,route){
 return links.map(({href,...rest})=>({...classifyGraphLink(href,route),...rest}));
}

export function summarizeRenderedGraph(pages,redirects={},visibleOnly=false){
 const known=new Set(pages.map(p=>p.route));
 if(known.size!==pages.length||!known.has('/'))throw Error('Unique complete route identities and home required');
 const edges=[],excluded={},unknown=new Map();
 for(const page of pages)for(const link of page.links){
  if(link.kind!=='page'){excluded[link.kind]=(excluded[link.kind]||0)+1;continue;}
  const to=resolveGraphAlias(link.route,redirects);
  if(!known.has(to)){if(!unknown.has(to))unknown.set(to,new Set());unknown.get(to).add(page.route);continue;}
  if(to===page.route||visibleOnly&&(!link.visible||link.ariaHidden))continue;
  edges.push({from:page.route,to,context:link.context,native:link.native,follow:!link.nofollow,viaAlias:to!==link.route,hasQuery:link.hasQuery,hasFragment:link.hasFragment,insecure:link.insecure});
 }
 const distance=new Map([['/',0]]),queue=['/'];
 for(let i=0;i<queue.length;i++)for(const e of edges)if(e.from===queue[i]&&e.native&&e.follow&&!distance.has(e.to)){distance.set(e.to,distance.get(e.from)+1);queue.push(e.to);}
 const rows=pages.map(p=>({route:p.route,kind:p.kind,nativeDepth:distance.get(p.route)??null,incomingPages:new Set(edges.filter(e=>e.to===p.route&&e.native&&e.follow).map(e=>e.from)).size}));
 return {pages:rows,edges,excluded,unknown:[...unknown].map(([route,sources])=>({route,sources:[...sources].sort()})).sort((a,b)=>a.route.localeCompare(b.route)),unreachable:rows.filter(r=>r.nativeDepth===null).map(r=>r.route)};
}
