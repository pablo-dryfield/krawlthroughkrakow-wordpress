import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {buildLegalMobileTextStyles,legalMobileStyles,legalMobileScope,legalMobilePageKeys} from '../legal-mobile-text-styles.mjs';
const anchor='/* END Reviewed venue phone text */\n',frontend=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-legal-text-'));try{await run(path.join(directory,'runtime.css'));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-legal-text-'));await rm(directory,{recursive:true,force:true});}}

test('generation preserves every prior byte and repeats without changing the stylesheet',async()=>temporary(async file=>{
 const source=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),base=source.replace(legalMobileStyles,'');
 await writeFile(file,base);await buildLegalMobileTextStyles(file);const once=await readFile(file,'utf8');assert.equal(once,base.replace(anchor,anchor+legalMobileStyles));assert.equal(once.replace(legalMobileStyles,''),base);await buildLegalMobileTextStyles(file);assert.equal(await readFile(file,'utf8'),once);
}));

test('missing, duplicate, partial, moved and changed prior output refuse atomically',async()=>temporary(async file=>{
 const base='/* previous */\n'+anchor+'/* following */\n',once=base.replace(anchor,anchor+legalMobileStyles);
 for(const source of [base.replace(anchor,''),base+anchor,once.replace('/* END Legal mobile text clearance */','missing'),once+'/* BEGIN Legal mobile text clearance */',once.replace('font-size: 16px','font-size: 15px'),once.replace(anchor,anchor+'/* moved */\n')]){await writeFile(file,source);await assert.rejects(()=>buildLegalMobileTextStyles(file));assert.equal(await readFile(file,'utf8'),source);}
}));

test('only original legal prose changes through980px and its container gains phone tab clearance',()=>{
 const ast=frontend('postcss').parse(legalMobileStyles),media=[],rules=[];ast.walkAtRules(n=>media.push([n.name,n.params]));ast.walkRules(n=>rules.push(n));
 assert.deepEqual(legalMobilePageKeys,['privacy-policy','terms-and-conditions']);assert.equal(legalMobileScope,'body.ktk-code-page:is([data-ktk-page="privacy-policy"],[data-ktk-page="terms-and-conditions"]) #main-content .et_pb_text_1 .et_pb_text_inner');
 assert.deepEqual(media,[['media','(max-width: 980px)'],['media','(max-width: 600px)']]);assert.equal(rules.length,2);assert.equal(rules[0].selector,legalMobileScope+' :is(p,li)');assert.equal(rules[1].selector,legalMobileScope);
 assert.deepEqual(rules[0].nodes.map(n=>[n.prop,n.value,!!n.important]),[['font-size','16px',false],['line-height','1.65',false]]);assert.deepEqual(rules[1].nodes.map(n=>[n.prop,n.value,!!n.important]),[['padding-right','24px',false]]);
});
