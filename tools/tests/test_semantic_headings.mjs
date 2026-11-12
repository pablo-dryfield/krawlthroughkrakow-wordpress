import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveHeadingSelector,preserveHeadingCss} from '../semantic-headings.mjs';

test('selector parser changes only real heading type selectors',()=>{
 const selector='.h1 [data-title="h2"] > H1:not(.h3),h4:hover';
 const result=preserveHeadingSelector(selector);
 assert.ok(result.includes('.h1 [data-title="h2"]'));
 assert.ok(result.includes('[data-ktk-heading-origin="h1"]'));
 assert.ok(result.includes('[data-ktk-heading-origin="h4"]'));
 assert.ok(!result.includes('[data-ktk-heading-origin="h2"]'));
 assert.equal(preserveHeadingSelector(result),result);
});

test('declarations, fonts, assets and media conditions remain unchanged',()=>{
 const css='/* h1 */ @font-face {font-family:Heading;src:url("h1.woff2")} @media (max-width:600px){h1,.module h2{font-size:24px;color:#fff!important}} .h1{content:"h2"}';
 const result=preserveHeadingCss(css);
 for(const value of ['/* h1 */','@font-face {font-family:Heading;src:url("h1.woff2")}','@media (max-width:600px)','font-size:24px;color:#fff!important','.h1{content:"h2"}'])assert.ok(result.includes(value));
 assert.equal(preserveHeadingCss(result),result);
});
