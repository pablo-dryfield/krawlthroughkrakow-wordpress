import {readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [baseline,output]=process.argv.slice(2);if(baseline!=='71e2546f6e96fba4da85026be9812159e76c5d2b'||!output)throw Error('Exact embed baseline/fresh report required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const indices={'about-us':[0],faqs:[0],'how-to-join':[0,1],'krakow-stag-do':[0,1],'meeting-point':[0],'new-years-eve':[0],'post-2020-krakow-nightlife-guide':[0,1,3,5],'post-new-years-eve-in-krakow':[0,1],'post-welcome-to-alcohol':[0],'pub-crawl-jobs':[0],testimonials:[0],'tour-service-disclaimer':[0]},root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',files=[...Object.keys(indices).map(k=>root+'content/'+k+'.html'),root+'runtime.css'].sort(),checks=[],changed=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail}),sha=b=>createHash('sha256').update(b).digest('hex'),old=file=>execFileSync('git',['show',baseline+':'+file],{maxBuffer:15e6});
for(const line of execFileSync('git',['ls-tree','-r',baseline,'--','staging'],{encoding:'utf8'}).trim().split('\n')){
  const [entry,name]=line.split('\t'),b=await readFile(name),equal=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')===entry.split(' ')[2];
  if(equal)check(name+' Git blob exact',true);else changed.push(name);
}
check('Exactly thirteen application files',JSON.stringify(changed.sort())===JSON.stringify(files),changed);
check('No new application files',!execFileSync('git',['ls-files','--others','--exclude-standard','--','staging'],{encoding:'utf8'}).trim());
check('Immutable complete media ledger',sha(await readFile('docs/code-pages/full-migration/assets.json'))==='f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
check('Exactly116 content bodies',(await readdir(root+'content')).filter(n=>n.endsWith('.html')).length===116);
const css=await readFile(root+'runtime.css','utf8'),originalCss=old(root+'runtime.css').toString(),blocks=css.match(/\/\* BEGIN Withheld embed alternatives \*\/[\s\S]*?\/\* END Withheld embed alternatives \*\/\n/g)||[];
check('Every old CSS byte and exact insertion',blocks.length===1&&css.replace(blocks[0],'')===originalCss&&css===originalCss.replace('/* END Operator identity and trust */\n','/* END Operator identity and trust */\n'+blocks[0]));
const frontend=createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json')),ast=frontend('postcss').parse(blocks[0]||''),rules=[],media=[];
ast.walkAtRules(n=>media.push([n.name,n.params]));ast.walkRules(n=>rules.push({selector:n.selector,declarations:n.nodes.map(d=>[d.prop,d.value,!!d.important])}));
check('Exactly seven page-only new-data rules',rules.length===7&&rules.every(r=>r.selector.startsWith('body.ktk-code-page #main-content ')&&r.selector.includes('data-ktk-embed-')&&r.declarations.every(d=>!d[2])),rules);
check('Only bounded mobile padding media rule',JSON.stringify(media)===JSON.stringify([['media','(max-width: 600px)']]),media);
check('No frame resizing, visibility or motion declarations',!rules.some(r=>r.declarations.some(d=>['height','width','visibility','animation','transition','transform','opacity'].includes(d[0]))));
check('Iframe selector changes only adjacent new notice display',JSON.stringify(rules.filter(r=>r.selector.includes('iframe')))===JSON.stringify([{selector:'body.ktk-code-page #main-content iframe:not([src="about:blank"]) + [data-ktk-embed-notice]',declarations:[['display','none',false]]}]));
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const c=await browser.newContext({javaScriptEnabled:false});await c.route('**/*',r=>r.abort());const page=await c.newPage();
 for(const [key,wanted] of Object.entries(indices)){
  const file=root+'content/'+key+'.html',original=old(file).toString(),candidate=await readFile(file,'utf8');await page.setContent(candidate);
  const result=await page.evaluate(({original,key,wanted})=>{
   const before=new DOMParser().parseFromString(original,'text/html'),after=document,main=after.querySelector('#main-content'),clone=after.documentElement.cloneNode(true),notices=[...main.querySelectorAll('[data-ktk-embed-notice]')],bars=[...main.querySelectorAll('[data-ktk-embed-alternative]')],parents=[...main.querySelectorAll('[data-ktk-embed-fallback]')],ids=wanted.map(i=>key+'-'+i),get=(doc,s)=>[...doc.querySelectorAll(s)].map(n=>n.outerHTML),same=s=>JSON.stringify(get(before,s))===JSON.stringify(get(after,s));
   const originals=[...before.querySelectorAll('#main-content iframe')],current=[...main.querySelectorAll('iframe')];
   const newShape=notices.every((n,i)=>n.tagName==='P'&&n.attributes.length===1&&n.dataset.ktkEmbedNotice===ids[i]&&n.children.length===0)&&bars.every((n,i)=>{const a=n.firstElementChild;return n.tagName==='P'&&n.attributes.length===1&&n.dataset.ktkEmbedAlternative===ids[i]&&n.children.length===1&&a.tagName==='A'&&a.textContent.trim()&&[...a.attributes].every(a=>['href','target','rel'].includes(a.name));});
   const destinations=bars.map((p,i)=>{const a=p.querySelector('a'),f=originals[wanted[i]],u=new URL(f.dataset.ktkMapSrc||f.dataset.ktkEmbedSrc);let expected;
    if(u.hostname==='www.google.com'||u.hostname==='player.vimeo.com')expected=u.href;
    else if(u.hostname==='www.youtube.com')expected='https://www.youtube.com/watch?v='+u.pathname.slice('/embed/'.length);
    else if(u.hostname==='www.instagram.com')expected='https://www.instagram.com'+u.pathname.replace(/embed\/$/,'');
    else if(u.hostname==='www.facebook.com')expected=u.searchParams.get('href');
    else if(u.hostname==='app.shapo.io')expected='#ktk-review-platform-title';
    return {actual:a.getAttribute('href'),expected,named:!!a.textContent.trim(),safe:expected?.startsWith('#')?!a.hasAttribute('target')&&!!main.querySelector(expected):a.target==='_blank'&&a.rel==='noopener noreferrer'};
   });
   const originalsRetained=JSON.stringify([...before.querySelectorAll('a')].map(n=>n.outerHTML))===JSON.stringify([...after.querySelectorAll('a')].filter(n=>!n.closest('[data-ktk-embed-alternative]')).map(n=>n.outerHTML));
   const serialized=[...notices,...bars].map(n=>n.outerHTML),markers=parents.map(n=>' data-ktk-embed-fallback="'+n.dataset.ktkEmbedFallback+'"');
   clone.querySelectorAll('[data-ktk-embed-notice],[data-ktk-embed-alternative]').forEach(n=>n.remove());clone.querySelectorAll('[data-ktk-embed-fallback]').forEach(n=>n.removeAttribute('data-ktk-embed-fallback'));
   return {counts:[parents.length,notices.length,bars.length],newShape,destinations,ids:parents.map(n=>n.dataset.ktkEmbedFallback),serialized,markers,domInverse:clone.outerHTML===before.documentElement.outerHTML,frames:same('iframe'),photos:same('img,video,svg,source'),forms:same('form,input,select,textarea,button'),headings:same('h1,h2,h3,h4,h5,h6'),originalsRetained,iframeCounts:[originals.length,current.length],existingReviewSection:same('[data-ktk-review-platform-links]'),originalInstagramFallbacks:same('blockquote.instagram-media')};
  },{original,key,wanted});
  check(key+' exact original frame/notice/link counts',result.counts.every(n=>n===wanted.length)&&JSON.stringify(result.ids)===JSON.stringify(wanted.map(i=>key+'-'+i)),result.counts);
  check(key+' bounded new markup',result.newShape);
  check(key+' original resource identities and safe native destinations',result.destinations.every(d=>d.actual===d.expected&&d.safe&&d.named),result.destinations);
  let inverse=candidate,unique=true;for(const value of [...result.serialized,...result.markers]){if(inverse.split(value).length!==2)unique=false;inverse=inverse.replace(value,'');}
  check(key+' every old body byte recovered exactly',unique&&inverse===original);
  for(const field of ['domInverse','frames','photos','forms','headings','originalsRetained','existingReviewSection','originalInstagramFallbacks'])check(key+' '+field,result[field]);
 }
 await c.close();
}finally{await browser.close();}
const inputs=[...files,'tools/embed-fallbacks.mjs','tools/test-embed-fallback-source.mjs','tools/build-code-pages-all.mjs','tools/verify-code-pages-build.mjs'],sourceHashes={};for(const file of inputs)sourceHashes[file]=sha(await readFile(file));
const report={checkedAt:new Date().toISOString(),baseline,scope:'Independent exact13-file application scope and complete byte/DOM inverses; every other staging Git blob and media ledger exact. Original frames/media/forms/headings/links, consent runtime, commerce, medical hold and active competition retained.',sourceHashes,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
