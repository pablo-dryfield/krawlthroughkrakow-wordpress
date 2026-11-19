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
test('optional page styles stay inside the final shared block and defaults stay unchanged',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-a11y-extra-'));
 try{
  const file=path.join(directory,'runtime.css'),original='/* Existing rules */\na { color: white; }\n',additionalStyles='body.ktk-code-page[data-ktk-page="example"] p { font-size: 16px; }\n';
  await writeFile(file,original);await buildContentAccessibilityStyles(file);const standard=await readFile(file,'utf8');
  await buildContentAccessibilityStyles(file,{additionalStyles});const extended=await readFile(file,'utf8');
  assert.equal(extended.replace(additionalStyles,''),standard);assert.ok(extended.endsWith(additionalStyles+'/* END shared content accessibility */\n'));
  await buildContentAccessibilityStyles(file,{additionalStyles});assert.equal(await readFile(file,'utf8'),extended);
  await buildContentAccessibilityStyles(file);assert.equal(await readFile(file,'utf8'),standard);
 }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-a11y-extra-'));await rm(directory,{recursive:true,force:true});}
});
test('extra shared markers or non-string additions refuse before rewriting',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-a11y-extra-'));
 try{
  const file=path.join(directory,'runtime.css'),original='a { color: white; }\n';await writeFile(file,original);
  for(const additionalStyles of [null,{},'/* BEGIN shared content accessibility */','/* END shared content accessibility */']){await assert.rejects(buildContentAccessibilityStyles(file,{additionalStyles}));assert.equal(await readFile(file,'utf8'),original);}
 }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-a11y-extra-'));await rm(directory,{recursive:true,force:true});}
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
