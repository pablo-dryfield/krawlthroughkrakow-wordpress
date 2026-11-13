import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {homepageIconFontStyles,buildHomepageIconFontStyles,iconFontFiles} from '../homepage-icon-font.mjs';
const root='staging/wp-content/mu-plugins/ktk-homepage-assets/';
const files={};
for(const name of Object.keys(iconFontFiles))files[name]=await readFile(root+name);
const source='/* original rules */\na {color:white}\n\n/* BEGIN shared content accessibility */\nbutton {color:black}\n/* END shared content accessibility */\n';
test('homepage full font prefers WOFF2 with original display and both original fallbacks',()=>{
 const result=homepageIconFontStyles(source,files);
 assert.ok(result.includes('font-family: "ETmodules";\n  font-style: normal;\n  font-weight: 400;\n  font-display: block;'));
 assert.ok(result.indexOf('etmodules-full.woff2')<result.indexOf('parity/e5109a227107-modules.woff'));
 assert.ok(result.includes('parity/4ec95df48507-modules.ttf'));
 assert.equal(result.replace(/\/\* BEGIN homepage full icon font delivery \*\/[\s\S]*?\/\* END homepage full icon font delivery \*\/\n\n/,''),source);
 assert.equal(homepageIconFontStyles(result,files),result);
 assert.equal(files['etmodules-full.woff2'].length,29392);
});
test('all three font identities fail closed before a stylesheet is produced',()=>{
 for(const name of Object.keys(files)){
  const changed={...files,[name]:Buffer.from(files[name])};changed[name][0]^=1;
  assert.throws(()=>homepageIconFontStyles(source,changed),/Review changed homepage font/);
  const missing={...files};delete missing[name];
  assert.throws(()=>homepageIconFontStyles(source,missing),/Review changed homepage font/);
 }
});
test('ambiguous or missing anchors and markers are rejected',()=>{
 for(const value of ['body{}',source+source,source+'/* BEGIN homepage full icon font delivery */',source+'/* END homepage full icon font delivery */',source+'/* END homepage full icon font delivery *//* BEGIN homepage full icon font delivery */'])assert.throws(()=>homepageIconFontStyles(value,files));
 const generated=homepageIconFontStyles(source,files);
 assert.throws(()=>homepageIconFontStyles(generated+generated,files),/Ambiguous/);
});
test('content-page subsets cannot receive the homepage override',async()=>{
 await assert.rejects(()=>buildHomepageIconFontStyles('staging/wp-content/mu-plugins/ktk-code-pages-assets'),/Homepage-only/);
 const copied=await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/font-resilience.css','utf8');
 assert.ok(!copied.includes('ETmodules'));
 assert.ok(!copied.includes('etmodules-full'));
});
test('font face precedes the intact adjacent offer/accessibility blocks',()=>{
 const offer='/* BEGIN homepage offer clearance */\na{color:white}\n/* END homepage offer clearance */\n\n';
 const sourceWithOffer=source.replace('/* BEGIN shared content accessibility */',offer+'/* BEGIN shared content accessibility */');
 const generated=homepageIconFontStyles(sourceWithOffer,files);
 assert.ok(generated.indexOf('/* END homepage full icon font delivery */')<generated.indexOf(offer));
 assert.ok(generated.includes(offer+'/* BEGIN shared content accessibility */'));
 assert.equal(homepageIconFontStyles(generated,files),generated);
});
