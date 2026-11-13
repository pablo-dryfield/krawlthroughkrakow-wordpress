import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadReviewedImageDescriptions,localizeReviewedImageMarkup} from '../content-image-descriptions.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('release comparison expands both actual portable asset and home-link tokens',()=>{
 const base='https://krawlthroughkrakow.com/staging';
 assert.equal(localizeReviewedImageMarkup('<img src="__KTK_PAGE_ASSETS__media/photo.jpg"><a href="__KTK_HOME_URL__terms/" aria-label="Terms">Terms</a>',base),'<img src="'+base+'/wp-content/mu-plugins/ktk-code-pages-assets/media/photo.jpg"><a href="'+base+'/terms/" aria-label="Terms">Terms</a>');
});
test('release localization does not rewrite ordinary external links or attribution',()=>{
 const original='<a href="https://other.test/photo.jpg?utm_source=retained#photo" aria-label="Source photo">Photo</a>';
 assert.equal(localizeReviewedImageMarkup(original,'https://krawlthroughkrakow.com/staging'),original);
});

async function fixture(change=()=>{}){
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-image-review-'));
 const options={assetsDirectory:path.join(directory,'assets'),manifestFile:path.join(directory,'manifest.json'),reviewFile:path.join(directory,'review.json')};
 await mkdir(path.join(options.assetsDirectory,'media'),{recursive:true});
 const bytes=Buffer.from('A reviewed test image');
 const manifest={'https://example.test/one.png':{file:'media/aaaaaaaaaaaa-one.png',sha256:sha(bytes)},'https://example.test/two.jpg':{file:'media/bbbbbbbbbbbb-two.jpg',sha256:sha(bytes)}};
 for(const asset of Object.values(manifest))await writeFile(path.join(options.assetsDirectory,asset.file),bytes);
 const review={schemaVersion:1,status:'visually-reviewed',reviewedOn:'2026-11-13',heldImageIds:['cccccccccccc'],descriptions:{aaaaaaaaaaaa:'A source-reviewed scene.'},emptyAltOverrides:{bbbbbbbbbbbb:'An explicitly reviewed linked photo.'}};
 await change({directory,options,manifest,review});
 const manifestBytes=Buffer.from(JSON.stringify(manifest));
 review.assetManifestSha256??=sha(manifestBytes);
 await writeFile(options.manifestFile,manifestBytes);await writeFile(options.reviewFile,JSON.stringify(review));
 return {directory,options};
}
async function cleanup(directory){
 assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-image-review-'));
 await rm(directory,{recursive:true,force:true});
}
test('binds reviewed descriptions to exact bytes and both source/generated paths',async()=>{
 const {directory,options}=await fixture();
 try{
  const result=await loadReviewedImageDescriptions(options);
  assert.deepEqual(result.counts,{missing:1,empty:1});
  assert.equal(result.missing['https://example.test/one.png'],'A source-reviewed scene.');
  assert.equal(result.missing['__KTK_PAGE_ASSETS__media/aaaaaaaaaaaa-one.png'],'A source-reviewed scene.');
  assert.equal(result.empty['https://example.test/two.jpg'],'An explicitly reviewed linked photo.');
  assert.equal(result.sourceSha256,sha(await readFile(options.reviewFile)));
 }finally{await cleanup(directory);}
});
for(const [name,change] of [
 ['draft review',({review})=>{review.status='draft';}],
 ['stale manifest binding',({review})=>{review.assetManifestSha256='0'.repeat(64);}],
 ['changed image bytes',async({options})=>{await writeFile(path.join(options.assetsDirectory,'media/aaaaaaaaaaaa-one.png'),'changed');}],
 ['held image',({review})=>{review.heldImageIds.push('aaaaaaaaaaaa');}],
 ['same identity in two modes',({review})=>{review.emptyAltOverrides.aaaaaaaaaaaa='Duplicate';}],
 ['unreviewed identity',({review})=>{review.descriptions.dddddddddddd='Unknown';}],
 ['ambiguous source identity',({manifest})=>{manifest['https://example.test/alias.png']={...manifest['https://example.test/one.png']};}],
 ['empty description',({review})=>{review.descriptions.aaaaaaaaaaaa='';}],
 ['overlong description',({review})=>{review.descriptions.aaaaaaaaaaaa='a'.repeat(201);}],
 ['path outside owned assets',({manifest})=>{manifest['https://example.test/one.png'].file='media/aaaaaaaaaaaa-/../../outside.png';}],
 ['unsupported asset type',({manifest})=>{manifest['https://example.test/one.png'].file='media/aaaaaaaaaaaa-one.php';}]
])test('rejects '+name,async()=>{
 const {directory,options}=await fixture(change);
 try{await assert.rejects(loadReviewedImageDescriptions(options));}finally{await cleanup(directory);}
});
