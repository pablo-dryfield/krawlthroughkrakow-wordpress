import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildShortViewportBookingStyles,shortViewportBookingStyles,shortViewportBookingHeadingTargets} from '../short-viewport-booking-styles.mjs';

const anchor='/* END Preserved reading text */\n';
async function fixture(run){
  const root=await mkdtemp(path.join(tmpdir(),'ktk-short-viewport-'));
  try{await mkdir(path.join(root,'content'));for(const target of shortViewportBookingHeadingTargets)await copyFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/content/'+target.key+'.html',import.meta.url),path.join(root,'content',target.key+'.html'));await run(path.join(root,'runtime.css'),root);}
  finally{assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir())+path.sep+'ktk-short-viewport-'));await rm(root,{recursive:true,force:true});}
}
test('original complete application stylesheet survives insertion and repeat generation',async()=>fixture(async file=>{
  const current=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8');
  const old=current.replace(shortViewportBookingStyles,'');await writeFile(file,old);await buildShortViewportBookingStyles(file);
  const once=await readFile(file,'utf8');assert.equal(once,old.replace(anchor,anchor+shortViewportBookingStyles));assert.equal(once.replace(shortViewportBookingStyles,''),old);
  await buildShortViewportBookingStyles(file);assert.equal(await readFile(file,'utf8'),once);
}));
test('missing duplicate partial changed or moved output refuses without writing',async()=>fixture(async file=>{
  const original='/* before */\n'+anchor+'/* after */\n',once=original.replace(anchor,anchor+shortViewportBookingStyles);
  for(const value of [original.replace(anchor,''),original+anchor,once.replace('/* END Short viewport booking control */','missing'),once+'/* BEGIN Short viewport booking control */',once.replace('top: 8px','top: 9px'),once.replace('outline: 3px','outline: 0px'),once.replace(anchor,anchor+'/* moved */\n')]){
    await writeFile(file,value);await assert.rejects(()=>buildShortViewportBookingStyles(file),/boundary|drift/);assert.equal(await readFile(file,'utf8'),value);
  }
}));
test('each changed or missing guarded heading body refuses before writing any stylesheet bytes',async()=>fixture(async(file,root)=>{
  const original='/* before */\n'+anchor+'/* after */\n';await writeFile(file,original);
  for(const target of shortViewportBookingHeadingTargets){
    const body=path.join(root,'content',target.key+'.html'),bytes=await readFile(body);
    await writeFile(body,Buffer.concat([bytes,Buffer.from('changed')]));await assert.rejects(()=>buildShortViewportBookingStyles(file),/body source/);assert.equal(await readFile(file,'utf8'),original);
    await rm(body);await assert.rejects(()=>buildShortViewportBookingStyles(file),/ENOENT/);assert.equal(await readFile(file,'utf8'),original);
    await writeFile(body,bytes);
  }
}));
