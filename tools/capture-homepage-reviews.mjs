import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const url=new URL(process.argv[2]||'http://127.0.0.1:5184/');
if (!['127.0.0.1','localhost'].includes(url.hostname)&&!(url.hostname==='krawlthroughkrakow.com'&&url.pathname.startsWith('/staging/'))) throw new Error('Only local or staging.');
const label=process.argv[3]||'halloweekend-lower-reviews-local';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid label');
const report={url:url.href,checkedAt:new Date().toISOString(),cases:[],passed:true};
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for(const width of [375,1440]) {
    const context=await browser.newContext({viewport:{width,height:width===375?844:900},deviceScaleFactor:1,isMobile:width===375,hasTouch:width===375});
    try {
      const page=await context.newPage();
      await page.goto(url.href,{waitUntil:'load'});
      if(url.hostname==='krawlthroughkrakow.com') {const reject=page.getByRole('button',{name:/^Reject(?: all)?$/i}).first();await reject.waitFor();await reject.focus();await page.keyboard.press('Enter');}
      await page.evaluate(async()=>{await document.fonts.ready;for(let y=0;y<document.documentElement.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}const element=document.querySelector('.cont_TA');scrollTo(0,element.getBoundingClientRect().top+scrollY-70);});
      await page.waitForTimeout(300);
      const data=await page.evaluate(()=>({scrollY,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,story:document.querySelector('.et_pb_text_25 p').textContent,
        widgets:[...document.querySelectorAll('.cont_TA')].map(widget=>({text:widget.innerText,count:widget.querySelector('.rev').textContent.trim(),children:[...widget.querySelectorAll('.TA_H,.rev')].map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return{text:e.textContent.trim(),x:r.x,right:r.right,width:r.width,height:r.height,display:c.display,visibility:c.visibility,overflow:c.overflow};})}))}));
      const passed=data.scroll===data.client&&data.scrollY>0&&data.widgets.length===2&&data.widgets[0].count==='3,000+ reviews'&&data.widgets[1].count==='2,400+ reviews'&&data.widgets.every(w=>w.children.every(c=>c.width>0&&c.height>0&&c.x>=0&&c.right<=width+1&&c.display!=='none'&&c.visibility!=='hidden'));
      report.cases.push({width,...data,passed});report.passed&&=passed;
      await page.screenshot({path:`docs/homepage-seasonal-hero/${label}-${width}.png`});
    }finally{await context.close();}
  }
}finally{await browser.close();}
await writeFile(`docs/homepage-seasonal-hero/${label}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
