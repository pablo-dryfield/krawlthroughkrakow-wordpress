import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildReviewedGuideTextStyles,reviewedGuideTextStyles} from '../reviewed-guide-text-styles.mjs';
const anchor='/* END Secondary holiday guide */\n';
async function temporary(run){
  const directory=await mkdtemp(path.join(tmpdir(),'ktk-reviewed-guide-type-'));
  try{await run(path.join(directory,'runtime.css'));}
  finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-reviewed-guide-type-'));await rm(directory,{recursive:true,force:true});}
}
test('whole prior stylesheet survives at one exact boundary and repeat preserves bytes',async()=>temporary(async file=>{
  const current=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8');
  const original=current.replace(reviewedGuideTextStyles,'');await writeFile(file,original);
  await buildReviewedGuideTextStyles(file);const once=await readFile(file,'utf8');
  assert.equal(once,original.replace(anchor,anchor+reviewedGuideTextStyles));assert.equal(once.replace(reviewedGuideTextStyles,''),original);
  await buildReviewedGuideTextStyles(file);assert.equal(await readFile(file,'utf8'),once);
}));
test('missing duplicate moved partial or changed boundaries refuse before writing',async()=>temporary(async file=>{
  const base='/* prior */\n'+anchor+'/* later */\n',once=base.replace(anchor,anchor+reviewedGuideTextStyles);
  for(const value of [base.replace(anchor,''),base+anchor,once.replace('/* END Reviewed guide reading text */','missing'),once+'/* BEGIN Reviewed guide reading text */',once.replace('font-size: 16px','font-size: 15px'),once.replace(anchor,anchor+'/* moved */\n')]){
    await writeFile(file,value);await assert.rejects(()=>buildReviewedGuideTextStyles(file));assert.equal(await readFile(file,'utf8'),value);
  }
}));
