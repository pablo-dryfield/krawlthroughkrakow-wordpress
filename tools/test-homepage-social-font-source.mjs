import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { homepageSocialFontStyles, socialFontFiles } from './homepage-social-font.mjs';

const [baseline, output] = process.argv.slice(2);
if (baseline !== '49148160a9c937151525bfe0a787376c984a033a' || !output) throw new Error('Exact pre-edit commit and fresh output required');
try { await readFile(output); throw new Error('Preserve previous evidence'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const root = 'staging/wp-content/mu-plugins/ktk-homepage-assets/';
const original = file => execFileSync('git', ['show', `${baseline}:${file}`], { maxBuffer: 20 * 1024 * 1024 });
const checks = [], changed = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
const entries = execFileSync('git', ['ls-tree', '-rz', baseline, '--', 'staging'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const before = [];
for (const entry of entries) {
  const [metadata, file] = entry.split('\t'); before.push(file);
  const bytes = await readFile(file);
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (blob === metadata.split(' ')[2]) check(file + ' original Git blob retained', true);
  else changed.push(file);
}
check('one existing application CSS file changes', JSON.stringify(changed) === JSON.stringify([root + 'parity-runtime.css']), changed);
const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'staging'], { encoding: 'utf8' }).split('\0').filter(Boolean))].sort();
check('one derivative font added; no original application file deleted', JSON.stringify(files) === JSON.stringify([...before, root + 'social-icons-homepage.woff2'].sort()));
const fonts = {};
for (const name of Object.keys(socialFontFiles)) fonts[name] = await readFile(root + name);
const css = await readFile(root + 'parity-runtime.css', 'utf8'), old = original(root + 'parity-runtime.css').toString('utf8');
check('only exact bounded font declaration added', css === homepageSocialFontStyles(old, fonts));
check('font declaration is idempotent', css === homepageSocialFontStyles(css, fonts));
const literal = '/* BEGIN homepage social glyph delivery */\n@font-face {\n  font-family: "FontAwesome";\n  font-style: normal;\n  font-weight: 400;\n  font-display: block;\n  src: url("social-icons-homepage.woff2") format("woff2"),\n    url("parity/114236a5fb48-fa-brands-400.woff2") format("woff2");\n  unicode-range: U+E07B, U+F262;\n}\n/* END homepage social glyph delivery */\n\n';
check('independent literal inverse preserves every pre-edit CSS byte', css.split(literal).length === 2 && css.replace(literal, '') === old);
const oldBuild = JSON.parse(original('docs/homepage-parity/parity-build.json'));
const newBuild = JSON.parse(await readFile('docs/homepage-parity/parity-build.json', 'utf8'));
delete oldBuild.builtAt; delete newBuild.builtAt;
check('homepage capture/body build record unchanged except generation time', JSON.stringify(oldBuild) === JSON.stringify(newBuild));
check('immutable content media manifest unchanged', createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex') === 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const report = { checkedAt: new Date().toISOString(), baseline,
  scope: 'All existing tracked staging blobs exact except one literal font-face insertion; one932-byte font added. Artwork/content/forms/commerce/consent/medical hold unchanged.',
  passed: checks.filter(row => row.pass).length, total: checks.length, checks };
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, total: report.total, failed: checks.filter(row => !row.pass) }, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
