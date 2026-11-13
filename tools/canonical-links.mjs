import {readFile} from 'node:fs/promises';

export const canonicalLinkPolicy=JSON.parse(await readFile(new URL('./code-page-link-policy.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../docs/code-pages/full-migration/manifest.json',import.meta.url),'utf8'));

export function validateLinkPolicy(policy,knownRoutes,observedAliases) {
 if(policy.schemaVersion!==1||!Array.isArray(policy.redirects)||!Array.isArray(policy.holds))throw new Error('Reviewed link policy required');
 const seen=new Set(observedAliases.map(row=>row.route));
 for(const row of policy.redirects){
  if(!/^\/(?!\/)(?!store(?:2)?(?:\/|$))[a-z0-9/-]+\/$/.test(row.from)||knownRoutes.includes(row.from)||seen.has(row.from)
   ||row.sourceStatus!==404||row.status!==301||!knownRoutes.includes(row.target)||!row.reason)throw new Error('Invalid or conflicting reviewed broken alias');
  seen.add(row.from);
 }
 return true;
}
validateLinkPolicy(canonicalLinkPolicy,manifest.routes.map(row=>row.route),manifest.aliases);
export const canonicalAliases=Object.freeze(Object.fromEntries([...manifest.aliases.map(row=>[row.route,row.target]),...canonicalLinkPolicy.redirects.map(row=>[row.from,row.target])]));
const incomingProductAliases=Object.freeze({'/store2/pub-crawl-28':'/store2/pub-crawl-28/'});

export function canonicalDestination(value,home='__KTK_HOME_URL__') {
 if(!value||value.startsWith('#'))return null;
 let url;try{url=new URL(value.replace(/^__KTK_HOME_URL__/,'https://krawlthroughkrakow.com/'),'https://krawlthroughkrakow.com/');}catch{return null;}
 if(!['http:','https:'].includes(url.protocol)||url.port||url.username||url.password||!['krawlthroughkrakow.com','www.krawlthroughkrakow.com'].includes(url.hostname))return null;
 const route=url.pathname.replace(/^\/staging(?=\/|$)/,'');
 const target=canonicalAliases[route]||incomingProductAliases[route];
 return target?home+target.slice(1)+url.search+url.hash:null;
}

export async function rewriteCanonicalLinks(page,home='__KTK_HOME_URL__') {
 const values=await page.evaluate(()=>[...new Set([...document.querySelectorAll('a[href],[data-parity-href]')].flatMap(node=>['href','data-parity-href'].map(name=>node.getAttribute(name)).filter(Boolean)))]);
 const changes=values.map(from=>({from,to:canonicalDestination(from,home)})).filter(row=>row.to&&row.to!==row.from);
 await page.evaluate(changes=>{
  const mapping=new Map(changes.map(row=>[row.from,row.to]));
  for(const node of document.querySelectorAll('a[href],[data-parity-href]'))for(const name of ['href','data-parity-href']){
   const before=node.getAttribute(name);if(mapping.has(before))node.setAttribute(name,mapping.get(before));
  }
 },changes);
 return changes;
}
