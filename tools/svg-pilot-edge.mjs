// Self-contained so the reviewed function can run through the authenticated MCP
// transport without exporting a Cloudflare token. No operation runs on import.
export async function svgPilotEdge(action, input, request, clock = () => Math.floor(Date.now() / 1000)) {
  const ROOT = '/zones/4303f6a45f815c5570bb4bba5f86a423';
  const ACCOUNT = 'ddfd57890e03c243c120f480d65f15de';
  const PHASE = 'http_request_cache_settings';
  const EP = ROOT + '/rulesets/phases/' + PHASE + '/entrypoint';
  const log = [];
  const fail = message => { throw new Error(message); };
  let now = clock();
  const canon = value => {
    if (Array.isArray(value)) return '[' + value.map(canon).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canon(value[k])).join(',') + '}';
    const text = JSON.stringify(value);
    if (text === undefined) fail('Only JSON data is allowed');
    return text;
  };
  const same = (a, b) => canon(a) === canon(b);
  const hex = (v, n) => typeof v === 'string' && new RegExp('^[a-f0-9]{' + n + '}$').test(v);
  const integer = Number.isSafeInteger;
  if (!['inspect', 'validate', 'acquire', 'verify', 'reconcile', 'release', 'purge'].includes(action) || typeof request !== 'function' || !integer(now)) fail('Closed edge action and clock required');
  const plan = input?.plan;
  if (!plan || plan.schemaVersion !== 1 || plan.scope !== 'ktk-isolated-svg-pilot' || !hex(plan.token, 32) || !hex(plan.planId, 64) || !hex(plan.sourceCommit, 40) || !hex(plan.sourceTree, 40) || !['no-store', 'public'].includes(plan.mode) || !integer(plan.createdAt) || !integer(plan.expiresAt) || plan.expiresAt !== plan.createdAt + 3600 || plan.createdAt > now) fail('Exact bound pilot plan required');
  const prefix = '/staging/ktk-svg-encoding-probe-' + plan.token + '/';
  const policy = {
    description: 'KTK isolated SVG probe ' + plan.token,
    enabled: true,
    expression: '(http.host eq "krawlthroughkrakow.com" and http.request.method in {"GET" "HEAD"} and http.request.uri.path in {"' + prefix + 'regular.svg" "' + prefix + 'seasonal.svg"})',
    action: 'set_cache_settings',
    action_parameters: { cache: true, respect_strong_etags: true, browser_ttl: {mode: 'respect_origin'}, edge_ttl: {mode: 'respect_origin'}, vary: { default: { action: 'bypass' }, headers: { 'accept-encoding': { action: 'passthrough' } } } },
    ref: 'ktk_svg_pilot_' + plan.token,
  };
  if (!same(plan.edgeRule, policy)) fail('Policy may match only the two exact nonce aliases');
  const binding = { schemaVersion: 1, planId: plan.planId, token: plan.token, mode: plan.mode, sourceCommit: plan.sourceCommit, sourceTree: plan.sourceTree };
  const bound = value => value && Object.entries(binding).every(([k, v]) => value[k] === v);
  const fresh = () => { now = clock(); if (!integer(now) || now < plan.createdAt || now >= plan.expiresAt) fail('Expired/future plan cannot acquire resources'); };
  const approval = input.approval;
  const approve = () => {
    if (!approval || approval.schemaVersion !== 1 || approval.planId !== plan.planId || typeof approval.approvedBy !== 'string' || !approval.approvedBy.trim() || !integer(approval.approvedAt) || !integer(approval.expiresAt) || !(plan.createdAt <= approval.approvedAt && approval.approvedAt <= now && now < approval.expiresAt && approval.expiresAt <= plan.expiresAt)) fail('Current explicit approval record required');
    for (const k of ['exactTwoPathRule', 'ownNamespaceFiles', 'ownPrefixPurge', 'exclusiveAccountWindow']) if (approval[k] !== true) fail('Approval does not cover this operation');
    if (typeof approval.allowEntrypointCreation !== 'boolean' || typeof approval.retainCreatedEmptyEntrypoint !== 'boolean' || approval.allowEntrypointCreation !== approval.retainCreatedEmptyEntrypoint) fail('Creation and deliberate empty-entrypoint retention must be approved together');
  };
  const proveCI = () => {
    const p = input.ciProof;
    if (!p || p.schemaVersion !== 1 || p.planId !== plan.planId || p.sourceCommit !== plan.sourceCommit || p.sourceTree !== plan.sourceTree || p.allRequiredJobsPassed !== true || p.auditAndFinalBuildPassed !== true || p.actualCheckoutTreeExact !== true || !integer(p.verifiedAt) || now - p.verifiedAt < 0 || now - p.verifiedAt > 120) fail('Fresh independently verified complete CI receipt required');
  };
  const call = async (method, path, body, dryRun = false) => {
    const legal = (method === 'GET' && [ROOT, EP].includes(path)) || (method === 'POST' && path === ROOT + '/rulesets') || (method === 'POST' && new RegExp('^' + ROOT + '/rulesets/[a-f0-9]{32}/rules$').test(path)) || (method === 'DELETE' && new RegExp('^' + ROOT + '/rulesets/[a-f0-9]{32}/rules/[a-f0-9]{32}$').test(path)) || (method === 'POST' && path === ROOT + '/purge_cache');
    if (!legal) fail('Operation outside the closed namespace rule lifecycle');
    const args = { method, path };
    if (body !== undefined) args.body = body;
    if (dryRun) args.query = { dry_run: true };
    log.push({ method, path, dryRun, body });
    return await request(args);
  };
  const zone = await call('GET', ROOT);
  if (zone.success !== true || zone.result?.id !== ROOT.slice(7) || zone.result.name !== 'krawlthroughkrakow.com' || zone.result.account?.id !== ACCOUNT || zone.result.status !== 'active') fail('Exact active KTK zone/account required');
  const entry = async () => {
    let response;
    try { response = await call('GET', EP); }
    catch (error) { if (/\b404\b/.test(error.message)) return null; throw error; }
    // Actual Cloudflare empty entrypoint responses can omit the rules field.
    // Only omission means an empty list; null or any other malformed value fails.
    const raw = response.result;
    const e = raw && !Object.hasOwn(raw, 'rules') ? {...raw, rules: []} : raw;
    if (response.success !== true || !e || !hex(e.id, 32) || e.kind !== 'zone' || e.phase !== PHASE || !Array.isArray(e.rules) || typeof e.version !== 'string' || !/^[0-9]+$/.test(e.version)) fail('Bounded zone cache entrypoint required');
    if (e.rules.length > 100) fail('Unreviewed entrypoint size');
    return e;
  };
  const meta = e => Object.fromEntries(Object.entries(e).filter(([k]) => !['rules', 'version', 'last_updated'].includes(k)));
  const matches = rule => rule && Object.keys(policy).every(k => same(rule[k], policy[k]));
  const owned = e => e?.rules.filter(r => r.ref === policy.ref) ?? [];
  const leaseFor = (before, after, state, retentionApproved = false) => {
    const rules = owned(after);
    if (!after || rules.length !== 1 || !matches(rules[0]) || !hex(rules[0].id, 32) || typeof rules[0].version !== 'string') return null;
    const foreign = after.rules.filter(r => r.id !== rules[0].id);
    return { ...binding, state, acquiredAt: now, entrypointId: after.id, createdEntrypoint: before === null, retainedEmptyEntrypointApproved: before === null && retentionApproved, ownedRule: rules[0], before, foreignRulesUnchanged: same(before?.rules ?? [], foreign), entrypointMetadataUnchanged: before === null || same(meta(before), meta(after)) };
  };
  const before = await entry();
  if (action === 'inspect') return { ...binding, state: 'inspected', before, log };
  if (action === 'validate') {
    fresh();
    if (owned(before).length) fail('Nonce reference already exists');
    const path = before ? ROOT + '/rulesets/' + before.id + '/rules' : ROOT + '/rulesets';
    const body = before ? policy : { name: 'KTK isolated SVG cache entrypoint', kind: 'zone', phase: PHASE, rules: [policy] };
    const validation = await call('POST', path, body, true);
    if (validation.success !== true || validation.result !== null) fail('Expected non-persisting validation result');
    const after = await entry();
    return { ...binding, state: 'validated-only', validation, entrypointUnchanged: same(before, after), log };
  }
  if (action === 'acquire') {
    fresh(); approve(); proveCI();
    if (!Object.hasOwn(input, 'expectedBefore') || !same(input.expectedBefore, before)) fail('Fresh entrypoint differs from the saved pre-operation intent');
    if (owned(before).length) fail('Existing nonce rule must never be adopted');
    if (before === null && !approval.allowEntrypointCreation) fail('Creating and retaining an empty shared entrypoint needs explicit approval');
    const path = before ? ROOT + '/rulesets/' + before.id + '/rules' : ROOT + '/rulesets';
    const body = before ? policy : { name: 'KTK isolated SVG cache entrypoint', kind: 'zone', phase: PHASE, rules: [policy] };
    const validation = await call('POST', path, body, true);
    if (validation.success !== true || validation.result !== null) fail('Server validation not accepted');
    // Validation may take time. Recheck all time-bound authority immediately
    // before the first persistent operation; never rely on entry-time checks.
    fresh(); approve(); proveCI();
    let mutationError = null;
    try {
      const mutation = await call('POST', path, body);
      if (mutation?.success !== true) throw new Error('Persistent operation returned an unsuccessful envelope');
    }
    catch (error) {
      mutationError = error.message;
      if (/\b(?:401|403|429)\b/.test(error.message)) return { ...binding, state: 'mutation-unknown', expectedBefore: before, mutationError, reconcileWithGETOnly: true, log };
    }
    let after;
    try { after = await entry(); }
    catch (error) { return { ...binding, state: 'mutation-unknown', expectedBefore: before, mutationError, readbackError: error.message, reconcileWithGETOnly: true, log }; }
    const lease = leaseFor(before, after, mutationError ? 'acquired-after-lost-reply' : 'acquired', approval.retainCreatedEmptyEntrypoint);
    return { ...binding, state: lease ? lease.state : 'mutation-unknown', safeToPublish: !!lease && lease.foreignRulesUnchanged && lease.entrypointMetadataUnchanged, verifiedAt: now, lease, expectedBefore: before, mutationError, log };
  }
  if (action === 'reconcile') {
    if (input.intent?.mutationAttempted !== true || input.intent.planId !== plan.planId || !Object.hasOwn(input.intent, 'expectedBefore')) fail('Saved attempted-operation intent required; never adopt a namespace by discovery');
    const original = input.intent.originalApproval;
    const retained = original?.planId === plan.planId && original.allowEntrypointCreation === true && original.retainCreatedEmptyEntrypoint === true;
    const lease = leaseFor(input.intent.expectedBefore, before, 'acquired-reconciled', retained);
    return { ...binding, state: lease ? 'observed-for-reconciliation' : 'not-observed-not-proof-of-no-mutation', safeToPublish: false, verifiedAt: now, lease, log };
  }
  const lease = input.lease;
  if (!bound(lease) || !hex(lease.entrypointId, 32) || !hex(lease.ownedRule?.id, 32) || !matches(lease.ownedRule)) fail('Bound prior ownership receipt required for cleanup');
  if (action === 'verify') {
    const current = before?.rules.find(r => r.id === lease.ownedRule.id);
    const exact = !!before && before.id === lease.entrypointId && same(current ?? null, lease.ownedRule);
    const foreignExact = exact && same(before.rules.filter(r => r.id !== lease.ownedRule.id), lease.before?.rules ?? []);
    const metadataExact = exact && (lease.before === null || same(meta(before), meta(lease.before)));
    return { ...binding, state: exact && foreignExact && metadataExact ? 'edge-lease-verified' : 'edge-lease-changed', safeToPublish: exact && foreignExact && metadataExact && now < plan.expiresAt, verifiedAt: now, log };
  }
  if (action === 'release') {
    if (!before || before.id !== lease.entrypointId) return { ...binding, state: 'entrypoint-changed', ownRuleAbsenceUnproven: true, log };
    const current = before.rules.find(r => r.id === lease.ownedRule.id);
    if (current && !same(current, lease.ownedRule)) return { ...binding, state: 'changed-owned-rule-preserved', ownRuleAbsent: false, log };
    let mutationError = null;
    if (current) {
      try { await call('DELETE', ROOT + '/rulesets/' + before.id + '/rules/' + current.id); }
      catch (error) {
        mutationError = error.message;
        if (/\b(?:401|403|429)\b/.test(error.message)) return { ...binding, state: 'release-unknown', mutationError, reconcileWithGETOnly: true, log };
      }
    }
    let after;
    try { after = await entry(); }
    catch (error) { return { ...binding, state: 'release-unknown', mutationError, readbackError: error.message, log }; }
    const absent = after?.id === lease.entrypointId && !after.rules.some(r => r.id === lease.ownedRule.id || r.ref === policy.ref);
    return { ...binding, state: absent ? 'own-rule-absence-verified' : 'release-unknown', ownRuleAbsent: absent, foreignRulesUnchanged: absent && same(after.rules, lease.before?.rules ?? []), createdEmptyEntrypointRetained: absent && lease.createdEntrypoint && after.rules.length === 0, accountRestoredToAbsent: false, mutationError, log };
  }
  if (action === 'purge') {
    const proof = input.namespaceProof;
    now = clock();
    if (!bound(proof) || !integer(proof.verifiedAt) || now - proof.verifiedAt < 0 || now - proof.verifiedAt > 120 || !['all-ten-payloads-verified', 'namespace-absence-verified'].includes(proof.state)) fail('Fresh known-payload or namespace-absence proof required');
    if (input.originalApproval?.planId !== plan.planId || input.originalApproval.ownPrefixPurge !== true) fail('Prior scoped purge approval required');
    const response = await call('POST', ROOT + '/purge_cache', { prefixes: ['krawlthroughkrakow.com' + prefix] });
    if (response.success !== true) fail('Purge API did not accept the exact owned prefix');
    return { ...binding, state: 'owned-prefix-purge-accepted-not-cache-proof', prefix: 'krawlthroughkrakow.com' + prefix, response, log };
  }
}
