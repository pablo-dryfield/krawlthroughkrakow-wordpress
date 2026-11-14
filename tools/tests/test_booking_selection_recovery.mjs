import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
const {parse} = require('@babel/parser');
const source = readFileSync(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/src/ProductConfigurator.jsx', import.meta.url), 'utf8');
const tree = parse(source, {sourceType: 'module', plugins: ['jsx']});
const nodes = [];
function walk(n) { if (!n || typeof n !== 'object') return; if (typeof n.type === 'string') nodes.push(n); for (const [key, value] of Object.entries(n)) if (!['loc', 'start', 'end'].includes(key)) { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value); } }
walk(tree);
const unique = items => { assert.equal(items.length, 1); return items[0]; };
const variable = name => unique(nodes.filter(n => n.type === 'VariableDeclarator' && n.id?.name === name)).init;
const functionNode = name => unique(nodes.filter(n => n.type === 'FunctionDeclaration' && n.id?.name === name));
const code = n => source.slice(n.start, n.end);
const numeric = vm.runInNewContext('(' + code(functionNode('numeric')) + ')');
function validate(config, quantity, extra = {}) {
  const sandbox = {config, numeric, totalParticipants: quantity, dateMode: 'flexible', fixedDate: '', resolvedExperienceDate: '2030-12-14', time: '21:00', selectedAvailability: {available: true}, product: {addons: []}, ...extra};
  sandbox.minimumParticipants = vm.runInNewContext(code(variable('minimumParticipants')), sandbox);
  return vm.runInNewContext('(' + code(variable('validate')) + ')', sandbox)();
}

test('real validator rejects zero despite a configured zero minimum', () => {
  const r = validate({minParticipants: 0, maxParticipants: 300, dateRequired: true, timeMode: 'fixed'}, 0);
  assert.equal(r.field, 'participants'); assert.equal(r.message, 'Choose at least 1 participant(s).');
});
test('real validator respects higher minima and the original maximum', () => {
  assert.equal(validate({minParticipants: 5, maxParticipants: 20}, 4).message, 'Choose at least 5 participant(s).');
  assert.equal(validate({minParticipants: 1, maxParticipants: 20}, 21).message, 'This booking supports up to 20 participants.');
});
test('valid participant selections and existing date/time guards remain intact', () => {
  assert.equal(validate({minParticipants: 0, maxParticipants: 300, timeMode: 'fixed'}, 1), null);
  assert.equal(validate({minParticipants: 1, maxParticipants: 300, dateRequired: true}, 2, {resolvedExperienceDate: ''}).message, 'Choose an activity date.');
  assert.equal(validate({minParticipants: 1, maxParticipants: 300, timeMode: 'select'}, 2, {time: ''}).message, 'Choose an activity time.');
});
const picker = functionNode('DatePicker');
const effect = unique(nodes.filter(n => n.type === 'CallExpression' && n.callee?.name === 'useEffect' && n.start > picker.start && n.end < picker.end));
function mountedEffect() {
  const listeners = new Map(), closes = [], focus = [], sandbox = {open: true, setOpen: value => closes.push(value), rootRef: {current: {contains: target => target === 'inside'}}, triggerRef: {current: {focus: () => focus.push(true)}}, document: {addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name, fn) => { assert.equal(listeners.get(name), fn); listeners.delete(name); }}};
  const cleanup = vm.runInNewContext('(' + code(effect.arguments[0]) + ')', sandbox)();
  return {listeners, closes, focus, cleanup};
}
test('real date-picker Escape handler closes and restores focus', () => {
  const h = mountedEffect(); h.listeners.get('keydown')({key: 'Escape'});
  assert.deepEqual(h.closes, [false]); assert.equal(h.focus.length, 1); h.cleanup(); assert.equal(h.listeners.size, 0);
});
test('real outside-pointer handler closes without stealing focus', () => {
  const h = mountedEffect(); h.listeners.get('pointerdown')({target: 'inside'}); assert.equal(h.closes.length, 0);
  h.listeners.get('pointerdown')({target: 'outside'}); assert.deepEqual(h.closes, [false]); assert.equal(h.focus.length, 0); h.cleanup();
});
const selection = unique(nodes.filter(n => n.type === 'JSXAttribute' && n.name?.name === 'onClick' && n.start > picker.start && n.end < picker.end && code(n).includes('onUnavailableDate(availability)'))).value.expression;
for (const unavailable of [false, true]) test('real date selection restores focus; unavailable=' + unavailable, () => {
  const actions = [], sandbox = {unavailable, availability: {available: !unavailable}, key: '2030-12-14', onUnavailableDate: () => actions.push('unavailable'), onChange: key => actions.push(key), setOpen: open => actions.push(open), triggerRef: {current: {focus: () => actions.push('focus')}}};
  vm.runInNewContext('(' + code(selection) + ')', sandbox)(); assert.deepEqual(actions, [unavailable ? 'unavailable' : '2030-12-14', false, 'focus']);
});
test('date redirect/unmount safely tolerates a removed trigger', () => {
  const sandbox = {unavailable: true, availability: {}, onUnavailableDate: () => { sandbox.triggerRef.current = null; }, setOpen: () => {}, triggerRef: {current: {focus: () => assert.fail('Removed trigger must not be focused')}}};
  assert.doesNotThrow(() => vm.runInNewContext('(' + code(selection) + ')', sandbox)());
});
