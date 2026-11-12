import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {seoMetadata} from './code-pages-seo.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
const rows=[];
try{
  for(const route of manifest.routes.filter(row=>['blog post','page','linked URL outside sitemap/API'].includes(row.kind)&&!/^\/(?:author|category|tag)\//.test(row.route)&&!seoMetadata.pages[row.route])){
    const html=await readFile(route.source+'/production-1920.html','utf8');
    const facts=await page.evaluate(html=>{
      const doc=new DOMParser().parseFromString(html,'text/html'),main=doc.querySelector('#main-content');
      main.querySelectorAll('script,style,noscript,nav,header,footer').forEach(node=>node.remove());
      const normalize=value=>(value||'').replace(/\s+/g,' ').trim();
      return {title:doc.title,h1:[...main.querySelectorAll('h1')].map(node=>normalize(node.textContent)),bodyPreview:normalize(main.textContent).slice(0,1400),paragraphs:[...main.querySelectorAll('p')].map(node=>normalize(node.textContent)).filter(text=>text.length>45&&!/^by .*\|/i.test(text)).slice(0,4),headings:[...main.querySelectorAll('h2,h3')].map(node=>normalize(node.textContent)).slice(0,10)};
    },html);
    rows.push({route:route.route,key:route.key,kind:route.kind,...facts});
  }
}finally{await browser.close();}
const out=process.argv[2]||'docs/seo/staging-descriptions-2026-11-12/source-review.json';
try{await readFile(out);throw new Error('Preserve earlier source review; choose a new output filename');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(path.dirname(out),{recursive:true});
await writeFile(out,JSON.stringify({checkedAt:new Date().toISOString(),scope:'Existing local published snapshots; no new factual claims or external requests.',pages:rows},null,2));
console.log(rows.map(row=>`${row.route} | ${row.title} | ${row.paragraphs[0]?.slice(0,200)||row.headings.join('; ')}`).join('\n'));
console.log('Remaining descriptions:',rows.length);
