import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';

const [baseline, output] = process.argv.slice(2);
if (baseline !== 'e1c491915f07305d7150994e0dc89f052dfd34a4' || !output) throw Error('Exact pre-booking-review baseline and fresh report required');
try { await readFile(output); throw Error('Preserve earlier evidence'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const root = 'staging/wp-content/plugins/ktk-storefront/', source = root + 'frontend/src/ProductConfigurator.jsx', checks = [], changed = [];
const check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const before = execFileSync('git', ['show', baseline + ':' + source], {encoding: 'utf8'}), current = await readFile(source, 'utf8'), nl = before.includes('\r\n') ? '\r\n' : '\n';
const replacements = [
  ['  const rootRef = useRef(null);\n  const selectedDate', '  const rootRef = useRef(null);\n  const triggerRef = useRef(null);\n  const selectedDate'],
  ["      if (event.key === 'Escape') setOpen(false);", "      if (event.key === 'Escape') {\n        setOpen(false);\n        triggerRef.current?.focus();\n      }"],
  ["        className={`ktk-date-picker__trigger${open ? ' is-open' : ''}`}\n        type=", "        className={`ktk-date-picker__trigger${open ? ' is-open' : ''}`}\n        ref={triggerRef}\n        type="],
  ['                      onUnavailableDate(availability);\n                      setOpen(false);\n                      return;', '                      onUnavailableDate(availability);\n                      setOpen(false);\n                      triggerRef.current?.focus();\n                      return;'],
  ['                    onChange(key);\n                    setOpen(false);', '                    onChange(key);\n                    setOpen(false);\n                    triggerRef.current?.focus();'],
  ['  field,\n}) {\n  const safeMin', '  field,\n  invalid = false,\n  describedBy,\n}) {\n  const safeMin'],
  ['      onChange={(quantity) => onChange(numeric(quantity))}\n      label={label}\n      field={field}', '      onChange={(quantity) => onChange(numeric(quantity))}\n      label={label}\n      field={field}\n      invalid={invalid}\n      describedBy={describedBy}'],
  ["  const [availabilityMessage, setAvailabilityMessage] = useState('');", "  const [availabilityMessage, setAvailabilityMessage] = useState('');\n  const [participantError, setParticipantError] = useState('');"],
  ["  const totalParticipants = config.participantMode === 'gender_split'\n    ? men + women\n    : participants;", "  const totalParticipants = config.participantMode === 'gender_split'\n    ? men + women\n    : participants;\n  const minimumParticipants = Math.max(1, numeric(config.minParticipants, 1));\n  const participantErrorId = `ktk-participants-error-${product.id}`;"],
  ['  const updateParticipants = (participantType, previousValue, nextValue, setter) => {\n    setter(nextValue);', "  const updateParticipants = (participantType, previousValue, nextValue, setter) => {\n    setParticipantError('');\n    setter(nextValue);"],
  ['    if (totalParticipants < numeric(config.minParticipants, 1)) {\n      return { field: \'participants\', message: `Choose at least ${numeric(config.minParticipants, 1)} participant(s).` };', '    if (totalParticipants < minimumParticipants) {\n      return { field: \'participants\', message: `Choose at least ${minimumParticipants} participant(s).` };'],
  ["  const submit = () => {\n    const validationError = validate();", "  const submit = () => {\n    const validationError = validate();\n    setParticipantError(validationError?.field === 'participants' ? validationError.message : '');"],
  ['            label="Number of men"\n            field="participants"', '            label="Number of men"\n            field="participants"\n            invalid={Boolean(participantError)}\n            describedBy={participantError ? participantErrorId : undefined}'],
  ['            label="Number of women"\n            field="participants"', '            label="Number of women"\n            field="participants"\n            invalid={Boolean(participantError)}\n            describedBy={participantError ? participantErrorId : undefined}'],
  ['          label="participants"\n          field="participants"', '          label="participants"\n          field="participants"\n          invalid={Boolean(participantError)}\n          describedBy={participantError ? participantErrorId : undefined}'],
  ['          {sectionRenderers[section]?.()}', '          {sectionRenderers[section]?.()}\n          {section === \'group_size\' && participantError && (\n            <small className="ktk-field-error" id={participantErrorId} role="alert">\n              {participantError}\n            </small>\n          )}']
];
let expected = before;
for (const [index, pair] of replacements.entries()) {
  const [from, to] = pair.map(s => s.replaceAll('\n', nl));
  if (expected.split(from).length !== 2) throw Error('Unique original source anchor required: ' + index);
  expected = expected.replace(from, to);
}
check('Complete source delta is exactly calendar focus and participant validation/error bindings', expected === current);
const cssFile = root + 'frontend/src/storefront.css', cssBefore = execFileSync('git', ['show', baseline + ':' + cssFile], {encoding: 'utf8'}), cssCurrent = await readFile(cssFile, 'utf8'), cssNl = cssBefore.includes('\r\n') ? '\r\n' : '\n';
const styleChanges = [
  ['.ktk-configurator .ktk-field-error {\n  color: #ff76b9;\n  font-size: 9px;', '.ktk-configurator .ktk-field-error {\n  color: #ff76b9;\n  font-size: 14px;'],
  ['.ktk-date-picker__weekdays span {\n  color: rgba(243, 238, 228, 0.42);\n  font-size: 8px;', '.ktk-date-picker__weekdays span {\n  color: rgba(243, 238, 228, 0.72);\n  font-size: 12px;'],
  ['.ktk-date-picker__days button:hover:not(:disabled),', '.ktk-date-picker .ktk-date-picker__days button {\n  font-size: 14px;\n}\n\n.ktk-date-picker__days button:hover:not(:disabled),']
];
let expectedCss = cssBefore;
for (const pair of styleChanges) { const [from, to] = pair.map(s => s.replaceAll('\n', cssNl)); if (expectedCss.split(from).length !== 2) throw Error('Unique original calendar style required'); expectedCss = expectedCss.replace(from, to); }
check('Every other CSS byte retained outside four calendar/error declarations', cssCurrent === expectedCss);
for (const row of execFileSync('git', ['ls-tree', '-rz', baseline, '--', 'staging'], {encoding: 'utf8'}).split('\0').filter(Boolean)) {
  const [meta, file] = row.split('\t'), b = await readFile(file), sha = createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
  if (sha === meta.split(' ')[2]) check(file + ' original Git blob retained', true); else changed.push(file);
}
check('Only configurator source, four source declarations and compiled JS/CSS change', JSON.stringify(changed.sort()) === JSON.stringify([source, cssFile, root + 'assets/storefront.js', root + 'assets/storefront.css'].sort()), changed);
check('No new application files', !execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'staging'], {encoding: 'utf8'}).trim());
const report = {checkedAt: new Date().toISOString(), baseline, scope: 'Exact whole-source reconstruction, four explicit calendar/error style declarations and all other staging Git blobs; no pricing/availability/add-on/cart/payment/provider/consent/PHP/metadata/font/content changes.', passed: checks.filter(c => c.pass).length, total: checks.length, checks};
await mkdir(path.dirname(output), {recursive: true});
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
