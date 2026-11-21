import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fetchCompleteResponse} from './read-only-http.mjs';

const args=process.argv.slice(2),output=args[0],stagingOnly=args.includes('--staging-only');
if(!output||output.startsWith('--')||args.slice(1).some(arg=>arg!=='--staging-only')||args.filter(arg=>arg==='--staging-only').length>1)throw new Error('A new report path and optional --staging-only flag required');
try{await readFile(output);throw new Error('Preserve earlier availability evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const report={checkedAt:new Date().toISOString(),scope:stagingOnly?'Staging-only bounded normal-cache HTTP/HTML sample with expected noindex and self-canonical guards; redirects are forbidden. Not all-route, rendered, consent, purchase or CWV verification. No server/account changes.':'Bounded public HTTP sample, not all-route, consent, purchase or CWV verification. One staging-only origin probe; no server/account changes.',plannedRequests:6,responses:[],transportRetries:[],errors:[]};
const routes=stagingOnly?['/staging/','/staging/about-us/','/staging/life-professional-drunk/','/staging/store2/pub-crawl-28/','/staging/store2/nye-pub-crawl-32/','/staging/about-us/how-to-join/']:['/staging/','/staging/about-us/','/staging/about-us/?ktk_health_check='+Date.now(),'/staging/life-professional-drunk/','/about-us/','/store2/pub-crawl-28/'];
const attribute=(tag,name)=>{const match=tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));return match?(match[1]??match[2]??match[3]??''):'';};
const stagingHead=html=>{
 const active=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const meta=[...active.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0]),links=[...active.matchAll(/<link\b[^>]*>/gi)].map(match=>match[0]);
 return {htmlNoindex:meta.some(tag=>['robots','googlebot'].includes(attribute(tag,'name').toLowerCase())&&/\b(noindex|none)\b/i.test(attribute(tag,'content'))),canonicals:links.filter(tag=>attribute(tag,'rel').toLowerCase().split(/\s+/).includes('canonical')).map(tag=>attribute(tag,'href'))};
};
try{
 if(stagingOnly&&routes.some(route=>!route.startsWith('/staging/')))throw new Error('Staging-only routes must remain under /staging/');
 for(const route of routes){
  const url='https://krawlthroughkrakow.com'+route;
  const started=Date.now(),response=await fetchCompleteResponse(url,stagingOnly?{redirect:'error'}:{}, {onRetry:row=>report.transportRetries.push(row)}),html=await response.text();
  const row={route,status:response.status,cache:response.headers.get('cf-cache-status'),elapsedMs:Date.now()-started,
   maintenance:/undergoing scheduled maintenance|Briefly unavailable for scheduled maintenance/i.test(html),sha256:createHash('sha256').update(html).digest('hex')};
  if(stagingOnly)Object.assign(row,stagingHead(html),{robotsHeader:response.headers.get('x-robots-tag')});
  report.responses.push(row);
  if(row.status!==200||row.maintenance){report.errors.push('Availability failed; stopped the bounded sample without retrying HTTP errors.');break;}
  if(stagingOnly&&(!row.htmlNoindex||row.canonicals.length!==1||row.canonicals[0]!==url)){report.errors.push('Expected staging HTML noindex/self-canonical guard failed; stopped without following redirects.');break;}
 }
}catch(error){report.errors.push(error.message);}finally{
 report.passed=report.responses.length===report.plannedRequests&&report.errors.length===0;
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
