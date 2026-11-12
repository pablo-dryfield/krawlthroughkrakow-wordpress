import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fetchCompleteResponse} from './read-only-http.mjs';

const output=process.argv[2];if(!output)throw new Error('A new report path required');
try{await readFile(output);throw new Error('Preserve earlier availability evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const report={checkedAt:new Date().toISOString(),scope:'Bounded public HTTP sample, not all-route, consent, purchase or CWV verification. One staging-only origin probe; no server/account changes.',plannedRequests:6,responses:[],transportRetries:[],errors:[]};
const routes=['/staging/','/staging/about-us/','/staging/about-us/?ktk_health_check='+Date.now(),'/staging/life-professional-drunk/','/about-us/','/store2/pub-crawl-28/'];
try{
 for(const route of routes){
  const started=Date.now(),response=await fetchCompleteResponse('https://krawlthroughkrakow.com'+route,{}, {onRetry:row=>report.transportRetries.push(row)}),html=await response.text();
  const row={route,status:response.status,cache:response.headers.get('cf-cache-status'),elapsedMs:Date.now()-started,
   maintenance:/undergoing scheduled maintenance|Briefly unavailable for scheduled maintenance/i.test(html),sha256:createHash('sha256').update(html).digest('hex')};
  report.responses.push(row);
  if(row.status!==200||row.maintenance){report.errors.push('Availability failed; stopped the bounded sample without retrying HTTP errors.');break;}
 }
}catch(error){report.errors.push(error.message);}finally{
 report.passed=report.responses.length===report.plannedRequests&&report.errors.length===0;
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
