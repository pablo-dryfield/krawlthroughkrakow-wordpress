import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const mode = process.argv[2] || 'mobile';
const live = 'https://krawlthroughkrakow.com/staging/?ktk_release=halloweekend-logos-final';
const cases = mode.startsWith('mobile') ? [320,360,375,382,390].map(width => ({ width, height:844, url:mode === 'mobile-local'?'http://127.0.0.1:5184/':live, local:mode === 'mobile-local' })) :
  [...[805,820].map(height => ({ width:1920,height,url:live,local:false })), ...[650,768,805,820,900].map(height => ({ width:1920,height,url:'http://127.0.0.1:5184/',local:true }))];
const report = { checkedAt:new Date().toISOString(),mode,cases:[] };
const browser = await chromium.launch({ channel:'chrome',headless:true });
try {
  for (const test of cases) {
    const context = await browser.newContext({ viewport:{width:test.width,height:test.height}, deviceScaleFactor:1,
      ...(mode.startsWith('mobile') ? { isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36' } : {}) });
    try {
      const page = await context.newPage();
      await page.goto(test.url,{waitUntil:'load',timeout:60000});
      if (!test.local) {
        const reject = page.getByRole('button',{name:/^Reject(?: all)?$/i}).first();
        await reject.waitFor({state:'visible',timeout:25000}); await reject.focus(); await page.keyboard.press('Enter');
      }
      await page.evaluate(() => document.fonts.ready);
      if (mode === 'mobile-scale') await page.addStyleTag({content:'.cont_TA .div_dot { scale:1; }'});
      if (mode === 'mobile-local') {
        await page.evaluate(async () => {for(let y=0;y<document.documentElement.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}scrollTo(0,0);});
      }
      await page.waitForTimeout(250);
      const geometry = await page.evaluate(() => {
        const rect = e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
        const describe = e => ({tag:e.tagName,id:e.id,class:typeof e.className==='string'?e.className:'SVG',text:e.textContent.trim().slice(0,100),...rect(e)});
        const hero = document.querySelector('#ktk-seasonal-hero');
        const all = [...document.querySelectorAll('body *')];
        const overflow = all.filter(e => { const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.right>document.documentElement.clientWidth+1; }).map(describe);
        return { innerWidth,scrollX,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
          viewport:{width:visualViewport.width,scale:visualViewport.scale},header:rect(document.querySelector('#main-header')),hero:rect(hero),overflow,
          widgets:[...document.querySelectorAll('.cont_TA,.TA_text,.TA_H,.div_dot,.rev')].map(e=>({...describe(e),css:{overflow:getComputedStyle(e).overflow,whiteSpace:getComputedStyle(e).whiteSpace,scale:getComputedStyle(e).scale}})),
          panels:[...hero.querySelectorAll('.ktk-hero-panel')].map(panel => {const css=getComputedStyle(panel);return {class:panel.className,...rect(panel),css:{height:css.height,minHeight:css.minHeight,maxHeight:css.maxHeight,overflow:css.overflow},children:[...panel.querySelectorAll('.ktk-hero-copy > *, .ktk-hero-cta, .ktk-hero-bottomline')].map(e => ({...describe(e),outsideBottom:Math.max(0,e.getBoundingClientRect().bottom-panel.getBoundingClientRect().bottom)}))};}) };
      });
      const label=`fit-${mode}-${test.local?'local':'live'}-${test.width}x${test.height}`;
      if (mode === 'desktop') await page.evaluate(() => window.scrollTo(0,document.querySelector('#ktk-seasonal-hero').offsetTop));
      await page.screenshot({path:`docs/homepage-seasonal-hero/${label}.png`});
      report.cases.push({...test,geometry});
      console.log(JSON.stringify({label,viewport:geometry.viewport,client:geometry.clientWidth,scroll:geometry.scrollWidth,header:geometry.header.width,hero:geometry.hero.width,overflow:geometry.overflow.filter(e=>!['svg','path'].includes(e.tag)).slice(-15),panels:geometry.panels.map(p=>({class:p.class,height:p.height,children:p.children.map(c=>({class:c.class,text:c.text,y:c.y,bottom:c.bottom,outsideBottom:c.outsideBottom}))}))}));
      await writeFile(`docs/homepage-seasonal-hero/fit-${mode}-diagnostic.json`,JSON.stringify(report,null,2));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
