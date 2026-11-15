// Retry only the two observed browser transport errors, never HTTP/app failures.
export async function navigateReadOnly(page,url,{allowedUrls,onRetry=()=>{},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
 const u=new URL(url),local=['http://127.0.0.1:5184','http://127.0.0.1:5185'].includes(u.origin),staging=u.origin==='https://krawlthroughkrakow.com'&&u.pathname.startsWith('/staging/');
 if(u.username||u.password||u.hash||!(allowedUrls instanceof Set)||!allowedUrls.has(u.href)||!(local||staging)||/\/(?:store2?|wp-admin|wp-json|wp-login\.php)(?:\/|$)/.test(u.pathname))throw Error('Exact allowlisted read-only home/code-page URL required');
 for(let attempt=0;attempt<3;attempt++){
  try{return await page.goto(u.href,{waitUntil:'load',timeout:45000});}
  catch(error){
   const code=error.message?.match(/\bnet::(ERR_NETWORK_CHANGED|ERR_NAME_NOT_RESOLVED)\b/)?.[1];
   if(!code||attempt===2)throw error;
   onRetry({url:u.href,attempt:attempt+1,code,error:error.message,at:new Date().toISOString()});
   await wait([1000,3000][attempt]);
  }
 }
}
