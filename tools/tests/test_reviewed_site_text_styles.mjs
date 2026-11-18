import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildReviewedSiteTextStyles,reviewedSiteTextStyles} from '../reviewed-site-text-styles.mjs';
const anchor='/* END Reviewed guide reading text */\n';
async function temporary(run){
  const directory=await mkdtemp(path.join(tmpdir(),'ktk-reviewed-site-type-'));
  try{await run(path.join(directory,'runtime.css'));}
  finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-reviewed-site-type-'));await rm(directory,{recursive:true,force:true});}
}
test('site text generation retains the whole prior stylesheet and is repeatable',async()=>temporary(async file=>{
  const current=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8');
  const original=current.replace(reviewedSiteTextStyles,'');await writeFile(file,original);
  await buildReviewedSiteTextStyles(file);const once=await readFile(file,'utf8');
  assert.equal(once,original.replace(anchor,anchor+reviewedSiteTextStyles));assert.equal(once.replace(reviewedSiteTextStyles,''),original);
  await buildReviewedSiteTextStyles(file);assert.equal(await readFile(file,'utf8'),once);
}));
test('unknown partial duplicate changed or moved site output refuses without changing bytes',async()=>temporary(async file=>{
  const base='/* prior */\n'+anchor+'/* later */\n',once=base.replace(anchor,anchor+reviewedSiteTextStyles);
  for(const value of [base.replace(anchor,''),base+anchor,once.replace('/* END Reviewed site reading text */','missing'),once+'/* BEGIN Reviewed site reading text */',once.replace('font-size: 16px','font-size: 15px'),once.replace(anchor,anchor+'/* moved */\n')]){
    await writeFile(file,value);await assert.rejects(()=>buildReviewedSiteTextStyles(file));assert.equal(await readFile(file,'utf8'),value);
  }
}));
