// A crawl-only transport boundary. It does not change site consent or account settings.
const LIVE='https://krawlthroughkrakow.com';
const PRIVATE=/(?:^|\/)(?:wp-admin|wp-login\.php|cart|carts|checkout|confirmation|confirmations|orders?|bookings?|customers?|quotes?|saved-carts|ongoing-carts|private|backups?|deploy-backups|collect|collection|telemetry|zaraz|ktk-private[^/]*|ktk-recovery[^/]*)(?:\/|$)/i;
const STATIC=/\.(?:js|mjs|css|woff2?|ttf|otf|eot|jpg|jpeg|png|gif|webp|avif|svg|ico|mp4|webm)$/i;
const STATIC_QUERY=new Set(['ver','v','version','w','h','width','height','quality','format','fit','auto']);

export function safeRequestFacts(raw){
 try{const u=new URL(raw);return {origin:u.origin,path:u.pathname,hasQuery:!!u.search};}
 catch{return {invalid:true};}
}

export function createRenderedCrawlPolicy({documentUrls,productSlugs,fixtureOrigin=null}){
 let origin=LIVE;
 if(fixtureOrigin!==null){
  const u=new URL(fixtureOrigin);
  if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('Only explicit loopback test fixtures');
  origin=u.origin;
 }
 if(!(documentUrls instanceof Set)||!documentUrls.size||!(productSlugs instanceof Set))throw Error('Explicit known document/catalog identities required');
 const api=new Set(['/staging/wp-json/ktk-storefront/v1/config','/staging/wp-json/ktk-storefront/v1/products']);
 for(const slug of productSlugs){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error('Invalid public slug');api.add('/staging/wp-json/ktk-storefront/v1/products/'+slug);}
 for(const raw of documentUrls){const u=new URL(raw);if(u.origin!==origin||!u.pathname.startsWith('/staging/')||u.search||u.hash||u.username||u.password||PRIVATE.test(u.pathname))throw Error('Known clean staging documents only');}
 return Object.freeze({origin,decide({url,method,type,currentDocument,isMainFrame=false}){
  if(!['GET','HEAD'].includes(method))return {allow:false,reason:'non-read'};
  let u,p;
  try{u=new URL(url);p=decodeURIComponent(u.pathname);}catch{return {allow:false,reason:'invalid-url'};}
  if(u.username||u.password||u.hash)return {allow:false,reason:'credentials-or-fragment'};
  if(u.origin!==origin){
   const image=u.origin==='https://media.krawlthroughkrakow.com'&&type==='image'&&!u.search&&/^\/products\/[0-9]+\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp|avif)$/.test(p);
   return {allow:image,reason:image?'reviewed-public-product-image':'foreign-or-provider'};
  }
  if(type==='document')return {allow:isMainFrame&&url===currentDocument&&documentUrls.has(url),reason:'exact-main-document'};
  if(['fetch','xhr'].includes(type)&&!u.search&&api.has(p))return {allow:true,reason:'public-catalog-api'};
  if(PRIVATE.test(p)||/(?:^|\/)wp-json(?:\/|$)/i.test(p))return {allow:false,reason:'protected-or-collector'};
  if([...u.searchParams.keys()].some(k=>!STATIC_QUERY.has(k)))return {allow:false,reason:'unreviewed-static-query'};
  if(type==='font'&&!u.search&&/^\/cf-fonts\/s\/[a-z0-9-]+\/[0-9.]+\/(?:latin|latin-ext)\/[1-9]00\/(?:normal|italic)\.woff2$/.test(p))return {allow:true,reason:'first-party-static-font'};
  if(p==='/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js'&&type==='script')return {allow:true,reason:'reviewed-email-decoder'};
  const staticRoot=/^\/(?:staging\/)?wp-(?:content|includes)\//.test(p);
  const staticType=['script','stylesheet','image','font','media'].includes(type)||type==='other'&&/\.(?:svg|png|ico)$/i.test(p);
  return {allow:staticRoot&&STATIC.test(p)&&staticType,reason:'public-static-asset'};
 }});
}

export async function guardRenderedRoute(route,policy,{currentDocument,onEvent=()=>{},onFetched=async()=>{}}){
 const q=route.request();let isMainFrame=false;
 try{isMainFrame=q.isNavigationRequest()&&!q.frame().parentFrame();}catch{}
 const facts={...safeRequestFacts(q.url()),method:q.method(),type:q.resourceType()};
 const decision=policy.decide({url:q.url(),method:q.method(),type:q.resourceType(),currentDocument,isMainFrame});
 if(!decision.allow){onEvent({...facts,action:'blocked',reason:decision.reason});await route.abort('blockedbyclient');return;}
 let response;
 try{
  // Do not permit an allowed resource to redirect into a protected/foreign URL.
  response=await route.fetch({maxRedirects:0,maxRetries:0,timeout:30000});
  if(response.status()>=300&&response.status()<400){
   onEvent({...facts,action:'blocked-redirect',status:response.status(),location:safeRequestFacts(new URL(response.headers().location||'',q.url()).href)});
   await route.abort('blockedbyclient');return;
  }
  if(response.url()!==q.url())throw Error('Unexpected transport URL change');
  await onFetched(q,response);
  onEvent({...facts,action:'read',status:response.status(),reason:decision.reason,contentType:response.headers()['content-type']||null});
  await route.fulfill({response});
 }catch(error){
  onEvent({...facts,action:'transport-error',message:error.message});
  await route.abort('failed').catch(()=>{});
 }finally{if(response)try{await response.dispose();}catch(error){onEvent({...facts,action:'response-dispose-error',message:error.message});}}
}

export async function installRenderedCrawlGuard(context,policy,options){
 let closing=false;const pending=new Set(),errors=[];
 const onEvent=event=>{if(['transport-error','response-dispose-error','guard-handler-error'].includes(event.action))errors.push(event);options.onEvent?.(event);};
 await context.route('**/*',route=>{
  const task=(async()=>{
   if(closing){await route.abort('blockedbyclient').catch(()=>{});return;}
   await guardRenderedRoute(route,policy,{...options,onEvent});
  })().catch(error=>onEvent({action:'guard-handler-error',message:error.message}));
  pending.add(task);void task.then(()=>pending.delete(task));return task;
 });
 async function drain(){
  const deadline=Date.now()+31000;
  while(pending.size){
   if(Date.now()>deadline)throw Error('Routed responses did not drain within31seconds');
   await Promise.race([Promise.all([...pending]),new Promise(resolve=>setTimeout(resolve,100))]);
  }
 }
 return {pendingCount:()=>pending.size,drain,async close(){
  try{await drain();}catch(error){onEvent({action:'guard-handler-error',message:error.message});}
  // Keep interception installed until the context has closed. No unroute/unguarded gap.
  closing=true;await context.close();await Promise.all([...pending]);
  return {contextClosed:true,pendingHandlers:pending.size,errors};
 }};
}
