import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildSliderMotionStyles} from '../slider-motion-styles.mjs';

const styles = await readFile(new URL('../slider-motion.css', import.meta.url), 'utf8');
const before = '/* BEGIN Memorial visitor guide */\n.original {color:black;}\n/* END Memorial visitor guide */\n\n/* Existing styles */\n', anchor = '/* END Memorial visitor guide */\n\n', expected = before.replace(anchor, anchor + styles);
test('motion styles contain only one reduced-only text-slide rule and two declarations', () => {
  const frontend = createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json', import.meta.url)), ast = frontend('postcss').parse(styles), media = [], rules = [];
  ast.walkAtRules(n => media.push([n.name, n.params])); ast.walkRules(n => rules.push([n.selector, n.nodes.map(d => [d.prop, d.value, !!d.important])]));
  assert.deepEqual(media, [['media', '(prefers-reduced-motion: reduce)']]); assert.deepEqual(rules, [['body.ktk-code-page #main-content .et_pb_slider .et_pb_slide :is(.et_pb_slide_description,.et_pb_slide_image,.et_pb_slide_image img,.et_pb_slide_video)', [['animation', 'none', true], ['opacity', '1', true]]]]);
  assert.doesNotMatch(styles, /display:|visibility:|transition:|transform:|\.et_pb_gallery|cookie|consent/);
});
test('code-page motion block retains the leading Memorial block and compiles idempotently', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-motion-prefix-'));
  try {const file = path.join(dir, 'runtime.css'); await writeFile(file, before); await buildSliderMotionStyles(file); assert.equal(await readFile(file, 'utf8'), expected); await buildSliderMotionStyles(file); assert.equal(await readFile(file, 'utf8'), expected); assert.equal(expected.replace(styles, ''), before);} finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-motion-prefix-')); await rm(dir, {recursive: true, force: true});}
});
for (const [label, value] of [['changed', expected.replace('opacity: 1', 'opacity: 0')], ['duplicated', expected + styles], ['moved', before + styles], ['partial', before + '/* BEGIN reduced-motion slide content */\n'], ['missing leading anchor', styles + 'a{color:red}\n']]) test('motion ' + label + ' markers reject atomically', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-motion-prefix-'));
  try {const file = path.join(dir, 'runtime.css'); await writeFile(file, value); await assert.rejects(() => buildSliderMotionStyles(file)); assert.equal(await readFile(file, 'utf8'), value);} finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-motion-prefix-')); await rm(dir, {recursive: true, force: true});}
});
