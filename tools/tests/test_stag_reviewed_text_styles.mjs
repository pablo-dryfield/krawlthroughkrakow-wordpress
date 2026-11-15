import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildStagReviewedTextStyles} from '../stag-reviewed-text-styles.mjs';
const frontend=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const pattern=/\/\* BEGIN Reviewed Stag mobile text \*\/[\s\S]*?\/\* END Reviewed Stag mobile text \*\/\n/g;
async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-stag-reviewed-type-'));try{await run(path.join(directory,'runtime.css'));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-stag-reviewed-type-'));await rm(directory,{recursive:true,force:true});}}

test('reviewed text generation preserves every old CSS byte and exact boundary, with idempotence',async()=>{
 await temporary(async file=>{const source=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),base=source.replace(pattern,'');await writeFile(file,base);await buildStagReviewedTextStyles(file);const once=await readFile(file,'utf8'),blocks=once.match(pattern);assert.equal(blocks.length,1);assert.equal(once.replace(pattern,''),base);assert.ok(once.includes('/* END Stag and NYE mobile text */\n'+blocks[0]));await buildStagReviewedTextStyles(file);assert.equal(await readFile(file,'utf8'),once);});
});
test('missing, duplicate, partial, moved and changed style boundaries refuse atomically',async()=>{
 await temporary(async file=>{const base='/* old */\n/* END Stag and NYE mobile text */\n/* next */\n';await writeFile(file,base);await buildStagReviewedTextStyles(file);const once=await readFile(file,'utf8');for(const css of [base.replace('/* END Stag and NYE mobile text */','missing'),base+'/* END Stag and NYE mobile text */\n',once.replace('/* END Reviewed Stag mobile text */','missing'),once+'/* BEGIN Reviewed Stag mobile text */',once.replace('font-size: 16px','font-size: 15px'),once.replace('/* END Stag and NYE mobile text */\n','/* END Stag and NYE mobile text */\n/* unexpected */\n')]){await writeFile(file,css);await assert.rejects(()=>buildStagReviewedTextStyles(file));assert.equal(await readFile(file,'utf8'),css);}});
});
test('exactly two phone-only type rules select only the named Stag review markers',async()=>{
 await temporary(async file=>{await writeFile(file,'/* END Stag and NYE mobile text */\n');await buildStagReviewedTextStyles(file);const css=await readFile(file,'utf8'),ast=frontend('postcss').parse(css),media=[],rules=[];ast.walkAtRules(n=>media.push([n.name,n.params]));ast.walkRules(n=>rules.push(n));assert.deepEqual(media,[['media','(max-width: 600px)']]);assert.equal(rules.length,2);const scope='body.ktk-code-page[data-ktk-page="krakow-stag-do"] #main-content :is([data-ktk-group-planning-review],[data-ktk-group-activity-review])';assert.equal(rules[0].selector,scope);assert.equal(rules[1].selector,scope+' :is(p,li)');for(const rule of rules){assert.equal(rule.parent.name,'media');assert.deepEqual(rule.nodes.map(n=>[n.prop,n.value,!!n.important]),[['font-size','16px',false],['line-height','1.65',false]]);}assert.ok(!/padding|margin|text-align|url\(|display|visibility|transition|animation|transform|!important/.test(css));});
});
