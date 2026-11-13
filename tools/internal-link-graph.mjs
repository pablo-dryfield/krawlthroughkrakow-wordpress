const origin='https://krawlthroughkrakow.com';
const prefix='/staging';

// Report URL structure only. Attribution, session and fragment values never enter the graph.
export function classifyGraphLink(href,fromRoute){
 if(typeof href!=='string')return {kind:'invalid'};
 let url;
 try{url=new URL(href,origin+prefix+fromRoute);}catch{return {kind:'invalid'};}
 if(!['http:','https:'].includes(url.protocol))return {kind:'non-http'};
 if(url.username||url.password)return {kind:'invalid'};
 if(![origin,'http://krawlthroughkrakow.com'].includes(url.origin))return {kind:'foreign'};
 if(!url.pathname.startsWith(prefix+'/'))return {kind:'outside-staging'};
 const route=url.pathname.slice(prefix.length);
 const flags={route,hasQuery:!!url.search,hasFragment:!!url.hash,insecure:url.protocol!=='https:'};
 if(/^\/(?:wp-admin|wp-json|wp-login\.php|store)(?:\/|$)/.test(route)||/^\/store2\/(?:cart|checkout|confirmation)(?:\/|$)/.test(route))return {kind:'protected',...flags};
 if(/\.[a-z0-9]{2,6}$/i.test(route))return {kind:'media',...flags};
 return {kind:'page',...flags};
}

export function resolveGraphAlias(route,redirects){
 const seen=new Set();
 while(Object.hasOwn(redirects,route)){
  if(seen.has(route))throw Error('Internal-link alias cycle');
  seen.add(route);const next=redirects[route].target;
  if(typeof next!=='string'||!next.startsWith('/')||next.startsWith('//')||/[?#]/.test(next))throw Error('Invalid internal-link alias target');
  route=next;
 }
 return route;
}

export function summarizeInternalGraph(pages,redirects={}){
 const routes=new Set(pages.map(page=>page.route));
 if(routes.size!==pages.length||!routes.has('/'))throw Error('Unique known routes and homepage required');
 const edges=[],excluded={},unknown=new Map();
 for(const page of pages)for(const link of page.links){
  const classified=classifyGraphLink(link.href,page.route);
  if(classified.kind!=='page'){excluded[classified.kind]=(excluded[classified.kind]||0)+1;continue;}
  const target=resolveGraphAlias(classified.route,redirects);
  if(!routes.has(target)){
   if(!unknown.has(target))unknown.set(target,new Set());unknown.get(target).add(page.route);continue;
  }
  if(target===page.route)continue;
  edges.push({from:page.route,to:target,context:link.context,native:link.native,follow:!link.nofollow,viaAlias:target!==classified.route,hasQuery:classified.hasQuery,hasFragment:classified.hasFragment,insecure:classified.insecure});
 }
 const distances=filter=>{
  const distance=new Map([['/',0]]),queue=['/'];
  for(let index=0;index<queue.length;index++)for(const edge of edges){
   if(edge.from!==queue[index]||!filter(edge)||distance.has(edge.to))continue;
   distance.set(edge.to,distance.get(edge.from)+1);queue.push(edge.to);
  }
  return distance;
 };
 const native=distances(edge=>edge.native&&edge.follow);
 const contextual=distances(edge=>edge.native&&edge.follow&&edge.context==='main');
 const rows=pages.map(page=>{
  const inbound=edges.filter(edge=>edge.to===page.route&&edge.native&&edge.follow);
  return {route:page.route,kind:page.kind,nativeDepth:native.get(page.route)??null,mainOnlyDepth:contextual.get(page.route)??null,incomingPages:new Set(inbound.map(edge=>edge.from)).size,contextualIncomingPages:new Set(inbound.filter(edge=>edge.context==='main').map(edge=>edge.from)).size,outgoingPages:new Set(edges.filter(edge=>edge.from===page.route&&edge.native&&edge.follow).map(edge=>edge.to)).size};
 });
 return {pages:rows,edges,excluded,unknown:[...unknown].sort(([a],[b])=>a.localeCompare(b)).map(([route,sources])=>({route,sources:[...sources].sort()})),unreachable:rows.filter(row=>row.nativeDepth===null).map(row=>row.route)};
}
