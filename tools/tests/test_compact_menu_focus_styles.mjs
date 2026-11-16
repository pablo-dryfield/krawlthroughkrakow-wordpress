import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildCompactMenuFocusStyles} from '../compact-menu-focus-styles.mjs';
const nav=await readFile(new URL('../nojs-navigation.css',import.meta.url),'utf8'),styles=await readFile(new URL('../compact-menu-focus.css',import.meta.url),'utf8');
const navBlock='/* BEGIN No-JS quick links */\n'+nav.trim()+'\n/* END No-JS quick links */\n\n',block='/* BEGIN compact menu keyboard focus */\n'+styles.trim()+'\n/* END compact menu keyboard focus */\n\n';
const shared='/* BEGIN shared content accessibility */\n/* existing shared bytes */\n/* END shared content accessibility */\n';
async function fixture(run){const root=await mkdtemp(path.join(tmpdir(),'ktk-compact-menu-focus-')),home=path.join(root,'home'),pages=path.join(root,'pages');try{await mkdir(home);await mkdir(pages);await writeFile(path.join(home,'parity-runtime.css'),'/* original home */\n'+navBlock+shared);await writeFile(path.join(pages,'runtime.css'),'/* original pages */\n'+navBlock+'/* BEGIN NYE promotion state */\n/* existing NYE */\n'+shared);await run(home,pages);}finally{assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir())+path.sep+'ktk-compact-menu-focus-'));await rm(root,{recursive:true,force:true});}}
async function snapshot(home,pages){return Promise.all([readFile(path.join(home,'parity-runtime.css'),'utf8'),readFile(path.join(pages,'runtime.css'),'utf8')]);}

test('both namespace styles preserve every old byte and repeat without changes',async()=>{
 await fixture(async(home,pages)=>{const before=await snapshot(home,pages);await buildCompactMenuFocusStyles(home,pages);const once=await snapshot(home,pages);assert.deepEqual(once.map(s=>s.replace(block,'')),before);assert.ok(once.every(s=>s.split(block).length===2&&s.includes(block+navBlock)));await buildCompactMenuFocusStyles(home,pages);assert.deepEqual(await snapshot(home,pages),once);});
});
test('invalid second namespace refuses before changing either stylesheet',async()=>{
 await fixture(async(home,pages)=>{const file=path.join(pages,'runtime.css');await writeFile(file,(await readFile(file,'utf8')).replace('/* BEGIN No-JS quick links */','/* missing anchor */'));const before=await snapshot(home,pages);await assert.rejects(()=>buildCompactMenuFocusStyles(home,pages));assert.deepEqual(await snapshot(home,pages),before);});
});
test('changed existing navigation or final shared tail refuses atomically',async()=>{
 for(const change of [s=>s.replace('min-height: 44px','min-height: 4px'),s=>s+'/* unexpected tail */'])await fixture(async(home,pages)=>{const file=path.join(pages,'runtime.css');const initial=await readFile(file,'utf8'),changed=change(initial);assert.notEqual(changed,initial);await writeFile(file,changed);const before=await snapshot(home,pages);await assert.rejects(()=>buildCompactMenuFocusStyles(home,pages));assert.deepEqual(await snapshot(home,pages),before);});
});
test('changed moved or duplicate owned focus block refuses without any replacement',async()=>{
 for(const change of [s=>s.replace('outline-offset: -4px','outline-offset: 4px'),s=>s.replace(block,'')+block,s=>block+s])await fixture(async(home,pages)=>{await buildCompactMenuFocusStyles(home,pages);const file=path.join(pages,'runtime.css');await writeFile(file,change(await readFile(file,'utf8')));const before=await snapshot(home,pages);await assert.rejects(()=>buildCompactMenuFocusStyles(home,pages));assert.deepEqual(await snapshot(home,pages),before);});
});
