import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadReviewedArticlePresentation,reviseReviewedArticlePresentation,buildReviewedArticlePresentationStyles} from '../reviewed-article-presentation.mjs';

const catalog=JSON.parse(await readFile(new URL('../reviewed-article-presentation.json',import.meta.url),'utf8'));
async function rejects(change){
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-article-presentation-'));try{const data=structuredClone(catalog);change(data);const file=path.join(directory,'catalog.json');await writeFile(file,JSON.stringify(data));await assert.rejects(()=>loadReviewedArticlePresentation({catalogFile:file}));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-article-presentation-'));await rm(directory,{recursive:true,force:true});}
}
test('all forty captures and the photo bind to exact source bytes and reviewed scope',async()=>{
 const rows=await loadReviewedArticlePresentation(),cards=rows.filter(r=>r.kind==='cards');assert.equal(rows.length,41);assert.equal(cards.length,40);assert.equal(cards.reduce((n,r)=>n+r.cardKeys.length,0),166);assert.equal(cards.filter(r=>r.cardKeys.length).length,38);assert.equal(cards.filter(r=>!r.cardKeys.length).length,2);
 for(const r of rows){assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'),r.sourceSha256);assert.match(r.catalogSha256,/^[a-f0-9]{64}$/);assert.equal(r.reviewedOn,'2026-11-14');}
 assert.ok(cards.every(r=>r.articles.length===44&&!r.cardKeys.includes('post-hostel-hangover-cure')));assert.equal(rows.find(r=>r.kind==='photo').photo.alt,'Police officers near people on the ground on a city street at night.');
});
test('unknown schema, version, status, date, manifest and top-level fields reject',async()=>{
 for(const change of [d=>d.schemaVersion=2,d=>d.status='unreviewed',d=>d.version='other',d=>d.reviewedOn='2027-01-01',d=>d.assetManifestSha256='0'.repeat(64),d=>d.extra='unexpected'])await rejects(change);
});
test('held, duplicated, missing, unsafe and stale article identities cannot be configured',async()=>{
 for(const change of [d=>d.articles.pop(),d=>d.articles.push(d.articles[0]),d=>d.articles[1]={...d.articles[0]},d=>d.articles[0].key='post-hostel-hangover-cure',d=>d.articles[0].postId++,d=>d.articles[0].route='/other/',d=>d.articles[0].summary='<script>not a summary</script>',d=>d.articles[0].summary='short',d=>d.articles[0].summary='x'.repeat(251),d=>d.articles[0].summary+=' ',d=>d.articles[0].summary+='\n',d=>d.articles[0].summary+=' utm_source=example',d=>d.articles[0].summary+=' https://example.invalid/',d=>d.articles[0].extra='other'])await rejects(change);
});
test('container order, original source, cardinality and selected-card scope are explicit',async()=>{
 for(const change of [d=>d.containers.pop(),d=>d.containers[0].key='archive-other',d=>d.containers[1]={...d.containers[0]},d=>d.containers[0].captureSha256='0'.repeat(64),d=>d.containers[0].cardKeys=null,d=>d.containers[0].cardKeys=[null],d=>d.containers[0].cardKeys=['post-hostel-hangover-cure'],d=>d.containers.find(c=>c.cardKeys.length).cardKeys.push('post-other'),d=>{const c=d.containers.find(c=>c.cardKeys.length);c.cardKeys.push(c.cardKeys[0]);},d=>d.containers.find(c=>c.cardKeys.length).cardKeys.pop()])await rejects(change);
});
test('neutral photo wording and original image identity cannot broaden silently',async()=>{
 for(const change of [d=>d.photo.key='post-hostel-hangover-cure',d=>d.photo.captureSha256='0'.repeat(64),d=>d.photo.file='media/other.jpg',d=>d.photo.sourceUrl='https://example.invalid/other.jpg',d=>d.photo.sha256='0'.repeat(64),d=>d.photo.oldAlt='unknown',d=>d.photo.alt='A customer in a diagnosed intoxication stage.',d=>d.photo.extra='other'])await rejects(change);
});
test('unrelated routes, prototypes and the held article return before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','post-survive-pub-crawl','contact','__proto__','constructor','',null,undefined])assert.deepEqual(reviseReviewedArticlePresentation({key}),[]);
 for(const key of ['blog','archive-author-thirsty','post-stages-of-drunkenness'])assert.throws(()=>reviseReviewedArticlePresentation({key}),/identity/);
});

test('readability styles are additive, marker scoped, idempotent and drift guarded',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-article-style-'));try{
  const file=path.join(directory,'runtime.css'),original='body { color: black; }\n/* BEGIN Practical night-out guidance */\n';await writeFile(file,original);await buildReviewedArticlePresentationStyles(file);const css=await readFile(file,'utf8');assert.equal(css.replace(/\/\* BEGIN Reviewed article summary readability \*\/[\s\S]*?\/\* END Reviewed article summary readability \*\/\n\n/,''),original);assert.equal((css.match(/p\[data-ktk-reviewed-summary="2026-11-14.article-presentation-2"\]/g)||[]).length,2);assert.match(css,/font-size: 16px; line-height: 1.65; text-align: left/);assert.match(css,/@media \(max-width: 600px\)/);assert.match(css,/padding-right: 24px/);await buildReviewedArticlePresentationStyles(file);assert.equal(await readFile(file,'utf8'),css);
  for(const corrupt of [css.replace('16px','15px'),css.replace('24px','0px'),css+css,css.replace('/* END Reviewed article summary readability */',''),original.replace('Practical night-out','unknown')]){await writeFile(file,corrupt);await assert.rejects(()=>buildReviewedArticlePresentationStyles(file));assert.equal(await readFile(file,'utf8'),corrupt);}
 }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-article-style-'));await rm(directory,{recursive:true,force:true});}
});
