import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const source=await readFile(new URL('../build-code-pages-all.mjs',import.meta.url),'utf8'),require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url)),{parse}=require('@babel/parser'),ast=parse(source,{sourceType:'module'});
const candidates=ast.program.body.filter(n=>n.type==='TryStatement'&&n.finalizer&&source.slice(n.finalizer.start,n.finalizer.end).includes('docs/code-pages/full-migration/build-report.json'));
assert.equal(candidates.length,1,'One outer build completion guard required');
const guard=candidates[0];

test('full-builder uncaught finalization errors are recorded before its report is written',()=>{
 assert.equal(guard.handler?.param?.name,'error');assert.deepEqual(guard.handler.body.body.map(n=>n.type),['ExpressionStatement','ThrowStatement']);assert.equal(guard.handler.body.body[1].argument.name,'error');assert.match(source.slice(guard.handler.start,guard.handler.end),/report\.errors\.push\(\{ key: 'build-finalization', error: error\.message \}\)/);assert.match(source.slice(guard.finalizer.start,guard.finalizer.end),/report\.errors\.length/);
});
test('actual trusted catch block preserves522, timeout and filesystem failures in evidence and rethrows',()=>{
 const run=new Function('report','work','try { work(); } '+source.slice(guard.handler.start,guard.handler.end));
 for(const message of ['Expected observed redirect: 522','Redirect verification timed out','Could not write final registry']){const report={errors:[]},error=Error(message);assert.throws(()=>run(report,()=>{throw error;}),e=>e===error);assert.deepEqual(report.errors,[{key:'build-finalization',error:message}]);}
});
test('successful completion is not changed and existing page failures remain',()=>{
 const run=new Function('report','work','try { work(); } '+source.slice(guard.handler.start,guard.handler.end)),report={errors:[{key:'article',error:'Existing failure'}]};let calls=0;run(report,()=>calls++);assert.equal(calls,1);assert.deepEqual(report.errors,[{key:'article',error:'Existing failure'}]);
});
