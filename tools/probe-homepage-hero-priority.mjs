import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

// Browser-only experiment. This tool cannot publish application files or change
// consent/account settings. Both arms intercept the same document in the same
// way; the candidate changes only the seasonal statue's priority hint.
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];
if(!output)throw new Error('A new evidence directory is required');
try{await readFile(path.join(output,'report.json'));throw new Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const url='https://krawlthroughkrakow.com/staging/';
const sha=data=>createHash('sha256').update(data).digest('hex');
const probeSHA256=sha(await readFile(new URL(import.meta.url)));
const safeUrl=value=>{const u=new URL(value);return u.origin+u.pathname+(u.origin==='https://krawlthroughkrakow.com'&&u.pathname.startsWith('/staging/wp-content/')?u.search:'');};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const baseline=git('rev-parse','HEAD');
const appDiff=()=>git('diff',baseline,'--','staging');
if(appDiff())throw new Error('Application must remain unchanged during the prototype');
await mkdir(output,{recursive:true});
const profile={viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,cpuSlowdown:4,network:{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8},browserCacheDisabled:true};
const report={startedAt:new Date().toISOString(),baseline,url,probeSHA256,scope:'Browser-response prototype only; no publish, source artwork change, consent action, real message/order or field-CWV claim. Document fetching/fulfilment bypasses browser throttling in BOTH arms, so compare these arms only, not native DevTools baseline.',profile,order:['control','low','low','control','control','low'],checks:[],runs:[]};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});if(!pass)throw new Error(name);};
const browser=await chromium.launch({channel:'chrome',headless:true});
report.browserVersion=browser.version();
try{
 for(const [index,arm] of report.order.entries()){
  check('Application source exact before run '+(index+1),!appDiff());
  check('Probe source frozen run '+(index+1),probeSHA256===sha(await readFile(new URL(import.meta.url))));
  const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage(),requests=new Map(),errors=[],blockedWrites=[];
  const row={run:index+1,arm,errors,blockedWrites,documentCount:0};
  report.runs.push(row);
  page.on('pageerror',error=>errors.push(error.message));
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',profile.network);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  cdp.on('Network.requestWillBeSent',event=>requests.set(event.requestId,{url:safeUrl(event.request.url),type:event.type,start:event.timestamp,initialPriority:event.request.initialPriority,priorityChanges:[]}));
  cdp.on('Network.resourceChangedPriority',event=>requests.get(event.requestId)?.priorityChanges.push({priority:event.newPriority,at:event.timestamp}));
  cdp.on('Network.responseReceived',event=>{const r=requests.get(event.requestId);if(r)Object.assign(r,{status:event.response.status,mime:event.response.mimeType,fromDiskCache:event.response.fromDiskCache,protocol:event.response.protocol});});
  cdp.on('Network.loadingFinished',event=>{const r=requests.get(event.requestId);if(r)Object.assign(r,{end:event.timestamp,bytes:event.encodedDataLength});});
  await context.route('**/*',async route=>{
   const request=route.request();
   if(!['GET','HEAD'].includes(request.method())){blockedWrites.push({method:request.method(),url:safeUrl(request.url())});await route.abort('blockedbyclient');return;}
   if(request.isNavigationRequest()&&request.frame()===page.mainFrame()){
    check('Run '+(index+1)+' only expected main document',request.url()===url);
    const response=await route.fetch();
    check('Run '+(index+1)+' successful original document',response.status()===200);
    const original=await response.text();
    const tags=[...original.matchAll(/<img\b(?=[^>]*\bclass="ktk-hero-statue")(?=[^>]*\bsrc="[^"]*hero-statue-seasonal\.svg)[^>]*>/g)];
    check('Run '+(index+1)+' exact one high-priority seasonal image',tags.length===1&&tags[0][0].includes('fetchpriority="high"'));
    const prior=tags[0][0],next=prior.replace('fetchpriority="high"','fetchpriority="low"');
    const candidate=arm==='low'?original.replace(prior,next):original;
    check('Run '+(index+1)+' exact document inverse',arm==='low'?candidate.replace(next,prior)===original:candidate===original);
    row.originalDocumentSHA256=sha(original);row.browserDocumentSHA256=sha(candidate);row.documentCount++;
    await writeFile(path.join(output,`run${index+1}-${arm}-document.html`),candidate);
    const headers=response.headers();delete headers['content-length'];delete headers['content-encoding'];
    await route.fulfill({status:200,headers,body:candidate});return;
   }
   await route.continue();
  });
  await page.addInitScript(()=>{
   window.__ktkPriorityProbe={lcp:[],cls:0,longTaskBlocking:0};
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__ktkPriorityProbe.lcp.push({time:e.startTime,size:e.size,url:e.url,element:e.element?.outerHTML?.slice(0,450)});}).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__ktkPriorityProbe.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__ktkPriorityProbe.longTaskBlocking+=Math.max(0,e.duration-50);}).observe({type:'longtask',buffered:true});
  });
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>[...document.querySelectorAll('.ktk-hero-statue')].length===2&&[...document.querySelectorAll('.ktk-hero-statue')].every(n=>n.complete&&n.naturalWidth>0),{},{timeout:90000});
   await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.ktk-hero-statue')].map(n=>n.decode()));await document.fonts.ready;});
   await page.waitForTimeout(2000);
   row.dom=await page.evaluate(()=>({url:location.href,ua:navigator.userAgent,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,purpose3:window._iub?.cs?.api?.getPreferences?.()?.purposes?.[3]??null,metrics:window.__ktkPriorityProbe,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,ttfb:performance.getEntriesByType('navigation')[0]?.responseStart,statues:[...document.querySelectorAll('.ktk-hero-statue')].map(n=>({src:n.currentSrc,priority:n.fetchPriority,loading:n.loading,complete:n.complete,natural:[n.naturalWidth,n.naturalHeight],box:JSON.parse(JSON.stringify(n.getBoundingClientRect())),timing:performance.getEntriesByName(n.currentSrc).map(t=>({start:t.startTime,duration:t.duration,encoded:t.encodedBodySize,decoded:t.decodedBodySize,transfer:t.transferSize}))}))}));
   row.requests=[...requests.values()];
   check('Run '+(index+1)+' one document',row.documentCount===1);
   check('Run '+(index+1)+' original two SVG resources complete',row.dom.statues.length===2&&row.dom.statues.every(n=>n.complete&&n.src.includes('hero-statue-')));
   check('Run '+(index+1)+' expected hints only',row.dom.statues[0].priority==='high'&&row.dom.statues[1].priority===(arm==='low'?'low':'high'));
   check('Run '+(index+1)+' optional media remains withheld',row.dom.purpose3===false);
   if(index===0||index===1)await page.screenshot({path:path.join(output,arm+'-390.png')});
   console.log(JSON.stringify({run:row.run,arm,lcp:row.dom.metrics.lcp.at(-1),cls:row.dom.metrics.cls,statues:row.dom.statues.map(n=>({priority:n.priority,timing:n.timing})),blockedWrites:blockedWrites.length}));
  }finally{await context.close();}
  await writeFile(path.join(output,'progress.json'),JSON.stringify(report,null,2)+'\n');
 }
 check('Application source exact after all runs',!appDiff());
 const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
 report.comparison=Object.fromEntries(['control','low'].map(arm=>{const rows=report.runs.filter(r=>r.arm===arm);return[arm,{lcp:rows.map(r=>r.dom.metrics.lcp.at(-1)?.time),medianLCP:median(rows.map(r=>r.dom.metrics.lcp.at(-1)?.time)),cls:rows.map(r=>r.dom.metrics.cls),regularLoad:rows.map(r=>r.dom.statues[0].timing[0]?.duration),seasonalLoad:rows.map(r=>r.dom.statues[1].timing[0]?.duration)}];}));
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{
 await browser.close();report.finishedAt=new Date().toISOString();report.summary={passed:report.checks.filter(c=>c.pass).length,total:report.checks.length};
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,comparison:report.comparison,failure:report.failure},null,2));
}
