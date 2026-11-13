import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildContentAccessibilityStyles} from '../content-accessibility-styles.mjs';

test('shared styles preserve the original cascade and generate idempotently',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-a11y-'));
 try{
  const file=path.join(directory,'runtime.css'),original='/* Existing rules */\na { color: white; }\n';
  await writeFile(file,original);await buildContentAccessibilityStyles(file);
  const first=await readFile(file,'utf8');
  assert.ok(first.startsWith(original));assert.ok(first.includes('min-height: 32px'));
  await buildContentAccessibilityStyles(file);assert.equal(await readFile(file,'utf8'),first);
 }finally{await rm(directory,{recursive:true,force:true});}
});
for(const [name,source] of [
 ['unterminated','/* BEGIN shared content accessibility */'],
 ['reversed','/* END shared content accessibility */\n/* BEGIN shared content accessibility */'],
 ['repeated','/* BEGIN shared content accessibility */\n/* BEGIN shared content accessibility */\n/* END shared content accessibility */'],
 ['trailing rules','/* BEGIN shared content accessibility */\n/* END shared content accessibility */\na {color:red}']
])test('rejects '+name+' without rewriting',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-a11y-'));
 try{
  const file=path.join(directory,'runtime.css');await writeFile(file,source);
  await assert.rejects(buildContentAccessibilityStyles(file));assert.equal(await readFile(file,'utf8'),source);
 }finally{await rm(directory,{recursive:true,force:true});}
});
