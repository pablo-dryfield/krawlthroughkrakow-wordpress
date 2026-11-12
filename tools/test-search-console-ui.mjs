import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ui=path.resolve('../omni-lodge/ui');
const {build}=require(path.join(ui,'node_modules/esbuild'));
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];if(!output)throw new Error('A new output directory is required');
try{await readFile(path.join(output,'report.json'));throw new Error('Preserve previous report');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const mock=`import {useState,useEffect} from 'react';
const noop=()=>{};export const useSearchConsoleSites=()=>({data:[{siteUrl:'https://krawlthroughkrakow.com/',permissionLevel:'siteOwner'}],refetch:noop});
export const useSeoActionLogs=()=>({data:[],refetch:noop}); export const useInspectSearchConsoleUrl=()=>({});export const useAnalyzeGoogleSerp=()=>({});export const useCreateSeoActionLog=()=>({});
export function useSearchConsolePerformance(params){const [count,setCount]=useState(1);const key=JSON.stringify(params);useEffect(()=>setCount(1),[key]);window.__requests=(window.__requests||[]);window.__requests.push(params);
 const empty=location.search.includes('empty'); const rows=empty?[]:Array.from({length:count},(_,i)=>({keys:params.dimensions[0]==='page'?['https://krawlthroughkrakow.com/store2/pub-crawl-28/']:params.dimensions.length>1?['krakow pub crawl','https://krawlthroughkrakow.com/store2/pub-crawl-28/']:['krakow pub crawl'],clicks:2,impressions:50,ctr:.04,position:7}));
 return{isSuccess:true,isLoading:false,refetch:noop,hasNextPage:!empty&&count<2,isFetchingNextPage:false,fetchNextPage:()=>setCount(c=>c+1),data:{rows,dimensions:params.dimensions,summary:empty?null:{clicks:9000,impressions:90000,ctr:.1,position:5},summaryAggregation:'byProperty',detailAggregation:params.dimensions.includes('page')?'byPage':'byProperty'}};}`;
const bundle=await build({absWorkingDir:ui,bundle:true,write:false,outfile:'fixture.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{
 name:'isolated-report-fixture',setup(builder){
  builder.onResolve({filter:/api\/searchConsole$/},()=>({path:'api',namespace:'fixture'}));
  builder.onResolve({filter:/store\/hooks$/},()=>({path:'hooks',namespace:'fixture'}));
  builder.onResolve({filter:/components\/access\/PageAccessGuard$/},()=>({path:'guard',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='api'?mock:args.path==='hooks'?'const dispatch=()=>{};export const useAppDispatch=()=>dispatch;':'export const PageAccessGuard=({children})=>children;',loader:'tsx',resolveDir:ui}));
 }}],stdin:{loader:'tsx',resolveDir:ui,contents:`import {createRoot} from 'react-dom/client';import {MantineProvider} from '@mantine/core';import '@mantine/core/styles.css';import '@mantine/dates/styles.css';import SearchConsolePage from './src/pages/SearchConsolePage';createRoot(document.getElementById('root')).render(<MantineProvider><main style={{padding:16,maxWidth:1500,margin:'auto'}}><SearchConsolePage/></main></MantineProvider>);`}});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')).contents,css=bundle.outputFiles.find(file=>file.path.endsWith('.css')).contents;
const server=createServer((request,response)=>{response.setHeader('Content-Type',request.url==='/fixture.js'?'application/javascript':request.url==='/fixture.css'?'text/css':'text/html');response.end(request.url==='/fixture.js'?js:request.url==='/fixture.css'?css:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated reporting QA</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={scope:'Actual OmniLodge page with synthetic read-only hook fixtures; no authenticated API/GSC comparison or production data.',checks:[],errors:[],mutations:0};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'&&route.request().method()==='GET'?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByText('9,000',{exact:true}).first().waitFor();
  check(width+' independent summary total',await page.getByText('9,000',{exact:true}).count()>=1);
  check(width+' no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const field=page.getByRole('textbox',{name:'Country (3-letter code)',exact:true});await field.fill('gbr');
  const apply=page.getByRole('button',{name:'Apply filters',exact:true});await apply.focus();await page.keyboard.press('Enter');
  check(width+' keyboard applies matching filters to all reports',await page.evaluate(()=>window.__requests.slice(-8).every(params=>params.filters.country==='gbr')));
  const more=page.getByRole('button',{name:'Load more rows',exact:true});const initial=await more.count();await more.first().click();
  check(width+' pagination is interactive',await more.count()===initial-1);
  await page.screenshot({path:path.join(output,'report-'+width+'.png'),fullPage:true});
  await page.goto('http://127.0.0.1:'+server.address().port+'/?empty');
  await page.getByText('No summary data returned for these filters and dates.').waitFor();
  check(width+' empty data is not a fake zero or create-page recommendation',await page.getByText('9,000',{exact:true}).count()===0&&await page.getByText(/Investigate query coverage/).count()===0);
  await context.close();
 }
 check('no browser errors',report.errors.length===0,report.errors);
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
