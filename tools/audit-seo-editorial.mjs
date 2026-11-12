import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];if(!output)throw new Error('New report path required');
try{await readFile(output);throw new Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const articles=manifest.routes.filter(row=>row.kind==='blog post');
const url='https://krawlthroughkrakow.com/wp-json/wp/v2/posts?per_page=100&include='+articles.map(row=>row.postId).join(',')+'&_fields=id,date_gmt,modified_gmt,link,title,author,slug';
const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
if(!response.ok)throw new Error('Public editorial metadata unavailable');
const posts=await response.json();if(posts.length!==articles.length)throw new Error('Published article identity mismatch');
const authors=[];
for(const id of new Set(posts.map(row=>row.author))){
 const response=await fetch('https://krawlthroughkrakow.com/wp-json/wp/v2/users/'+id+'?_fields=id,name,slug,link',{signal:AbortSignal.timeout(60000)});
 authors.push({id,status:response.status,...response.ok?await response.json():{}});
}
const report={checkedAt:new Date().toISOString(),scope:'Read-only published metadata and immutable public source captures; no credentials/private users or mutations.',authors,articles:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 for(const row of articles){
  const post=posts.find(post=>post.id===row.postId);
  const html=await readFile(row.source+'/production-1920.html','utf8');
  const capture=JSON.parse(await readFile(row.source+'/production-1920.json','utf8'));
  const visible=await page.evaluate(html=>{
   const doc=new DOMParser().parseFromString(html,'text/html');
   const author=doc.querySelector('p.post-meta .author a,.post-meta .author a');
   const images=[...doc.querySelectorAll('#main-content .entry-content img')].map(node=>({src:node.dataset.lazySrc||node.getAttribute('src'),alt:node.getAttribute('alt'),width:node.getAttribute('width'),height:node.getAttribute('height')}));
   return {author:author?{name:author.textContent.trim(),url:author.getAttribute('href')}:null,published:doc.querySelector('.post-meta .published')?.textContent.trim(),images};
  },html);
  const currentTitle=await page.evaluate(value=>{const doc=new DOMParser().parseFromString(value,'text/html');return doc.body.textContent.trim();},post.title.rendered);
  const metadataMatch=post.link===row.sourceUrl&&post.slug===row.route.replace(/^\/|\/$/g,'')&&capture.title.startsWith(currentTitle+' |');
  if(!metadataMatch)report.errors.push({route:row.route,reason:'Current title/slug/identity differs from immutable capture; review before schema'});
  report.articles.push({route:row.route,key:row.key,postId:post.id,title:currentTitle,publishedGmt:post.date_gmt+'Z',modifiedGmt:post.modified_gmt+'Z',authorId:post.author,
   captureAt:capture.capturedAt,metadataMatch,visible,modifiedAfterCapture:Date.parse(post.modified_gmt+'Z')>Date.parse(capture.capturedAt)});
 }
}finally{await browser.close();}
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({articles:report.articles.length,authors:report.authors,errors:report.errors,missingVisibleAuthor:report.articles.filter(row=>!row.visible.author).map(row=>row.route),modifiedAfterCapture:report.articles.filter(row=>row.modifiedAfterCapture).map(row=>row.route)},null,2));
