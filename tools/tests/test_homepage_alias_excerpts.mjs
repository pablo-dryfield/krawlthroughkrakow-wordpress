import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadHomepageAliasExcerpts,reviseHomepageAliasExcerpts,buildHomepageAliasExcerptStyles} from '../homepage-alias-excerpts.mjs';

test('five prepared containers contain exactly six excerpts of the existing homepage alias',async()=>{
  const rows=await loadHomepageAliasExcerpts();assert.equal(rows.length,5);assert.equal(rows.reduce((n,r)=>n+r.targets.length,0),6);
  for(const r of rows){assert.equal(createHash('sha256').update(r.preparedHtml).digest('hex'),r.preparedSha256);assert.match(r.summary,/on our homepage/);assert.doesNotMatch(r.summary,/<|>|\ufffd|ultimate|best areas|getting drunk|\b202[0-9]\b/);assert.equal(r.version,'2026-11-17.homepage-alias-excerpts-1');}
});

test('all111 other registry routes and private/store identities are inert without DOM access',async()=>{
  const rows=await loadHomepageAliasExcerpts(),keys=new Set(rows.map(r=>r.key)),manifest=JSON.parse(await readFile(new URL('../../docs/code-pages/full-migration/manifest.json',import.meta.url),'utf8')),others=manifest.routes.filter(r=>!keys.has(r.key));assert.equal(others.length,111);
  for(const key of [...others.map(r=>r.key),'store','store2','cart','checkout','orders','unknown'])assert.deepEqual(reviseHomepageAliasExcerpts({key,revision:null}),[]);
});

test('changed alias identities and unreviewed markup refuse before DOM access',async()=>{
  for(const r of await loadHomepageAliasExcerpts())for(const revision of [null,{...r,key:'changed'},{...r,version:'changed'},{...r,preparedHtml:null},{...r,targets:[]},{...r,summary:'<script>changed</script>'}])assert.throws(()=>reviseHomepageAliasExcerpts({key:r.key,revision}),/Exact reviewed homepage-alias revision/);
});

test('excerpt CSS inserts once at the category boundary and refuses drift atomically',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'ktk-alias-styles-')),file=path.join(directory,'runtime.css');assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-alias-styles-'));
  try{
    const before='/* END Category archive navigation */\noriginal outside bytes\n';await writeFile(file,before);await buildHomepageAliasExcerptStyles(file);const once=await readFile(file,'utf8'),styles=await readFile(new URL('../homepage-alias-excerpts.css',import.meta.url),'utf8');assert.equal(once.replace(styles,''),before);assert.ok(once.startsWith('/* END Category archive navigation */\n'+styles));await buildHomepageAliasExcerptStyles(file);assert.equal(await readFile(file,'utf8'),once);
    for(const source of ['missing',before+before,once.replace('/* END Homepage alias excerpts */','missing'),once+'/* BEGIN Homepage alias excerpts */',once.replace('24px','0px')]){await writeFile(file,source);await assert.rejects(()=>buildHomepageAliasExcerptStyles(file));assert.equal(await readFile(file,'utf8'),source);}
  }finally{try{await unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}await rmdir(directory);}
});
