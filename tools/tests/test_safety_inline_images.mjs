import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadSafetyInlineImages,reviseSafetyInlineImages} from '../safety-inline-images.mjs';

test('loads exact reviewed whole photos and complete AVIF/JPEG width ranges',async()=>{
 const result=await loadSafetyInlineImages();
 assert.equal(result.photos.length,3);
 for(const row of result.photos){
  assert.equal(row.expectedAttrs.loading,'lazy');
  assert.ok(row.avifSrcset.endsWith(' '+row.width+'w'));
  assert.ok(row.jpegSrcset.endsWith(row.expectedAttrs.src+' '+row.width+'w'));
  assert.equal(row.sizes,'(max-width: 980px) 80vw, 1024px');
 }
 assert.match(result.photos[0].expectedAttrs.alt,/notebook, pencil and leather bag/);
});

test('refuses changed manifest bytes before using its paths or DOM',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-safety-inline-'));
 try{
  const file=path.join(directory,'manifest.json');
  await writeFile(file,Buffer.concat([await readFile(new URL('../safety-inline-images.json',import.meta.url)),Buffer.from('\n')]));
  await assert.rejects(loadSafetyInlineImages({manifestFile:pathToFileURL(file)}),/manifest changed/);
 }finally{
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-safety-inline-'));
  await rm(directory,{recursive:true,force:true});
 }
});

test('unrelated and held routes return before accessing DOM',()=>{
 for(const key of ['other','constructor','__proto__','post-hostel-hangover-cure','post-welcome-to-alcohol'])assert.deepEqual(reviseSafetyInlineImages({key}),[]);
});

test('refuses mutated recipe or identity before accessing DOM',async()=>{
 const row=await loadSafetyInlineImages();
 for(const revision of [null,{...row,version:'other'},{...row,manifestSHA256:'0'.repeat(64)},{...row,photos:row.photos.map((p,i)=>i? p:{...p,avifSrcset:p.avifSrcset+', unreviewed.avif 9999w'})}])assert.throws(()=>reviseSafetyInlineImages({key:row.key,revision}),/identity/);
});
