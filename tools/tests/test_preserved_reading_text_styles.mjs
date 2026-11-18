import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildPreservedReadingTextStyles,preservedReadingStyles,preservedReadingTargets} from '../preserved-reading-text-styles.mjs';

const anchor='/* END Reviewed site reading text */\n';
const sourceRoot=new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/',import.meta.url);
async function fixture(run){
  const root=await mkdtemp(path.join(tmpdir(),'ktk-preserved-reading-'));
  try{
    await mkdir(path.join(root,'content'));
    for(const target of preservedReadingTargets)await copyFile(new URL('content/'+target.key+'.html',sourceRoot),path.join(root,'content',target.key+'.html'));
    await run(path.join(root,'runtime.css'),root);
  }finally{
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir())+path.sep+'ktk-preserved-reading-'));
    await rm(root,{recursive:true,force:true});
  }
}

test('complete previous stylesheet survives and repeated generation preserves every byte',async()=>fixture(async file=>{
  const current=await readFile(new URL('runtime.css',sourceRoot),'utf8');
  const previous=current.replace(preservedReadingStyles,'');await writeFile(file,previous);
  await buildPreservedReadingTextStyles(file);const once=await readFile(file,'utf8');
  assert.equal(once,previous.replace(anchor,anchor+preservedReadingStyles));
  assert.equal(once.replace(preservedReadingStyles,''),previous);
  await buildPreservedReadingTextStyles(file);assert.equal(await readFile(file,'utf8'),once);
}));

test('changed or missing generated body refuses before writing any stylesheet bytes',async()=>fixture(async(file,root)=>{
  const original='/* before */\n'+anchor+'/* after */\n';await writeFile(file,original);
  const body=path.join(root,'content',preservedReadingTargets[0].key+'.html');const old=await readFile(body);
  await writeFile(body,Buffer.concat([old,Buffer.from('changed')]));
  await assert.rejects(()=>buildPreservedReadingTextStyles(file),/body source changed/);assert.equal(await readFile(file,'utf8'),original);
  await rm(body);await assert.rejects(()=>buildPreservedReadingTextStyles(file),/ENOENT/);assert.equal(await readFile(file,'utf8'),original);
}));

test('partial duplicate changed moved or missing style boundaries refuse atomically',async()=>fixture(async file=>{
  const base='/* before */\n'+anchor+'/* after */\n',once=base.replace(anchor,anchor+preservedReadingStyles);
  for(const value of [base.replace(anchor,''),base+anchor,once.replace('/* END Preserved reading text */','missing'),once+'/* BEGIN Preserved reading text */',once.replace('font-size: 16px','font-size: 15px'),once.replace(anchor,anchor+'/* moved */\n')]){
    await writeFile(file,value);await assert.rejects(()=>buildPreservedReadingTextStyles(file),/boundary|drift/);assert.equal(await readFile(file,'utf8'),value);
  }
}));
