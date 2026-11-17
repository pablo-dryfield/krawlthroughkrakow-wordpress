import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../../includes/product-image-sizes.json' with { type: 'json' };
import { responsiveProductImage } from './responsive-product-images.js';

const base='https://krawlthroughkrakow.com/staging/wp-content/plugins/ktk-storefront/assets/';
const urls=Object.keys(manifest.images);

test('eight original public gallery photos retain original largest candidates and intrinsic dimensions',()=>{
  assert.equal(urls.length,8);
  for(const url of urls)for(const id of [28,'28'])for(const role of ['stage','thumbnail']){
    const result=responsiveProductImage(id,url,role,base);
    const image=manifest.images[url];
    assert.equal(result.width,image.width);assert.equal(result.height,image.height);
    assert.equal(result.sizes,manifest.sizes[role]);
    const candidates=result.srcSet.split(', ');
    assert.equal(candidates.length,4);
    assert.equal(candidates.at(-1),`${url} ${image.width}w`);
    assert.deepEqual(candidates.slice(0,3).map(c=>Number(c.match(/ (\d+)w$/)[1])),[360,720,1080]);
    for(const candidate of candidates.slice(0,3))assert.ok(candidate.startsWith(base+'product-images/pub-crawl-'));
    assert.equal(Object.hasOwn(result,'src'),false);
  }
});

test('other products and changed original URLs keep the exact original caller behavior',()=>{
  for(const id of [null,undefined,0,27,29,32,'028',{},['28']])assert.deepEqual(responsiveProductImage(id,urls[0],'stage',base),{});
  for(const url of [null,undefined,'',urls[0]+'?changed=1',urls[0]+'#changed',urls[0].replace('/28/','/29/'),'__proto__'])assert.deepEqual(responsiveProductImage(28,url,'stage',base),{});
  for(const role of [null,'hero','__proto__'])assert.deepEqual(responsiveProductImage(28,urls[0],role,base),{});
});

test('unconfigured and malformed asset bases fall back without constructing a candidate URL',()=>{
  for(const value of [null,undefined,'','/assets/','https://example.com/assets','https://user:password@example.com/assets/','javascript:alert(1)/','https://example.com/assets/?v=1','https://example.com/assets/#hash','https://example.com/a b/','https://example.com/a,b/'])assert.deepEqual(responsiveProductImage(28,urls[0],'stage',value),{});
  assert.ok(responsiveProductImage(28,urls[0],'stage','http://127.0.0.1:5191/.ktk-assets/').srcSet);
});
