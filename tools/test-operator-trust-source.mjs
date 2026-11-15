import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [baseline, output] = process.argv.slice(2);
if (baseline !== 'c909918238b8d28b9121c8d62701e1266a931c84' || !output) throw Error('Exact operator baseline/fresh report required');
try {await readFile(output); throw Error('Preserve evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const root = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/', keys = ['about-us', 'contact', 'terms-and-conditions', 'privacy-policy', 'tour-service-disclaimer', 'testimonials'], files = [...keys.map(k => root + 'content/' + k + '.html'), root + 'runtime.css'].sort(), checks = [], changed = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail}), sha = b => createHash('sha256').update(b).digest('hex'), original = file => execFileSync('git', ['show', baseline + ':' + file], {maxBuffer: 15e6});
for (const line of execFileSync('git', ['ls-tree', '-r', baseline, '--', 'staging'], {encoding: 'utf8'}).trim().split('\n')) {
  const [entry, name] = line.split('\t'), b = await readFile(name), equal = createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex') === entry.split(' ')[2];
  if (equal) check(name + ' Git blob exact', true); else changed.push(name);
}
check('Exactly seven application files', JSON.stringify(changed.sort()) === JSON.stringify(files), changed);
check('No new application files', !execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'staging'], {encoding: 'utf8'}).trim());
const css = await readFile(root + 'runtime.css', 'utf8'), oldCss = original(root + 'runtime.css').toString(), blocks = css.match(/\/\* BEGIN Operator identity and trust \*\/[\s\S]*?\/\* END Operator identity and trust \*\/\n/g) || [];
check('Every old CSS byte/exact insertion retained', blocks.length === 1 && css.replace(blocks[0], '') === oldCss && css === oldCss.replace('/* END Group enquiry overview */\n', '/* END Group enquiry overview */\n' + blocks[0]));
const frontend = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json')), ast = frontend('postcss').parse(blocks[0] || ''), rules = [], media = [];
ast.walkAtRules(n => media.push([n.name, n.params])); ast.walkRules(n => rules.push([n.selector, n.nodes.map(d => [d.prop, d.value, !!d.important])]));
const all = 'body.ktk-code-page #main-content :is([data-ktk-operator-details="2026-11-15.operator-trust-1"],[data-ktk-review-platform-links="2026-11-15.operator-trust-1"])', copy = 'body.ktk-code-page #main-content [data-ktk-operator-copy="2026-11-15.operator-trust-1"]:not(h3):not(h5)', decl = pairs => pairs.map(([p,v]) => [p,v,false]);
const expected = [[all, decl([['font-size','16px'],['line-height','1.65'],['text-align','left'],['margin','24px 0']])], [all + ' h2', decl([['font-family','inherit'],['font-size','22px'],['font-weight','700'],['line-height','1.35'],['margin','0 0 12px']])], [all + ' p', decl([['font-size','16px'],['line-height','1.65']])], [all + ' dl', decl([['margin','12px 0']])], [all + ' dt', decl([['font-weight','700']])], [all + ' dd', decl([['margin','0 0 10px'],['overflow-wrap','anywhere']])], [all + ' a', decl([['color','inherit'],['text-decoration','underline'],['text-underline-offset','.15em']])], [all + ' a:focus-visible', decl([['outline','2px solid currentColor'],['outline-offset','3px']])], ['body.ktk-code-page #main-content [data-ktk-review-platform-links="2026-11-15.operator-trust-1"] li a', decl([['display','inline-block'],['min-height','44px'],['padding','8px 0'],['box-sizing','border-box']])], [copy + ', ' + copy + ' p', [['font-size','16px',false],['line-height','1.65',false],['text-align','left',true]]], [all + ', ' + copy, decl([['padding-right','24px'],['box-sizing','border-box']])]];
check('Independent eleven-rule CSS allowlist/one breakpoint/one justified-copy override', JSON.stringify(rules) === JSON.stringify(expected) && JSON.stringify(media) === JSON.stringify([['media','(max-width: 600px)']]), {rules, media});
const facts = JSON.parse(await readFile('tools/site-operator-facts.json', 'utf8')), require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel:'chrome',headless:true});
const platforms = JSON.parse(execFileSync('php', ['-r', "define('ABSPATH','.');require $argv[1];echo json_encode(array_map(fn($r)=>array('name'=>$r['name'],'url'=>$r['url']),ktk_homepage_review_sources()));", 'staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php'], {encoding:'utf8'}));
try {
  const context = await browser.newContext({javaScriptEnabled:false}); await context.route('**/*', r => r.abort()); const page = await context.newPage();
  for (const key of keys) {
    await page.setContent(await readFile(root + 'content/' + key + '.html', 'utf8'));
    const result = await page.evaluate(({key,before,facts,platforms}) => {
      const old = new DOMParser().parseFromString(before,'text/html'), clone = document.documentElement.cloneNode(true), main = clone.querySelector('#main-content'), previous = old.querySelector('#main-content'), clean = s => (s || '').replace(/\s+/g,' ').trim(), same = s => JSON.stringify([...document.querySelectorAll(s)].map(n=>n.outerHTML)) === JSON.stringify([...old.querySelectorAll(s)].map(n=>n.outerHTML));
      const operator = main.querySelectorAll('[data-ktk-operator-details]'), section = operator[0], office = facts.registeredOffice, values = section ? [...section.querySelectorAll('dd')].map(n=>n.textContent) : [];
      let exact = key === 'testimonials' ? !operator.length : operator.length === 1 && section.dataset.ktkOperatorDetails === '2026-11-15.operator-trust-1' && section.querySelector('strong')?.textContent === facts.legalName && JSON.stringify(values) === JSON.stringify([office.street + ', ' + office.postalCode + ' ' + office.city + ', ' + office.country, facts.krs, facts.nip]) && JSON.stringify([...section.querySelectorAll('a')].map(n=>n.getAttribute('href'))) === JSON.stringify([facts.publicRegisterUrl,'__KTK_HOME_URL__meeting-point/']) && !section.textContent.includes('@');
      main.querySelectorAll('[data-ktk-operator-details]').forEach(n=>n.remove());
      if (key === 'about-us') {
        for (const s of ['.et_pb_text_2 .et_pb_text_inner','.et_pb_text_4 .et_pb_text_inner > :is(h3,h5)','.et_pb_text_5 .et_pb_text_inner','.et_pb_text_12 .et_pb_text_inner > p:nth-of-type(2)']) {const n=main.querySelector(s); exact = exact && n.dataset.ktkOperatorCopy === '2026-11-15.operator-trust-1'; n.innerHTML=previous.querySelector(s).innerHTML;n.removeAttribute('data-ktk-operator-copy');}
      }
      if (key === 'testimonials') {
        const n=main.querySelector('.et_pb_code_1 .et_pb_code_inner'), links=[...n.querySelectorAll('a')];exact = exact && n.querySelectorAll('[data-ktk-review-platform-links]').length===1 && links.length===3 && JSON.stringify(links.map(n=>n.getAttribute('href')))===JSON.stringify(platforms.map(p=>p.url)) && !/\d|\[wptripadvisor/.test(n.textContent);n.innerHTML=previous.querySelector('.et_pb_code_1 .et_pb_code_inner').innerHTML;
      }
      if (key === 'privacy-policy') {const n=main.querySelector('[data-ktk-operator-domain-review]'), original=[...previous.querySelectorAll('.et_pb_text_1 .et_pb_text_inner p')].find(n=>clean(n.querySelector('strong')?.textContent)==='SERVICE');exact=exact && n?.innerHTML===original.innerHTML.replace('krawlthoughkrakow.com','krawlthroughkrakow.com');n.replaceWith(original.cloneNode(true));}
      if (key === 'tour-service-disclaimer') {
        const s='.et_pb_text_4 .et_pb_text_inner', n=main.querySelector(s), p=main.querySelector('[data-ktk-id-guidance-review]');exact=exact && n.dataset.ktkOperatorCopy==='2026-11-15.operator-trust-1' && n.querySelector('a')?.getAttribute('href')==='__KTK_HOME_URL__store2/pub-crawl-28/#book' && !/85zl|90zl|guarantee|pro drunk/i.test(n.textContent) && p.textContent.includes('Customers must be at least 18 years old. Bringing valid identification is recommended for this event.');n.innerHTML=previous.querySelector(s).innerHTML;n.removeAttribute('data-ktk-operator-copy');p.replaceWith(previous.querySelector('.et_pb_text_1 .et_pb_text_inner p').cloneNode(true));
      }
      return {exact,inverse:clone.outerHTML===old.documentElement.outerHTML,media:same('img,iframe,video,svg'),forms:same('form'),h1:same('h1'),gates:same('[data-ktk-consent-src]'),protectedShapo:key!=='testimonials'||same('.et_pb_code_0'),photos:document.querySelectorAll('#main-content img').length};
    }, {key,before:original(root+'content/'+key+'.html').toString(),facts,platforms});
    for (const field of ['exact','inverse','media','forms','h1','gates','protectedShapo']) check(key+' '+field,result[field],result);
    if(key==='about-us')check('Eleven original About Us photo elements',result.photos===11,result);
  }
  await context.close();
} finally {await browser.close();}
check('Captures/assets/catalog/discovery/definitions unchanged', !execFileSync('git',['diff','--name-only',baseline,'--','docs/code-pages/full-migration/captures','docs/code-pages/full-migration/assets.json','tools/reviewed-article-presentation.json','staging/wp-content/mu-plugins/ktk-seo-discovery.php','staging/wp-content/mu-plugins/ktk-seo-discovery-data.json','staging/wp-content/mu-plugins/ktk-code-pages-definitions.php'],{encoding:'utf8'}).trim());
const sourceHashes={};for(const file of [...files,'tools/site-operator-facts.json','tools/operator-trust-editorial.mjs','tools/test-operator-trust-source.mjs'])sourceHashes[file]=sha(await readFile(file));
const report={checkedAt:new Date().toISOString(),baseline,scope:'Independent seven-file application scope, CSS allowlist and complete six-body inverses. All other application blobs, substantive legal clauses, media, forms, consent embeds, commerce, medical hold and active competition exact. No network/application writes.',sourceHashes,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
