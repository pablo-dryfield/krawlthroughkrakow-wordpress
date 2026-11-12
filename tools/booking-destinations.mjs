// Existing storefront fallback identities, reversed for migrated incoming links.
export const legacyProductSlugs=Object.freeze({
 '740813107':'airport-transfer-42','816624537':'beauty-the-beast-stag-45','637239272':'boat-party-41',
 '808765006':'bottomless-brunch-29','661114244':'bottomless-brunch-29','637056338':'brewery-tour-40',
 '637225330':'bubble-football-43','850960793':'cycle-tour-50','808765256':'dwarf-arrest-38',
 '637227366':'food-tour-krakow-48','637221989':'go-karting-30','740772463':'kidnapping-stag-prank-39',
 '637227458':'life-drawing-session-37','828444580':'morning-wake-up-47','800134329':'nye-pub-crawl-32',
 '637240753':'paintball-35','821424470':'party-bus-46','637205219':'polish-vodka-tasting-44',
 '835613122':'private-pub-crawl-31','637047413':'pub-crawl-28','637227393':'shooting-range-34','637239277':'strip-club-36'
});
export function bookingDestination(value, home='__KTK_HOME_URL__') {
 if(!value||value.startsWith('#'))return null;
 let url;
 try{url=new URL(value.replace(/^__KTK_HOME_URL__/,'https://krawlthroughkrakow.com/'),'https://krawlthroughkrakow.com/');}catch{return null;}
 if(!['http:','https:'].includes(url.protocol)||url.port)return null;
 let slug;
 if(['krawlthroughkrakow.com','www.krawlthroughkrakow.com'].includes(url.hostname)&&/^\/(?:staging\/)?store(?:\/|$)/.test(url.pathname)){
  const id=(url.pathname+url.hash).match(/(?:^|[-/])p(\d+)(?:\/|$)/)?.[1];
  slug=id?legacyProductSlugs[id]:null;
 }else if(['fareharbor.com','www.fareharbor.com'].includes(url.hostname)&&url.pathname.startsWith('/embeds/book/krawlthroughkrakow/')){
  const id=url.pathname.match(/\/items\/(\d+)(?:\/|$)/)?.[1];
  slug=({'216331':'pub-crawl-28','342685':'nye-pub-crawl-32'})[id];
 }else{return null;}
 const destination=new URL('https://krawlthroughkrakow.com/store2/'+(slug?slug+'/':''));
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_id','utm_term','utm_content','gclid','gbraid','wbraid']){
  const value=url.searchParams.get(key);if(value)destination.searchParams.set(key,value);
 }
 if(slug)destination.hash='book';
 return home+destination.pathname.slice(1)+destination.search+destination.hash;
}
export async function rewriteBookingLinks(page,home='__KTK_HOME_URL__') {
 const values=await page.evaluate(()=>[...new Set([...document.querySelectorAll('a[href],[data-parity-href]')].flatMap(e=>['href','data-parity-href'].map(name=>e.getAttribute(name)).filter(Boolean)))]);
 const changes=values.map(from=>({from,to:bookingDestination(from,home)})).filter(item=>item.to&&item.to!==item.from);
 await page.evaluate(changes=>{
  const mapping=new Map(changes.map(item=>[item.from,item.to]));
  for(const element of document.querySelectorAll('a[href],[data-parity-href]'))for(const name of ['href','data-parity-href']){
   const value=element.getAttribute(name);if(mapping.has(value))element.setAttribute(name,mapping.get(value));
  }
 },changes);
 return changes;
}
