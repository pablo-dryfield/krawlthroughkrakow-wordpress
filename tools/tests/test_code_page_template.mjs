import test from 'node:test';
import assert from 'node:assert/strict';
import {composeCodePage} from '../code-page-template.mjs';
test('content slots retain literal captured dollar signs and replacement patterns',()=>{
  const content='<p>$ – $$$$, $& $` $\'</p>';
  assert.equal(composeCodePage('<main>__KTK_PAGE_MAIN_CONTENT__</main>',content),'<main>'+content+'</main>');
});
test('missing or ambiguous content slots are rejected',()=>{
  assert.throws(()=>composeCodePage('<main></main>','text'));
  assert.throws(()=>composeCodePage('__KTK_PAGE_MAIN_CONTENT____KTK_PAGE_MAIN_CONTENT__','text'));
});
