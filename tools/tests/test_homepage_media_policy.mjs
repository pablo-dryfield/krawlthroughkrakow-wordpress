import test from 'node:test';
import assert from 'node:assert/strict';
import {applyHomepageMediaPolicy} from '../homepage-media-policy.mjs';
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
