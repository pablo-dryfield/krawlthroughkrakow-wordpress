import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {rewriteBookingLinks} from './booking-destinations.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=process.cwd(),directory='docs/code-pages/production-readiness/';
const render=file=>execFileSync('php',['-r',"define('ABSPATH', __DIR__); function esc_html($v){return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');} function esc_url($v){return esc_html($v);} function home_url($v){return 'https://krawlthroughkrakow.com/staging'.$v;} function content_url($v){return home_url('/wp-content'.$v);} function ktk_homepage_seasonal_hero(){return '<section id=\"unchanged-seasonal-hero\"></section>';} require $argv[1]; require $argv[2]; echo ktk_homepage_static_body();",path.join(root,'staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php'),path.join(root,file)],{maxBuffer:5*1024*1024,encoding:'utf8'});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 await page.setContent(render(directory+'original-homepage-content.php'));
 const changes=await rewriteBookingLinks(page,'https://krawlthroughkrakow.com/staging/');
 const expected=await page.evaluate(()=>document.body.innerHTML);
 await page.setContent(render('staging/wp-content/mu-plugins/ktk-homepage-assets/parity-seasonal-content.php'));
 const actual=await page.evaluate(()=>document.body.innerHTML);
 check('only approved booking destination attributes changed',expected===actual,{expectedSha:createHash('sha256').update(expected).digest('hex'),actualSha:createHash('sha256').update(actual).digest('hex')});
 check('four distinct incoming legacy destinations updated',changes.length===4,changes);
 check('brunch CTA reaches current product 29',await page.locator('a[href="https://krawlthroughkrakow.com/staging/store2/bottomless-brunch-29/#book"]').count()===1);
 const invalid=await page.locator('a[href],[data-parity-href]').evaluateAll(es=>es.flatMap(e=>['href','data-parity-href'].map(name=>e.getAttribute(name)).filter(value=>value&&/krawlthroughkrakow\.com\/(?:staging\/)?store(?:\/|$)/.test(value))));
 check('homepage exposes no Ecwid booking links',invalid.length===0,invalid);
 for(const key of ['post-krakow-wine-bars','how-to-join','new-years-eve']){
  const old=await readFile(directory+`header-before-${key}-1920.png`),current=await readFile(directory+`header-final-${key}-1920.png`);
  check(key+' wide desktop header pixels unchanged',old.equals(current));
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await writeFile(directory+'homepage-booking-revision-tests.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));
if(report.passed!==report.total)process.exitCode=1;
