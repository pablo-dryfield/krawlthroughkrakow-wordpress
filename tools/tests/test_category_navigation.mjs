import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadCategoryNavigation,reviseCategoryNavigation,reviseCategoryNavigationSourceReference,buildCategoryNavigationStyles} from '../category-navigation.mjs';

test('seven reviewed category preimages and fourteen existing destinations remain explicit',async()=>{
  const rows=await loadCategoryNavigation();assert.equal(rows.length,7);assert.equal(rows.reduce((n,r)=>n+r.destinations.length,0),14);
  for(const r of rows){assert.equal(createHash('sha256').update(r.preparedHtml).digest('hex'),r.preparedSha256);assert.equal(r.version,'2026-11-17.category-navigation-1');assert.equal((r.introduction.match(/<a /g)||[]).length,2);assert.doesNotMatch(r.introduction,/<(?:form|script|style|iframe|img)\b|utm_|gclid|gbraid|wbraid|\ufffd/);assert.ok(r.heading);}
});

test('all109 other registry routes plus private/store roots are inert without DOM access',async()=>{
  const rows=await loadCategoryNavigation(),keys=new Set(rows.map(r=>r.key)),manifest=JSON.parse(await readFile(new URL('../../docs/code-pages/full-migration/manifest.json',import.meta.url),'utf8')),others=manifest.routes.filter(r=>!keys.has(r.key));assert.equal(others.length,109);
  for(const key of [...others.map(r=>r.key),'store','store2','cart','checkout','orders','unknown'])for(const fn of [reviseCategoryNavigation,reviseCategoryNavigationSourceReference])assert.deepEqual(fn({key,revision:null}),[]);
});

test('all seven missing or changed identities refuse before DOM access',async()=>{
  for(const r of await loadCategoryNavigation())for(const revision of [null,{...r,key:'wrong'},{...r,version:'changed'},{...r,preparedHtml:null},{...r,introduction:null}])for(const fn of [reviseCategoryNavigation,reviseCategoryNavigationSourceReference])assert.throws(()=>fn({key:r.key,revision}),/Exact .*category/);
});

async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-category-style-')),file=path.join(directory,'runtime.css');assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-category-style-'));try{await run(file);}finally{try{await unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}await rmdir(directory);}}

test('new CSS preserves every old byte at the explicit Europe boundary and is idempotent',async()=>{
  await temporary(async file=>{const current=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),styles=await readFile(new URL('../category-navigation.css',import.meta.url),'utf8'),before=current.replace(styles,'');await writeFile(file,before);await buildCategoryNavigationStyles(file);const once=await readFile(file,'utf8');assert.equal(once.replace(styles,''),before);assert.ok(once.includes('/* END Europe article header clearance */\n'+styles));await buildCategoryNavigationStyles(file);assert.equal(await readFile(file,'utf8'),once);assert.equal((styles.match(/@media/g)||[]).length,1);assert.match(styles,/@media \(max-width: 600px\)/);assert.doesNotMatch(styles,/!important|display:|position:|transform:|visibility:/);});
});

test('partial, duplicate, missing and changed CSS boundaries preserve their input',async()=>{
  await temporary(async file=>{const base='/* END Europe article header clearance */\n';await writeFile(file,base);await buildCategoryNavigationStyles(file);const once=await readFile(file,'utf8');for(const css of ['missing',base+base,once.replace('/* END Category archive navigation */','missing'),once+'/* BEGIN Category archive navigation */',once.replace('padding-right: 24px','padding-right: 0')]){await writeFile(file,css);await assert.rejects(()=>buildCategoryNavigationStyles(file));assert.equal(await readFile(file,'utf8'),css);}});
});
