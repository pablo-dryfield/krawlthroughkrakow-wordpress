import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildStagNyeTextStyles} from '../stag-nye-text-styles.mjs';
const frontend=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-stag-nye-type-'));try{await run(path.join(directory,'runtime.css'));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-stag-nye-type-'));await rm(directory,{recursive:true,force:true});}}
test('new text styles preserve all previous CSS bytes and the exact Jobs boundary, with idempotence',async()=>{
 await temporary(async file=>{const source=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),pattern=/\/\* BEGIN Stag and NYE mobile text \*\/[\s\S]*?\/\* END Stag and NYE mobile text \*\/\n/g,base=source.replace(pattern,'');await writeFile(file,base);await buildStagNyeTextStyles(file);const once=await readFile(file,'utf8'),blocks=once.match(pattern);assert.equal(blocks.length,1);assert.equal(once.replace(pattern,''),base);assert.ok(once.includes('/* END Jobs page accessibility */\n'+blocks[0]));await buildStagNyeTextStyles(file);assert.equal(await readFile(file,'utf8'),once);});
});
test('missing, duplicate, partial, moved and drifted boundaries fail without writing',async()=>{
 await temporary(async file=>{const base='/* old */\n/* END Jobs page accessibility */\n/* following */\n';await writeFile(file,base);await buildStagNyeTextStyles(file);const once=await readFile(file,'utf8');for(const css of [base.replace('/* END Jobs page accessibility */','missing'),base+'/* END Jobs page accessibility */\n',once.replace('/* END Stag and NYE mobile text */','missing'),once+'/* BEGIN Stag and NYE mobile text */',once.replace('font-size: 16px','font-size: 15px'),once.replace('/* END Jobs page accessibility */\n','/* END Jobs page accessibility */\n/* unexpected */\n')]){await writeFile(file,css);await assert.rejects(()=>buildStagNyeTextStyles(file));assert.equal(await readFile(file,'utf8'),css);}});
});
test('all three rules are mobile-only and affect exactly the two named routes',async()=>{
 await temporary(async file=>{await writeFile(file,'/* END Jobs page accessibility */\n');await buildStagNyeTextStyles(file);const root=frontend('postcss').parse(await readFile(file,'utf8')),media=[],rules=[];root.walkAtRules(n=>media.push([n.name,n.params]));root.walkRules(n=>rules.push(n));assert.deepEqual(media,[['media','(max-width: 600px)']]);assert.equal(rules.length,3);for(const rule of rules){assert.equal(rule.parent.name,'media');for(const selector of rule.selectors)assert.match(selector,/^body\.ktk-code-page\[data-ktk-page="(?:krakow-stag-do|new-years-eve)"\] #main-content /);}
 const all=rules.flatMap(r=>r.nodes);assert.ok(all.every(d=>['box-sizing','padding-right','font-size','line-height','text-align','padding-bottom'].includes(d.prop)));assert.deepEqual(all.filter(d=>d.important).map(d=>[d.prop,d.value]),[['text-align','left']]);});
});
test('reviewed Stag blocks and nested parents are excluded; the footer rule names only the NYE closing row',async()=>{
 await temporary(async file=>{await writeFile(file,'/* END Jobs page accessibility */\n');await buildStagNyeTextStyles(file);const root=frontend('postcss').parse(await readFile(file,'utf8')),rules=[];root.walkRules(r=>rules.push(r));const [stag,nye]=rules[0].selectors;assert.ok(stag.endsWith(' > .et_pb_text_inner:not([data-ktk-group-activity-review])'));assert.ok(!/\.et_pb_text_(?:0|4|6|14|15|16|17)(?:,|\))/.test(stag));assert.match(nye,/:is\(\.et_pb_text_0,\.et_pb_text_1,\.et_pb_text_2,\.et_pb_text_3,\.et_pb_text_12\) > \.et_pb_text_inner$/);assert.equal(rules[2].selector,'body.ktk-code-page[data-ktk-page="new-years-eve"] #main-content .et_pb_row_12');assert.deepEqual(rules[2].nodes.map(d=>[d.prop,d.value]),[['padding-bottom','72px']]);});
});
