import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [baseline, output] = process.argv.slice(2);
if (baseline !== 'ccbd19686e2104409f7a9c399239bacfcea1b630' || !output) throw Error('Exact motion baseline and fresh report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const root = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/', file = root + 'runtime.css', source = 'tools/slider-motion.css', hash = b => createHash('sha256').update(b).digest('hex'), checks = [], changed = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
for (const line of execFileSync('git', ['ls-tree', '-r', baseline, '--', 'staging'], {encoding: 'utf8'}).trim().split('\n')) {
  const [entry, name] = line.split('\t'), b = await readFile(name), equal = createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex') === entry.split(' ')[2];
  if (equal) check(name + ' baseline Git blob exact', true); else changed.push(name);
}
check('Exactly one application file changes', JSON.stringify(changed) === JSON.stringify([file]), changed);
check('No new application files', !execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'staging'], {encoding: 'utf8'}).trim());
const css = await readFile(file, 'utf8'), input = await readFile(source, 'utf8'), pattern = /\/\* BEGIN reduced-motion slide content \*\/[\s\S]*?\/\* END reduced-motion slide content \*\/\n/g, blocks = css.match(pattern) || [], inputs = input.match(pattern) || [];
const old = execFileSync('git', ['show', baseline + ':' + file], {encoding: 'utf8'});
check(file + ' all bytes outside one post-Memorial block exact', blocks.length === 1 && css.startsWith('/* BEGIN Memorial visitor guide */\n') && css.includes('/* END Memorial visitor guide */\n\n' + blocks[0]) && css.replace(pattern, '') === old);
check('New isolated style source is exactly the one block', inputs.length === 1 && input === inputs[0]);
check('Shared homepage/code-page style input and generator remain exact', ['tools/content-accessibility.css', 'tools/content-accessibility-styles.mjs'].every(name => execFileSync('git', ['diff', '--name-only', baseline, '--', name], {encoding: 'utf8'}).trim() === ''));
check('Generated/source block identical', blocks.length === 1 && inputs.length === 1 && blocks[0] === inputs[0]);
const require = createRequire(import.meta.url), frontend = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json')), ast = frontend('postcss').parse(blocks[0] || ''), media = [], rules = [];
ast.walkAtRules(n => media.push([n.name, n.params])); ast.walkRules(n => rules.push([n.selector, n.nodes.map(d => [d.prop, d.value, !!d.important])]));
check('Independent exact reduced-motion-only two-declaration allowlist', JSON.stringify(media) === JSON.stringify([['media', '(prefers-reduced-motion: reduce)']]) && JSON.stringify(rules) === JSON.stringify([['body.ktk-code-page #main-content .et_pb_slider .et_pb_slide :is(.et_pb_slide_description,.et_pb_slide_image,.et_pb_slide_image img,.et_pb_slide_video)', [['animation', 'none', true], ['opacity', '1', true]]]]), {media, rules});
check('Original immutable captures/media unchanged', !execFileSync('git', ['diff', '--name-only', baseline, '--', 'docs/code-pages/full-migration/captures', 'docs/code-pages/full-migration/assets.json'], {encoding: 'utf8'}).trim());
const sourceHashes = {}; for (const name of [file, source, 'tools/test-slider-motion-source.mjs']) sourceHashes[name] = hash(await readFile(name));
const report = {checkedAt: new Date().toISOString(), baseline, scope: 'Independent one-file application boundary and exact two-declaration reduced-motion block; all116 bodies/history/photos/metadata/runtime/commerce/consent/competition/medical hold exact. No network or application writes.', sourceHashes, passed: checks.filter(c => c.pass).length, total: checks.length, checks};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
