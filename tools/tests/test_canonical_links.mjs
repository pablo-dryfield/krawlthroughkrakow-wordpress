import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalDestination,canonicalLinkPolicy,canonicalAliases,validateLinkPolicy} from '../canonical-links.mjs';

test('known aliases go directly to their existing canonical path without dropping attribution or fragments',()=>{
 assert.equal(canonicalDestination('__KTK_HOME_URL__2017/12/13/the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow/?utm_source=newsletter#clubs'),'__KTK_HOME_URL__krakow-nightclubs/?utm_source=newsletter#clubs');
 assert.equal(canonicalDestination('https://www.krawlthroughkrakow.com/staging/student-trips-and-parties/?gclid=example#group'),'__KTK_HOME_URL__student-trips-poland/?gclid=example#group');
 assert.equal(canonicalDestination('/krakow-pub-crawl/'),'__KTK_HOME_URL__');
 assert.equal(canonicalDestination('/2019/09/05/2681/'),'__KTK_HOME_URL__all-you-need-to-know-about-visiting-auschwitz/');
 for(const target of Object.values(canonicalAliases))assert.ok(!canonicalAliases[target],'No alias chains or cycles');
});

test('foreign origins, private routes and protected legacy store are not rewritten',()=>{
 for(const value of ['#contact','https://example.com/how-to-join/','https://krawlthroughkrakow.com:444/how-to-join/','javascript:alert(1)','/store/Bottomless-Brunch-p661114244','/store2/cart/','/wp-admin/','/unknown/'])assert.equal(canonicalDestination(value),null);
});

test('reviewed broken aliases cannot shadow current routes or silently cross commerce boundaries',()=>{
 const known=['/student-trips-poland/','/all-you-need-to-know-about-visiting-auschwitz/'];
 assert.equal(validateLinkPolicy(canonicalLinkPolicy,known,[]),true);
 for(const update of [{from:'/store/old/'},{from:'/student-trips-poland/'},{target:'https://example.com/'},{sourceStatus:200},{status:302},{reason:''}]){
  const broken=structuredClone(canonicalLinkPolicy);Object.assign(broken.redirects[0],update);
  assert.throws(()=>validateLinkPolicy(broken,known,[]));
 }
});
