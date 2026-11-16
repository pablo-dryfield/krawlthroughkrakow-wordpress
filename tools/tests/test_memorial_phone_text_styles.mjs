import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildMemorialPhoneTextStyles} from '../memorial-phone-text-styles.mjs';
const frontend=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const pattern=/\/\* BEGIN Memorial mobile text \*\/[\s\S]*?\/\* END Memorial mobile text \*\/\n/g;
async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-memorial-phone-type-'));try{await run(path.join(directory,'runtime.css'));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-memorial-phone-type-'));await rm(directory,{recursive:true,force:true});}}

test('phone generation preserves every old CSS byte at the exact boundary and is idempotent',async()=>{
 await temporary(async file=>{const source=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),base=source.replace(pattern,'');await writeFile(file,base);await buildMemorialPhoneTextStyles(file);const once=await readFile(file,'utf8'),blocks=once.match(pattern);assert.equal(blocks.length,1);assert.equal(once.replace(pattern,''),base);assert.ok(once.includes('/* END Reviewed Stag mobile text */\n'+blocks[0]));await buildMemorialPhoneTextStyles(file);assert.equal(await readFile(file,'utf8'),once);});
});
test('missing, duplicate, partial, moved and changed boundaries refuse without writing',async()=>{
 await temporary(async file=>{const base='/* old */\n/* END Reviewed Stag mobile text */\n/* next */\n';await writeFile(file,base);await buildMemorialPhoneTextStyles(file);const once=await readFile(file,'utf8');for(const source of [base.replace('/* END Reviewed Stag mobile text */','missing'),base+'/* END Reviewed Stag mobile text */\n',once.replace('/* END Memorial mobile text */','missing'),once+'/* BEGIN Memorial mobile text */',once.replace('font-size: 16px','font-size: 15px'),once.replace('/* END Reviewed Stag mobile text */\n','/* END Reviewed Stag mobile text */\n/* unexpected */\n')]){await writeFile(file,source);await assert.rejects(()=>buildMemorialPhoneTextStyles(file));assert.equal(await readFile(file,'utf8'),source);}});
});
test('two font rules and one anchor-offset rule select only existing Memorial text and topic headings',async()=>{
 await temporary(async file=>{await writeFile(file,'/* END Reviewed Stag mobile text */\n');await buildMemorialPhoneTextStyles(file);const css=await readFile(file,'utf8'),ast=frontend('postcss').parse(css),media=[],rules=[];ast.walkAtRules(n=>media.push([n.name,n.params]));ast.walkRules(n=>rules.push(n));assert.deepEqual(media,[['media','(max-width: 600px)']]);assert.equal(rules.length,3);const scope='body.ktk-code-page[data-ktk-page="post-all-you-need-to-know-about-visiting-auschwitz"] #main-content ';assert.equal(rules[0].selector,scope+':is([data-ktk-memorial-review],[data-ktk-memorial-directions])');assert.equal(rules[1].selector,scope+'[data-ktk-memorial-review] :is(p,li)');for(const rule of rules.slice(0,2)){assert.equal(rule.parent.name,'media');assert.deepEqual(rule.nodes.map(n=>[n.prop,n.value,!!n.important]),[['font-size','16px',false],['line-height','1.65',false]]);}assert.equal(rules[2].selector,scope+'[data-ktk-memorial-review] h2[id^="memorial-"]');assert.deepEqual(rules[2].nodes.map(n=>[n.prop,n.value,!!n.important]),[['scroll-margin-top','24px',false]]);assert.ok(!/padding|text-align|url\(|display|visibility|transition|animation|transform|!important/.test(css));});
});
