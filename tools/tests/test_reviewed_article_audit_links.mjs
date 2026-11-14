import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedArticleAuditLink as project} from '../reviewed-article-audit-links.mjs';

const base='https://krawlthroughkrakow.com/staging/blog/';
const encode=(address,key)=>key.toString(16).padStart(2,'0')+[...new TextEncoder().encode(address)].map(v=>(v^key).toString(16).padStart(2,'0')).join('');
const protectedLink=(address,key)=>{const encoded=encode(address,key);return{href:'/cdn-cgi/l/email-protection#'+encoded,text:'[email protected]',encoded};};

test('only equivalent relative and resolved URLs share an identity',()=>{
 assert.deepEqual(project({href:'#section',text:' The  section '},base),project({href:base+'#section',text:'The section'},base));
 assert.notDeepEqual(project({href:'#section',text:'Title'},base),project({href:'#other',text:'Title'},base));
 assert.notDeepEqual(project({href:'#section',text:'Title'},base),project({href:'#section',text:'Changed'},base));
});
test('exact encoded email address survives independently salted Cloudflare markup',()=>{
 const expected=project({href:'mailto: team@example.test',text:'team@example.test'},base);
 for(const key of [0,1,127,170,255]){assert.deepEqual(project(protectedLink('team@example.test',key),base),expected);assert.deepEqual(project({...protectedLink('team@example.test',key),encoded:encode('team@example.test',255-key)},base),expected);assert.deepEqual(project({href:'/cdn-cgi/l/email-protection#'+encode(' team@example.test',key),text:'[email protected]',encoded:encode('team@example.test',255-key)},base),expected);}
 assert.notDeepEqual(project(protectedLink('changed@example.test',170),base),expected);
});
test('malformed encoding, changed visible text and mismatched encoded nodes fail',()=>{
 for(const change of [n=>n.href='/cdn-cgi/l/email-protection#abc',n=>n.href='/cdn-cgi/l/email-protection#zz00',n=>n.encoded='00',n=>n.encoded=encode('changed@example.test',10),n=>delete n.encoded,n=>n.text='Changed text',n=>n.href=n.href.replace('#','?changed=1#')]){const n=protectedLink('team@example.test',170);change(n);assert.throws(()=>project(n,base));}
 for(const address of ['not-an-address','team@exam ple.test','<team@example.test>','team@example.test\n'])assert.throws(()=>project(protectedLink(address,1),base));
});
test('different origins, paths and ordinary query parameters cannot be masked',()=>{
 const n=protectedLink('team@example.test',170),expected=project(n,base);
 assert.notDeepEqual(project({...n,href:'https://other.example'+n.href},base),expected);
 assert.notDeepEqual(project({...n,href:n.href.replace('/cdn-cgi/l/','/other/')},base),expected);
 assert.notDeepEqual(project({href:'/staging/contact/?a=1',text:'Contact'},base),project({href:'/staging/contact/?a=2',text:'Contact'},base));
});
