import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildNoJsNavigation} from '../nojs-navigation.mjs';
import {buildNyePromotionStyles} from '../nye-promotion-styles.mjs';
const frontend=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const base='/* Existing bytes $ unchanged */\n\n/* BEGIN shared content accessibility */\n/* existing shared rules */\n/* END shared content accessibility */\n';
const pageBase=base.replace('/* BEGIN shared content accessibility */','/* BEGIN NYE promotion state */\n'+(await readFile(new URL('../nye-promotion.css',import.meta.url),'utf8')).trim()+'\n/* END NYE promotion state */\n\n/* BEGIN shared content accessibility */');
async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-nojs-nav-'));try{const home=path.join(directory,'home'),pages=path.join(directory,'pages');await mkdir(home);await mkdir(pages);await writeFile(path.join(home,'parity-runtime.css'),base);await writeFile(path.join(pages,'runtime.css'),pageBase);await run(home,pages);}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-nojs-nav-'));await rm(directory,{recursive:true,force:true});}}
const snapshot=async dirs=>{const rows={};for(const dir of dirs)for(const f of await readdir(dir))rows[path.join(dir,f)]=(await readFile(path.join(dir,f))).toString('base64');return rows;};

test('source PHP preserves exact body boundaries and refuses invalid roots/markup/changed outputs',()=>{
 const r=JSON.parse(execFileSync('php',['tools/tests/test_nojs_navigation.php'],{encoding:'utf8'}));assert.equal(r.passed,32);assert.equal(r.total,32);assert.deepEqual(r.failed,[]);
});
test('both generated namespaces preserve all old CSS and are byte-idempotent',async()=>{
 await temporary(async(home,pages)=>{await buildNoJsNavigation(home,pages);const before=await snapshot([home,pages]);for(const [dir,prefix,css,anchor,prior]of [[home,'ktk_homepage','parity-runtime.css','/* BEGIN shared content accessibility */',base],[pages,'ktk_pages','runtime.css','/* BEGIN NYE promotion state */',pageBase]]){const code=await readFile(path.join(dir,'nojs-navigation.php'),'utf8');assert.ok(code.includes('function '+prefix+'_nojs_navigation_body('));assert.ok(!code.includes('function ktk_nojs_navigation_body('));const style=await readFile(path.join(dir,css),'utf8'),blocks=style.match(/\/\* BEGIN No-JS quick links \*\/[\s\S]*?\/\* END No-JS quick links \*\/\n\n/g);assert.equal(blocks.length,1);assert.equal(style.replace(blocks[0],''),prior);assert.ok(style.includes(blocks[0]+anchor));execFileSync('php',['-l',path.join(dir,'nojs-navigation.php')]);}await buildNyePromotionStyles(path.join(pages,'runtime.css'));assert.deepEqual(await snapshot([home,pages]),before);await buildNoJsNavigation(home,pages);assert.deepEqual(await snapshot([home,pages]),before);});
});
test('both namespaces/stylesheets preflight before any output and refuse drift without overwriting',async()=>{
 await temporary(async(home,pages)=>{const pageCss=path.join(pages,'runtime.css');await writeFile(pageCss,pageBase.replace('/* BEGIN shared content accessibility */','missing'));const before=await snapshot([home,pages]);await assert.rejects(()=>buildNoJsNavigation(home,pages));assert.deepEqual(await snapshot([home,pages]),before);await writeFile(pageCss,pageBase);await buildNoJsNavigation(home,pages);const clean=await snapshot([home,pages]);for(const [file,change]of [[path.join(home,'nojs-navigation.php'),s=>s.replace('Quick links','Changed links')],[pageCss,s=>s.replace('min-height: 44px','min-height: 4px')],[pageCss,s=>s.replace('/* END No-JS quick links */','missing')],[pageCss,s=>s+'/* BEGIN shared content accessibility */'],[pageCss,s=>s.replace('/* BEGIN NYE promotion state */','missing')]]){await writeFile(file,change(Buffer.from(clean[file],'base64').toString()));const changed=await snapshot([home,pages]);await assert.rejects(()=>buildNoJsNavigation(home,pages));assert.deepEqual(await snapshot([home,pages]),changed);for(const [f,b]of Object.entries(clean))await writeFile(f,Buffer.from(b,'base64'));}});
});
test('all navigation CSS targets only the generated nav, with no noscript display override or remote/hidden behavior',async()=>{
 const css=await readFile(new URL('../nojs-navigation.css',import.meta.url),'utf8'),ast=frontend('postcss').parse(css),rules=[];ast.walkRules(r=>rules.push(r));assert.equal(rules.length,7);assert.ok(rules.every(r=>r.selectors.every(s=>s.startsWith('body #main-content nav.ktk-nojs-navigation'))));assert.ok(!/noscript|!important|url\(|display:\s*none|visibility|position:|animation|transform/.test(css));const anchors=rules.find(r=>r.selector==='body #main-content nav.ktk-nojs-navigation a');assert.ok(anchors.nodes.some(n=>n.prop==='min-height'&&n.value==='44px'));assert.ok(anchors.nodes.some(n=>n.prop==='font-size'&&n.value==='16px'));assert.ok(rules.some(r=>r.selector.endsWith('a:focus-visible')&&r.nodes.some(n=>n.prop==='outline')));
});
