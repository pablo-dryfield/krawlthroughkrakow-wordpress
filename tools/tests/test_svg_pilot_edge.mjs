import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {svgPilotEdge} from '../svg-pilot-edge.mjs';

const source = `import importlib.util,json,time
from pathlib import Path
p=Path('tools/svg-pilot-core.py');s=importlib.util.spec_from_file_location('ktk_core',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan,files=m.make_plan('c9'*16,'no-store',int(time.time())-1,'1'*40,'2'*40,{'tools/svg-pilot-core.py':m.sha(p.read_bytes())});print(json.dumps(plan))`;
const plan = JSON.parse(execFileSync('python', ['-c', source], {maxBuffer: 100000}));
const NOW = plan.createdAt + 3, ROOT = '/zones/4303f6a45f815c5570bb4bba5f86a423', EP = ROOT + '/rulesets/phases/http_request_cache_settings/entrypoint';
const clone = value => structuredClone(value);
const approval = () => ({schemaVersion: 1, planId: plan.planId, approvedBy: 'Offline fixture only', approvedAt: plan.createdAt, expiresAt: plan.createdAt + 300, exactTwoPathRule: true, ownNamespaceFiles: true, ownPrefixPurge: true, exclusiveAccountWindow: true, allowEntrypointCreation: true, retainCreatedEmptyEntrypoint: true});
const ciProof = () => ({schemaVersion: 1, planId: plan.planId, sourceCommit: plan.sourceCommit, sourceTree: plan.sourceTree, verifiedAt: NOW, allRequiredJobsPassed: true, auditAndFinalBuildPassed: true, actualCheckoutTreeExact: true});
const foreign = () => ({id: 'd'.repeat(32), version: '1', ref: 'foreign', description: 'Unrelated existing rule', expression: 'http.host eq "other.example"', action: 'set_cache_settings', action_parameters: {cache: false}, enabled: true, last_updated: '2026-11-17T00:00:00Z'});
const initial = () => ({id: 'a'.repeat(32), name: 'Existing cache rules', description: 'Preserve', kind: 'zone', phase: 'http_request_cache_settings', version: '1', last_updated: '2026-11-17T00:00:00Z', rules: [foreign()]});

class API {
  constructor(entrypoint = null) { this.ep = clone(entrypoint); this.calls = []; this.lostAcquire = this.lostRelease = this.limitAcquire = false; this.afterValidation = this.afterMutation = null; }
  mutations() { return this.calls.filter(r => r.method !== 'GET' && r.query?.dry_run !== true); }
  async request(args) {
    this.calls.push(clone(args));
    const {method, path, body, query} = args;
    if (method === 'GET' && path === ROOT) return {success: true, result: {id: ROOT.slice(7), name: 'krawlthroughkrakow.com', status: 'active', account: {id: 'ddfd57890e03c243c120f480d65f15de'}}};
    if (method === 'GET' && path === EP) {
      if (!this.ep) throw Error('HTTP 404 entrypoint absent');
      const result = clone(this.ep);
      if (this.omitEmptyRules && Array.isArray(result.rules) && result.rules.length === 0) delete result.rules;
      return {success: true, result};
    }
    if (method === 'POST' && (path === ROOT + '/rulesets' || path === ROOT + '/rulesets/' + 'a'.repeat(32) + '/rules')) {
      if (query?.dry_run === true) { this.afterValidation?.(); return {success: true, result: null}; }
      if (this.limitAcquire) throw Error('HTTP 429 rate limited');
      if (path === ROOT + '/rulesets') {
        if (this.ep) throw Error('HTTP 409 entrypoint already exists');
        this.ep = {id: 'a'.repeat(32), name: body.name, description: '', kind: body.kind, phase: body.phase, version: '1', rules: []};
      }
      this.ep.rules.push({...clone(path === ROOT + '/rulesets' ? body.rules[0] : body), id: 'b'.repeat(32), version: '1', last_updated: '2026-11-17T00:00:00Z'});
      this.ep.version = String(Number(this.ep.version) + 1); this.afterMutation?.();
      if (this.lostAcquire) throw Error('connection reply lost');
      return {success: true, result: clone(this.ep)};
    }
    if (method === 'DELETE' && path === ROOT + '/rulesets/' + 'a'.repeat(32) + '/rules/' + 'b'.repeat(32)) {
      this.ep.rules = this.ep.rules.filter(r => r.id !== 'b'.repeat(32)); this.ep.version = String(Number(this.ep.version) + 1);
      if (this.lostRelease) throw Error('connection reply lost');
      return undefined;
    }
    if (method === 'POST' && path === ROOT + '/purge_cache') {
      assert.deepEqual(body, {prefixes: ['krawlthroughkrakow.com/staging/ktk-svg-encoding-probe-' + plan.token + '/']});
      return {success: true, result: {id: ROOT.slice(7)}};
    }
    throw Error('Forbidden API operation ' + method + ' ' + path);
  }
}

async function acquire(api, changes = {}) {
  return svgPilotEdge('acquire', {plan, approval: approval(), ciProof: ciProof(), expectedBefore: clone(api.ep), ...changes}, args => api.request(args), () => NOW);
}

test('dry-run validates actual cross-language policy without persisting any rules', async () => {
  for (const before of [null, initial()]) {
    const api = new API(before), reply = await svgPilotEdge('validate', {plan}, r => api.request(r), () => NOW);
    assert.equal(reply.state, 'validated-only'); assert.equal(reply.entrypointUnchanged, true); assert.deepEqual(api.ep, before); assert.equal(api.mutations().length, 0);
    assert.equal(api.calls.filter(r => r.method === 'POST').length, 1); assert.equal(api.calls.find(r => r.method === 'POST').query.dry_run, true);
  }
});

test('creation and cleanup remove only the owned rule, explicitly retaining empty shared metadata', async () => {
  const api = new API(), reply = await acquire(api);
  assert.equal(reply.safeToPublish, true); assert.equal(reply.lease.createdEntrypoint, true); assert.equal(reply.lease.retainedEmptyEntrypointApproved, true);
  const done = await svgPilotEdge('release', {plan, lease: reply.lease}, r => api.request(r), () => NOW + 4000);
  assert.equal(done.ownRuleAbsent, true); assert.equal(done.createdEmptyEntrypointRetained, true); assert.equal(done.accountRestoredToAbsent, false); assert.deepEqual(api.ep.rules, []);
  assert.equal(api.calls.some(r => r.method === 'PUT' || r.method === 'DELETE' && !r.path.includes('/rules/')), false);
});

test('existing rules and metadata remain exact across append and owned-rule removal', async () => {
  const before = initial(), api = new API(before), reply = await acquire(api);
  assert.equal(reply.safeToPublish, true); assert.deepEqual(api.ep.rules[0], before.rules[0]); assert.equal(reply.lease.createdEntrypoint, false);
  const done = await svgPilotEdge('release', {plan, lease: reply.lease}, r => api.request(r), () => NOW);
  assert.equal(done.foreignRulesUnchanged, true); assert.deepEqual(api.ep.rules, before.rules); assert.equal(api.ep.name, before.name);
});

test('actual empty-entrypoint omission supports cleanup, purge and a later owned append', async () => {
  const api = new API(); api.omitEmptyRules = true;
  const reply = await acquire(api);
  const done = await svgPilotEdge('release', {plan, lease: reply.lease}, r => api.request(r), () => NOW);
  assert.equal(done.ownRuleAbsent, true); assert.equal(done.createdEmptyEntrypointRetained, true);
  assert.equal(done.foreignRulesUnchanged, true);
  const inspected = await svgPilotEdge('inspect', {plan}, r => api.request(r), () => NOW);
  assert.deepEqual(inspected.before.rules, []);
  const proof = {...reply.lease, verifiedAt: NOW, state: 'namespace-absence-verified'};
  assert.equal((await svgPilotEdge('purge', {plan, lease: reply.lease, namespaceProof: proof, originalApproval: approval()}, r => api.request(r), () => NOW)).state, 'owned-prefix-purge-accepted-not-cache-proof');
  const next = await acquire(api, {expectedBefore: inspected.before});
  assert.equal(next.safeToPublish, true); assert.equal(next.lease.createdEntrypoint, false);
  assert.equal(api.calls.filter(r => r.method === 'DELETE').length, 1);
});

test('present malformed rules fields still fail closed before any mutation', async () => {
  for (const rules of [null, false, {}, 'omitted']) {
    const api = new API({...initial(), rules});
    await assert.rejects(acquire(api), /Bounded zone cache entrypoint required/);
    assert.equal(api.mutations().length, 0);
  }
});

test('missing approval, failed CI, stale proofs and unapproved creation cannot persist anything', async () => {
  for (const changes of [{approval: null}, {ciProof: {...ciProof(), auditAndFinalBuildPassed: false}}, {ciProof: {...ciProof(), verifiedAt: NOW - 121}}, {approval: {...approval(), allowEntrypointCreation: false, retainCreatedEmptyEntrypoint: false}}]) {
    const api = new API(); await assert.rejects(acquire(api, changes)); assert.equal(api.mutations().length, 0); assert.equal(api.ep, null);
  }
});

test('freshness and authority are checked again after slow server validation', async () => {
  const api = new API(); let now = NOW; api.afterValidation = () => { now = plan.expiresAt; };
  await assert.rejects(svgPilotEdge('acquire', {plan, approval: approval(), ciProof: ciProof(), expectedBefore: null}, r => api.request(r), () => now));
  assert.equal(api.mutations().length, 0); assert.equal(api.ep, null);
});

test('changed pre-operation state and scope injection reject before persistence', async () => {
  const api = new API(initial()); await assert.rejects(acquire(api, {expectedBefore: null})); assert.equal(api.mutations().length, 0);
  for (const bad of [{...plan, token: '../production'}, {...plan, edgeRule: {...plan.edgeRule, expression: 'true'}}, {...plan, edgeRule: {...plan.edgeRule, action_parameters: {cache: true}}}]) {
    const other = new API(); await assert.rejects(svgPilotEdge('acquire', {plan: bad, approval: approval(), ciProof: ciProof(), expectedBefore: null}, r => other.request(r), () => NOW)); assert.equal(other.calls.length, 0);
  }
});

test('lost acquisition reply is reconciled only through exact readback, without retry', async () => {
  const api = new API(); api.lostAcquire = true; const reply = await acquire(api);
  assert.equal(reply.state, 'acquired-after-lost-reply'); assert.equal(reply.safeToPublish, true); assert.equal(api.mutations().length, 1);
});

test('rate limiting stops requests and later reconciliation never performs a write', async () => {
  const api = new API(); api.limitAcquire = true; const reply = await acquire(api);
  assert.equal(reply.state, 'mutation-unknown'); assert.equal(reply.reconcileWithGETOnly, true); assert.equal(api.calls.at(-1).method, 'POST');
  api.limitAcquire = false; const count = api.mutations().length;
  const observed = await svgPilotEdge('reconcile', {plan, intent: {planId: plan.planId, mutationAttempted: true, expectedBefore: null, originalApproval: approval()}}, r => api.request(r), () => NOW);
  assert.equal(observed.state, 'not-observed-not-proof-of-no-mutation'); assert.equal(api.mutations().length, count);
});

test('foreign changes after append disable publication and survive cleanup', async () => {
  const api = new API(initial()); api.afterMutation = () => { api.ep.rules[0].description = 'Owner changed'; };
  const reply = await acquire(api); assert.equal(reply.safeToPublish, false); assert.equal(reply.lease.foreignRulesUnchanged, false);
  const done = await svgPilotEdge('release', {plan, lease: reply.lease}, r => api.request(r), () => NOW);
  assert.equal(done.ownRuleAbsent, true); assert.equal(done.foreignRulesUnchanged, false); assert.equal(api.ep.rules[0].description, 'Owner changed');
});

test('changed owned rule is preserved and no automatic repair or delete occurs', async () => {
  const api = new API(), reply = await acquire(api); api.ep.rules[0].expression = 'true'; const before = api.mutations().length;
  const verify = await svgPilotEdge('verify', {plan, lease: reply.lease}, r => api.request(r), () => NOW);
  assert.equal(verify.safeToPublish, false);
  const done = await svgPilotEdge('release', {plan, lease: reply.lease}, r => api.request(r), () => NOW);
  assert.equal(done.state, 'changed-owned-rule-preserved'); assert.equal(api.mutations().length, before); assert.equal(api.ep.rules[0].expression, 'true');
});

test('fresh verification checks exact rule, sibling state and expiry', async () => {
  const api = new API(initial()), reply = await acquire(api);
  assert.equal((await svgPilotEdge('verify', {plan, lease: reply.lease}, r => api.request(r), () => NOW)).safeToPublish, true);
  assert.equal((await svgPilotEdge('verify', {plan, lease: reply.lease}, r => api.request(r), () => plan.expiresAt)).safeToPublish, false);
  api.ep.rules[0].version = '2'; assert.equal((await svgPilotEdge('verify', {plan, lease: reply.lease}, r => api.request(r), () => NOW)).safeToPublish, false);
});

test('lost delete reply is verified through absence and is not retried', async () => {
  const api = new API(), reply = await acquire(api); api.lostRelease = true;
  const done = await svgPilotEdge('release', {plan, lease: reply.lease}, r => api.request(r), () => NOW);
  assert.equal(done.ownRuleAbsent, true); assert.equal(api.calls.filter(r => r.method === 'DELETE').length, 1);
});

test('purge is limited to one owned nonce prefix and is never treated as cache eviction proof', async () => {
  const api = new API(), reply = await acquire(api);
  const proof = {...reply.lease, verifiedAt: NOW, state: 'namespace-absence-verified'};
  const done = await svgPilotEdge('purge', {plan, lease: reply.lease, namespaceProof: proof, originalApproval: approval()}, r => api.request(r), () => NOW);
  assert.equal(done.state, 'owned-prefix-purge-accepted-not-cache-proof'); assert.equal(done.prefix, 'krawlthroughkrakow.com/staging/ktk-svg-encoding-probe-' + plan.token + '/');
  const before = api.mutations().length;
  await assert.rejects(svgPilotEdge('purge', {plan, lease: reply.lease, namespaceProof: {...proof, verifiedAt: NOW - 121}, originalApproval: approval()}, r => api.request(r), () => NOW));
  assert.equal(api.mutations().length, before);
});

test('the function serializes without imports or captured module state for MCP execution', async () => {
  const standalone = Function('return (' + svgPilotEdge.toString() + ')')();
  const api = new API(); const reply = await standalone('validate', {plan}, r => api.request(r), () => NOW);
  assert.equal(reply.state, 'validated-only'); assert.equal(api.mutations().length, 0);
});
