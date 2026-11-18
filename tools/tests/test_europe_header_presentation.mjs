import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadEuropeHeaderPresentation,reviseEuropeHeaderPresentation,buildEuropeHeaderStyles} from '../europe-header-presentation.mjs';

test('Europe presentation binds the independently inventoried prepared body',async()=>{
  const revision=await loadEuropeHeaderPresentation();
  assert.equal(revision.key,'post-best-pub-crawls-in-europe');
  assert.equal(createHash('sha256').update(revision.before).digest('hex'),'5bb95d9893af114a4f51401f3f4ff50e7fb154019f0a956421d75192728e97c5');
  assert.equal((revision.before.match(/<h1\b/g)||[]).length,1);
  assert.equal((revision.before.match(/<h3 id="europe-/g)||[]).length,6);
  assert.equal((revision.before.match(/<img\b/g)||[]).length,3);
});

test('all other routes remain inert without DOM access',()=>{
  for(const key of ['post-budapest-or-krakow-nightlife','post-hostel-hangover-cure','competition','blog','contact','store2','unknown']) assert.deepEqual(reviseEuropeHeaderPresentation({key,revision:null}),[]);
});

test('missing or changed identity refuses before DOM access',async()=>{
  const r=await loadEuropeHeaderPresentation();
  for(const revision of [null,{...r,key:'other'},{...r,version:'changed'},{...r,before:null}]) assert.throws(()=>reviseEuropeHeaderPresentation({key:r.key,revision}),/Exact Europe presentation revision/);
});

async function temporary(run){
  const directory=await mkdtemp(path.join(tmpdir(),'ktk-europe-style-')),file=path.join(directory,'runtime.css');
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-europe-style-'));
  try{await run(file);}finally{try{await unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}await rmdir(directory);}
}

test('one-route phone inset preserves all old CSS bytes and repeated builds are exact',async()=>{
  await temporary(async file=>{
    const source='/* old unchanged */\n/* END Legal mobile text clearance */\n\n/* following unchanged */\n',styles=await readFile(new URL('../europe-header-presentation.css',import.meta.url),'utf8');
    await writeFile(file,source);await buildEuropeHeaderStyles(file);const once=await readFile(file,'utf8');assert.equal(once.replace(styles,''),source);assert.ok(once.includes('/* END Legal mobile text clearance */\n'+styles));await buildEuropeHeaderStyles(file);assert.equal(await readFile(file,'utf8'),once);
    assert.equal((styles.match(/@media/g)||[]).length,1);assert.match(styles,/@media \(max-width: 600px\)/);assert.equal((styles.match(/padding-right:/g)||[]).length,1);assert.doesNotMatch(styles,/!important|display:|position:|font-size:/);
  });
});

test('missing, duplicate, partial and changed style boundaries refuse without writing',async()=>{
  await temporary(async file=>{
    const base='/* END Legal mobile text clearance */\n';await writeFile(file,base);await buildEuropeHeaderStyles(file);const once=await readFile(file,'utf8');
    for(const source of ['missing',base+base,once.replace('/* END Europe article header clearance */','missing'),once+'/* BEGIN Europe article header clearance */',once.replace('padding-right: 24px','padding-right: 0')]){await writeFile(file,source);await assert.rejects(()=>buildEuropeHeaderStyles(file));assert.equal(await readFile(file,'utf8'),source);}
  });
});
