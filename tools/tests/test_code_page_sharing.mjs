import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {codePageTitle,codePageHeadDescription,loadSharingImagePolicy,buildCodePageSharing} from '../code-page-sharing.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixture={route:'/krakow-techno-clubs/',kind:'blog post',title:'Krakow Techno Clubs | Krawl Through Krakow',description:'A practical guide & venue shortlist.'};
const photo={file:'media/123456abcdef-original.jpg',width:1200,height:630,bytes:50000,mime:'image/jpeg',alt:'Guests at a music venue'};
test('all39 reviewed archive identities produce distinct titles without changing other pages',async()=>{
 const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8')),titles=[];
 for(const row of manifest.routes){const capture=JSON.parse(await readFile(row.source+'/production-1920.json','utf8'));const result=codePageTitle(row.route,capture.title);
  if(/^\/(?:author|tag|category)\//.test(row.route)){titles.push(result);assert.notEqual(result,capture.title);const description=codePageHeadDescription(row.route,capture.metadata.description);assert.doesNotMatch(description,/<|>/);assert.notEqual(description,capture.metadata.description);if(row.route.includes('/page/'))assert.match(result,new RegExp('Page '+row.route.match(/\/page\/(\d+)\//)[1]+' \\|'));}
  else assert.equal(result,capture.title);
 }
 assert.equal(titles.length,39);assert.equal(new Set(titles).size,39);
});
test('title policy rejects changed source identity and unreviewed archive labels',()=>{
 assert.throws(()=>codePageTitle('/author/dpbowman/','Different Person | Krawl Through Krakow'));
 assert.throws(()=>codePageTitle('/tag/new-label/','New Label | Krawl Through Krakow'));
 assert.throws(()=>codePageTitle('/category/krakow-guides/page/1/','Krakow Guides | Krawl Through Krakow'));
 assert.throws(()=>codePageHeadDescription('/tag/drinking-games/','Tag: <script>Drinking Games</script>'));
 assert.equal(codePageHeadDescription('/about-us/','original'),'original');
 for(const route of ['/staging/about-us/','/store2/pub-crawl-28/','https://example.com/','/about-us/?x=1'])assert.throws(()=>codePageTitle(route,'Title'));
});
test('sharing uses actual featured image, escaped text, URL and dimensions without invented account/date',()=>{
 const html=buildCodePageSharing({...fixture,image:photo});
 assert.match(html,/og:type" content="article/);assert.match(html,/og:image:width" content="1200/);
 assert.match(html,/og:image:height" content="630/);assert.match(html,/twitter:card" content="summary_large_image/);
 assert.match(html,/A practical guide &amp; venue shortlist/);assert.match(html,/og:url" content="https:\/\/krawlthroughkrakow.com\/krakow-techno-clubs\//);
 assert.doesNotMatch(html,/twitter:site|article:(?:modified|published)_time|staging/);
 assert.equal((html.match(/property="og:image"/g)||[]).length,1);
});
test('no fabricated image for a page without a real source-backed image',()=>{
 const html=buildCodePageSharing(fixture);assert.match(html,/twitter:card" content="summary"/);assert.doesNotMatch(html,/og:image|twitter:image/);
 const large=buildCodePageSharing({...fixture,image:{...photo,bytes:6*1024*1024}});assert.doesNotMatch(large,/og:image|twitter:image/);
});
test('medical hold retains original metadata; unexpected inherited markup elsewhere requires review',()=>{
 assert.equal(buildCodePageSharing({...fixture,route:'/hostel-hangover-cure/',inherited:''}),'');
 assert.throws(()=>buildCodePageSharing({...fixture,inherited:'<meta property="og:title" content="previous">'}));
});
test('malicious metadata, foreign image paths and invalid actual dimensions cannot enter head',()=>{
 for(const title of ['<script>x</script>','line\nbreak',' leading',''])assert.throws(()=>buildCodePageSharing({...fixture,title}));
 for(const image of [{...photo,file:'../other.jpg'},{...photo,file:'https://example.com/a.jpg'},{...photo,width:200.5},{...photo,mime:'image/svg+xml'},{...photo,alt:'<script>x</script>'}])assert.throws(()=>buildCodePageSharing({...fixture,image}));
 assert.match(buildCodePageSharing({...fixture,title:'A "quoted" title'}),/&quot;quoted&quot;/);
});
test('sharing image loader binds real local bytes/dimensions and fails stale or ambiguous identity',async()=>{
 const prefix=path.resolve(tmpdir(),'ktk-sharing-'),dir=await mkdtemp(prefix);
 try{
  const {mkdir}=await import('node:fs/promises');await mkdir(path.join(dir,'media'));
  const file='media/123456abcdef-dot.png',bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=','base64');
  await writeFile(path.join(dir,file),bytes);
  const data=JSON.stringify({'https://krawlthroughkrakow.com/original.png':{file,sha256:hash(bytes)}}),manifestFile=path.join(dir,'manifest.json');await writeFile(manifestFile,data);
  const options={manifestFile,assetsDirectory:dir,expectedManifestSha256:hash(data)};
  const load=await loadSharingImagePolicy(options),image=await load({src:'__KTK_PAGE_ASSETS__'+file,alt:'A small source fixture'});
  assert.equal(image.width,1);assert.equal(image.height,1);assert.equal(image.mime,'image/png');assert.equal(image.bytes,bytes.length);
  assert.equal(await load({src:'https://example.com/foreign.png',alt:'foreign'}),null);
  await assert.rejects(loadSharingImagePolicy({...options,expectedManifestSha256:'0'.repeat(64)}));
  const ambiguous=JSON.stringify({first:{file,sha256:hash(bytes)},second:{file,sha256:hash(bytes)}});await writeFile(manifestFile,ambiguous);
  const duplicate=await loadSharingImagePolicy({...options,expectedManifestSha256:hash(ambiguous)});await assert.rejects(duplicate({src:'__KTK_PAGE_ASSETS__'+file,alt:'Fixture'}));await writeFile(manifestFile,data);
  await writeFile(path.join(dir,file),Buffer.concat([bytes,Buffer.from('changed')]));const fresh=await loadSharingImagePolicy(options);await assert.rejects(fresh({src:'__KTK_PAGE_ASSETS__'+file,alt:'Fixture'}));
 }finally{if(!path.resolve(dir).startsWith(prefix)||path.dirname(path.resolve(dir))!==path.resolve(tmpdir()))throw Error('Unexpected test cleanup path');await rm(dir,{recursive:true});}
});
