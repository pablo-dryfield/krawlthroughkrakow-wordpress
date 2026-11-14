import { createRequire } from 'node:module';

const require = createRequire(new URL('../staging/wp-content/plugins/ktk-storefront/frontend/package.json', import.meta.url));
const { parse } = require('@babel/parser');

export function visitJavaScript(node, callback, ancestors = []) {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return;
  callback(node, ancestors);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) visitJavaScript(child, callback, [...ancestors, node]);
    } else if (value && typeof value === 'object') {
      visitJavaScript(value, callback, [...ancestors, node]);
    }
  }
}

export function parseJavaScript(source) {
  return parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] });
}

// Parse the public definition as data. Never execute a downloaded GTM script.
export function extractPublishedContainer(source) {
  const candidates = [];
  visitJavaScript(parseJavaScript(source), node => {
    if (node.type !== 'VariableDeclarator' || node.id?.name !== 'data'
        || node.init?.type !== 'ObjectExpression') return;
    const resources = node.init.properties.filter(property => property.type === 'ObjectProperty'
      && !property.computed && (property.key.name || property.key.value) === 'resource');
    if (resources.length > 1) throw new Error('Duplicate public container resource');
    if (resources.length === 1) {
      candidates.push(node.init);
    }
  });
  if (candidates.length !== 1) throw new Error('One unambiguous public container resource is required');
  const node = candidates[0];
  const resource = JSON.parse(source.slice(node.start, node.end)).resource;
  if (!resource || typeof resource.version !== 'string') throw new Error('Container version is missing');
  for (const key of ['macros', 'tags', 'predicates', 'rules']) {
    if (!Array.isArray(resource[key]) || resource[key].length > 10000) {
      throw new Error(`Unexpected container ${key}`);
    }
  }
  return resource;
}

function indexed(items, index) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= items.length) {
    throw new Error('Container reference is out of bounds');
  }
  return items[index];
}

function describeValue(value, resource) {
  if (Array.isArray(value) && value.length === 2 && value[0] === 'macro') {
    const macro = indexed(resource.macros, value[1]);
    if (macro.function === '__v' && typeof macro.vtp_name === 'string') {
      return { kind: 'dataLayer', name: macro.vtp_name };
    }
    if (macro.function === '__e') return { kind: 'event' };
    return { kind: 'unresolved', function: macro.function };
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return { kind: 'literal', value };
  }
  return { kind: 'unresolved' };
}

export function summarizePublishedContainer(resource) {
  const triggers = resource.tags.map(() => []);
  for (const rule of resource.rules) {
    if (!Array.isArray(rule) || !rule.length) throw new Error('Unexpected container rule');
    const conditions = [];
    const add = [];
    const block = [];
    for (const clause of rule) {
      if (!Array.isArray(clause) || clause.length < 2
          || !['if', 'unless', 'add', 'block'].includes(clause[0])) {
        throw new Error('Unreviewed container rule operation');
      }
      for (const index of clause.slice(1)) {
        if (clause[0] === 'add' || clause[0] === 'block') {
          indexed(resource.tags, index);
          (clause[0] === 'add' ? add : block).push(index);
        } else {
          const predicate = indexed(resource.predicates, index);
          conditions.push({ operation: clause[0], function: predicate.function,
            left: describeValue(predicate.arg0, resource),
            right: describeValue(predicate.arg1, resource) });
        }
      }
    }
    for (const index of add) triggers[index].push({ conditions, blockedTagIndexes: block });
  }
  const tags = resource.tags.map((tag, index) => {
    const parameters = {};
    for (const key of ['vtp_tagId', 'vtp_conversionId', 'vtp_conversionLabel',
      'vtp_orderId', 'vtp_conversionValue', 'vtp_currencyCode']) {
      if (Object.hasOwn(tag, key)) parameters[key] = describeValue(tag[key], resource);
    }
    return { index, tagId: tag.tag_id, function: tag.function,
      parameters, triggers: triggers[index] };
  });
  return { version: resource.version, tags,
    limitation: 'Public definitions are not provider receipt, linked-destination settings or consent verification.' };
}

export function inspectStorefrontEvents(source) {
  const events = new Set();
  const conversions = [];
  const paidConditions = [];
  visitJavaScript(parseJavaScript(source), (node, ancestors) => {
    if (node.type === 'VariableDeclarator' && node.id?.name === 'paid'
        && node.init?.type === 'LogicalExpression') {
      paidConditions.push(source.slice(node.init.start, node.init.end));
    }
    if (node.type !== 'CallExpression') return;
    if (node.callee?.name === 'trackJourney') {
      const add = argument => {
        if (argument?.type === 'StringLiteral') events.add(argument.value);
        if (argument?.type === 'ConditionalExpression') {
          add(argument.consequent);
          add(argument.alternate);
        }
      };
      add(node.arguments[0]);
    }
    if (node.callee?.name === 'reportGoogleAdsOrderComplete') {
      const parent = [...ancestors].reverse().find(ancestor => ancestor.type === 'IfStatement');
      conversions.push({ line: node.loc.start.line,
        argument: source.slice(node.arguments[0].start, node.arguments[0].end),
        enclosingCondition: parent ? source.slice(parent.test.start, parent.test.end) : null,
        branch: !parent ? null : ancestors.includes(parent.consequent) ? 'consequent' : 'alternate' });
    }
  });
  return { journeyEvents: [...events].sort(), conversionCalls: conversions, paidConditions };
}
