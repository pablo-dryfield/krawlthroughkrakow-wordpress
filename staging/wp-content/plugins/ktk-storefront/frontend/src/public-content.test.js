import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getProductContent } from './product-content.js';
import { completePublicContentHandoff, followPublicLink, publicStorefrontHref } from './public-content.js';

test('native product hrefs are clean, environment-aware and contain no test attribution', () => {
  assert.equal(publicStorefrontHref('/staging/store2/', 'pub-crawl-28'), '/staging/store2/pub-crawl-28/');
  assert.equal(publicStorefrontHref('https://krawlthroughkrakow.com/store2', ''), 'https://krawlthroughkrakow.com/store2/');
  assert.equal(publicStorefrontHref('/', 'pub-crawl-28'), '/pub-crawl-28/');
});

test('only ordinary primary activation uses SPA navigation', () => {
  for (const override of [{}, {ctrlKey:true}, {metaKey:true}, {shiftKey:true}, {altKey:true}, {button:1}, {defaultPrevented:true}]) {
    let prevented=0, navigated=0;
    followPublicLink({button:0,preventDefault(){prevented++;},...override},()=>navigated++,'pub-crawl-28');
    assert.equal(navigated,Object.keys(override).length ? 0 : 1);
    assert.equal(prevented,navigated);
  }
});

test('handoff reveals the ready app and removes the public copy exactly once', () => {
  const root={hidden:true}; let removed=0;
  const doc={getElementById(id){return id==='ktk-storefront-root'?root:removed?null:{remove(){removed++;}};}};
  completePublicContentHandoff(doc); completePublicContentHandoff(doc);
  assert.equal(root.hidden,false); assert.equal(removed,1);
  assert.doesNotThrow(()=>completePublicContentHandoff({getElementById(){return null;}}));
});

test('PHP and client resolve the same public fields, including mapped fallback and precedence', () => {
  const products=[
    {slug:'empty',config:[]},
    {slug:'bubble-football-43',config:[]},
    {slug:'bubble-football-43',summary:'Root summary',images:[{url:'https://example.com/a.jpg'},'https://example.com/b.jpg'],imageUrl:'https://example.com/a.jpg',config:{content:{summary:'Configured summary',description:'Actual description',highlights:['First','Second'],importantInformation:['ID','ID',''],meetingPoint:{name:' TBA ',instructions:' Await confirmation '}}}},
    {slug:'custom',productType:{name:'Activities'},summary:'Root summary',description:'Root description',highlights:['Root inclusion'],config:{content:{summary:'',description:'',highlights:[]}}},
  ];
  const fixture=fileURLToPath(new URL('../../../../../../tools/tests/storefront-public-fixture.php',import.meta.url));
  const php=JSON.parse(execFileSync('php',[fixture],{input:JSON.stringify({action:'resolve',products}),encoding:'utf8'}));
  assert.deepEqual(php,products.map(getProductContent));
});
