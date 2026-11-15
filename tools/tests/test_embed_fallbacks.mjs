import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadEmbedFallbacks,reviseEmbedFallbacks,buildEmbedFallbackStyles} from '../embed-fallbacks.mjs';

test('scope is exactly eighteen original frames in twelve pages, with explicit Instagram exclusions',async()=>{
  const rows=await loadEmbedFallbacks();assert.equal(rows.length,12);assert.equal(rows.reduce((n,r)=>n+r.indices.length,0),18);
  assert.deepEqual(rows.find(r=>r.key==='post-2020-krakow-nightlife-guide').indices,[0,1,3,5]);
  assert.deepEqual(rows.find(r=>r.key==='how-to-join').indices,[0,1]);
  assert.deepEqual(rows.find(r=>r.key==='post-new-years-eve-in-krakow').indices,[0,1]);
  for(const r of rows){assert.match(r.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(r.version,'2026-11-15.embed-fallbacks-1');assert.ok(r.sourceHtml.includes('main-content'));}
});

test('contact, native local video, held medical, active competition and other pages are not selected',()=>{
  for(const key of ['contact','post-spooktacular-krakow-unveil-the-mysteries-of-halloween','post-hostel-hangover-cure','competition','blog','store','store2','unknown'])assert.deepEqual(reviseEmbedFallbacks({key,revision:null}),[]);
});

async function temporary(run){
  const directory=await mkdtemp(path.join(tmpdir(),'ktk-embed-fallback-'));
  try{await run(path.join(directory,'runtime.css'));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-embed-fallback-'));await rm(directory,{recursive:true,force:true});}
}

test('the stylesheet preserves every old byte and its exact operator boundary, and is idempotent',async()=>{
  await temporary(async file=>{
    const source=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),pattern=/\/\* BEGIN Withheld embed alternatives \*\/[\s\S]*?\/\* END Withheld embed alternatives \*\/\n/g,base=source.replace(pattern,'');
    await writeFile(file,base);await buildEmbedFallbackStyles(file);const once=await readFile(file,'utf8'),blocks=once.match(pattern);assert.equal(blocks.length,1);assert.equal(once.replace(pattern,''),base);assert.ok(once.includes('/* END Operator identity and trust */\n'+blocks[0]));await buildEmbedFallbackStyles(file);assert.equal(await readFile(file,'utf8'),once);
  });
});

test('missing, duplicate, incomplete and drifted style boundaries fail before writing',async()=>{
  await temporary(async file=>{
    const base='/* old byte-exact styles */\n/* END Operator identity and trust */\n/* other styles */\n';await writeFile(file,base);await buildEmbedFallbackStyles(file);const once=await readFile(file,'utf8');
    for(const css of [base.replace('/* END Operator identity and trust */','missing'),base+'/* END Operator identity and trust */\n',once.replace('/* END Withheld embed alternatives */','missing'),once+'/* BEGIN Withheld embed alternatives */',once.replace('font-size: 16px','font-size: 17px')]){await writeFile(file,css);await assert.rejects(()=>buildEmbedFallbackStyles(file));assert.equal(await readFile(file,'utf8'),css);}
  });
});

test('style rules affect only new notices and alternatives and do not resize original frames',async()=>{
  await temporary(async file=>{
    await writeFile(file,'/* END Operator identity and trust */\n');await buildEmbedFallbackStyles(file);const css=await readFile(file,'utf8'),frontend=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url)),ast=frontend('postcss').parse(css),rules=[],media=[];
    ast.walkAtRules(n=>media.push([n.name,n.params]));ast.walkRules(n=>rules.push({selector:n.selector,declarations:n.nodes.map(d=>[d.prop,d.value,!!d.important])}));
    assert.equal(rules.length,7);assert.deepEqual(media,[['media','(max-width: 600px)']]);
    assert.ok(rules.every(r=>r.selector.startsWith('body.ktk-code-page #main-content ')&&r.selector.includes('data-ktk-embed-')&&r.declarations.every(d=>!d[2])));
    assert.equal(rules.filter(r=>r.selector.includes('iframe')).length,1);assert.equal(rules.find(r=>r.selector.includes('iframe')).selector,'body.ktk-code-page #main-content iframe:not([src="about:blank"]) + [data-ktk-embed-notice]');
    assert.deepEqual(rules.find(r=>r.selector.includes('iframe')).declarations,[['display','none',false]]);
    assert.ok(!rules.some(r=>r.declarations.some(d=>['height','width','animation','visibility','transform'].includes(d[0]))));
    assert.deepEqual(rules.find(r=>r.selector.endsWith(' a:focus-visible')).declarations,[['outline','2px solid currentColor',false],['outline-offset','3px',false]]);
  });
});

test('native alternative bars own their contrast on colored original sections',async()=>{
  await temporary(async file=>{
    await writeFile(file,'/* END Operator identity and trust */\n');await buildEmbedFallbackStyles(file);const frontend=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url)),ast=frontend('postcss').parse(await readFile(file,'utf8'));let bar,link;
    ast.walkRules(n=>{if(n.selector==='body.ktk-code-page #main-content [data-ktk-embed-alternative]')bar=Object.fromEntries(n.nodes.map(d=>[d.prop,d.value]));if(n.selector==='body.ktk-code-page #main-content [data-ktk-embed-alternative] a')link=Object.fromEntries(n.nodes.map(d=>[d.prop,d.value]));});
    assert.equal(bar.color,'#222');assert.equal(bar.background,'#fff');assert.equal(link.color,'inherit');assert.equal(bar.padding,'0 12px');
  });
});
