import test from 'node:test';
import assert from 'node:assert/strict';
import {applyHomepageMediaPolicy,applyHomepageIconSizing} from '../homepage-media-policy.mjs';
test('only loading priority changes; originals, alt labels and full-size destinations stay intact',()=>{
  const image=(id,attributes)=>({id,attributes:{...attributes},getAttribute(key){return this.attributes[key]??null;},setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];}});
  const logo=image('logo',{src:'logo.webp',alt:'Krawl Through Krakow',width:'101'});
  const photo=image('',{src:'photo.webp',srcset:'small.webp 320w, photo.webp 2000w',alt:'Pub crawl group',fetchpriority:'high',width:'2000',height:'2000'});
  const before={...photo.attributes};
  const original=globalThis.document;
  try{
    globalThis.document={querySelectorAll:()=>[logo,photo]};
    const result=applyHomepageMediaPolicy();
    assert.equal(result.length,1);assert.equal(logo.attributes.loading,undefined);assert.equal(photo.attributes.loading,'lazy');assert.equal(photo.attributes.fetchpriority,undefined);
    for(const [key,value] of Object.entries(before))if(key!=='fetchpriority')assert.equal(photo.attributes[key],value);
  }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

const names=['i6agsskidpgwcluwywc6','jgqte2id3waqv2vs8edd','ciaiu30657qcru0sdnnb','ppygtlcm5nb6j4lsr251','ccz58hmwdrzaaktxvokp','ygkzrcl8zu8ybudwpmys'];
const oldSizes='(min-width: 0px) and (max-width: 480px) 480px, (min-width: 481px) and (max-width: 980px) 980px, (min-width: 981px) and (max-width: 1280px) 1280px, (min-width: 1281px) 2000px, 100vw';
function icons(){return names.map(name=>{
 const base='https://krawlthroughkrakow.com/wp-content/uploads/2025/04/'+name+'_compressed_compressed';
 return {attributes:{src:base+'.webp',srcset:[base+'.webp 2000w',...[1280,980,480].map(w=>base+'-'+w+'x'+w+'.webp '+w+'w')].join(', '),sizes:oldSizes,width:'2000',height:'2000',loading:'lazy',alt:'Original description'},getAttribute(k){return this.attributes[k]??null;},setAttribute(k,v){this.attributes[k]=v;},closest(){return null;}};
});}
function withImages(images,fn){const original=globalThis.document;try{globalThis.document={querySelectorAll:()=>images};return fn();}finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}}
test('six source-bound icons change sizes only and remain idempotent',()=>{
 const images=icons(),other={...icons()[0],attributes:{src:'unrelated.webp',sizes:'100vw'}};images.push(other);
 const before=structuredClone(images.map(i=>i.attributes));
 withImages(images,()=>{assert.equal(applyHomepageIconSizing().length,6);assert.equal(applyHomepageIconSizing().length,6);});
 images.forEach((image,index)=>assert.deepEqual(image.attributes,index<6?{...before[index],sizes:'(max-width: 980px) 40vw, 12vw'}:before[index]));
});
for(const [name,mutate] of [
 ['missing',images=>images.pop()],['duplicate',images=>images.push(images[0])],
 ['foreign source',images=>{images[5].attributes.src=images[5].attributes.src.replace('krawlthroughkrakow.com','example.com');}],
 ['changed candidate',images=>{images[5].attributes.srcset+='x';}],
 ['changed dimensions',images=>{images[5].attributes.width='1000';}],
 ['eager',images=>{images[5].attributes.loading='eager';}],
 ['gallery',images=>{images[5].closest=()=>({});}],
 ['unexpected sizes',images=>{images[5].attributes.sizes='100vw';}],
 ])test('icon sizing atomically rejects '+name,()=>{
 const images=icons();mutate(images);const before=structuredClone(images.map(i=>i.attributes));
 withImages(images,()=>assert.throws(applyHomepageIconSizing));
 assert.deepEqual(images.map(i=>i.attributes),before);
});
