import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output = process.argv[process.argv.indexOf('--output') + 1];
if (!process.argv.includes('--output') || !output) throw new Error('Explicit new report path required');
try { await readFile(output); throw new Error('Preserve earlier report'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const origin = 'https://krawlthroughkrakow.com';
const report = {checkedAt: new Date().toISOString(), checks: [], errors: [], blockedWrites: 0, blockedExternal: 0,
    scope: 'Post-WPCode-removal smoke only; no other plugin is disabled. Third-party requests and non-read methods blocked. No forms, orders or consent changes. Not a tracking-delivery or security certificate.'};
const check = (name, pass, detail) => report.checks.push({name, pass: !!pass, detail});
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
    for (const environment of ['staging', 'production']) for (const width of [390, 1440]) {
        const prefix = environment === 'staging' ? '/staging' : '';
        const context = await browser.newContext({viewport: {width, height: 900}});
        try {
            await context.route('**/*', route => {
                const request = route.request(), url = new URL(request.url());
                if (!['GET', 'HEAD'].includes(request.method())) { report.blockedWrites++; return route.abort(); }
                if (url.origin !== origin || url.pathname.startsWith('/9z78') || url.pathname.startsWith('/staging/9z78')) {
                    report.blockedExternal++; return route.abort();
                }
                if (url.pathname.includes('/wp-json/') && !/\/ktk-storefront\/v1\/(?:products(?:\/[^/]+)?|config)\/?$/.test(url.pathname)) return route.abort();
                return route.continue();
            });
            await context.addInitScript(() => localStorage.setItem('trk_utm_source', 'isolated-plugin-audit'));
            const page = await context.newPage();
            page.on('pageerror', error => report.errors.push({environment, width, message: error.message}));
            for (const route of ['/', '/stagshens/', '/welcome-to-alcohol/', '/contact/', '/store2/pub-crawl-28/']) {
                const name = `${environment} ${width} ${route}`;
                try {
                    const response = await page.goto(origin + prefix + route, {waitUntil: 'load', timeout: 60000});
                    await page.mouse.move(10, 10);
                    const store = route.startsWith('/store2/');
                    if (store) await page.waitForFunction(() => {
                        const root = document.getElementById('ktk-storefront-root');
                        return root?.hidden === false && !!root.querySelector('h1');
                    }, {}, {timeout: 30000});
                    const facts = await page.evaluate(() => ({
                        title: document.title, text: document.body.textContent.length,
                        productHeading: document.querySelector('#ktk-storefront-root h1')?.textContent.trim(),
                        ctas: document.querySelectorAll('a#ktk-cta').length,
                        nativeForms: document.querySelectorAll('form[data-ktk-form="contact"]').length,
                        cf7: [...document.querySelectorAll('form[data-ktk-form="cf7"]')].map(form => ({
                            id: form.querySelector('[name="_wpcf7"]')?.value, endpoint: form.dataset.feedbackEndpoint})),
                        canonical: document.querySelector('link[rel="canonical"]')?.href,
                    }));
                    check(name + ' page remains available', response.status() === 200 && facts.title && facts.text > 300, {status: response.status(), title: facts.title});
                    check(name + ' correct floating CTA count', facts.ctas === (store ? 0 : 1), facts.ctas);
                    check(name + ' canonical retained', facts.canonical === origin + prefix + route, facts.canonical);
                    if (store) check(name + ' actual product application rendered', facts.productHeading === 'Pub Crawl', facts.productHeading);
                    if (route === '/contact/') check(name + ' native contact form retained', facts.nativeForms === 1, facts.nativeForms);
                    if (['/stagshens/', '/welcome-to-alcohol/'].includes(route)) {
                        const expected = route === '/stagshens/' ? '2219' : '1675';
                        check(name + ' CF7 backend still connected', facts.cf7.length === 1 && facts.cf7[0].id === expected
                            && facts.cf7[0].endpoint === origin + prefix + '/wp-json/contact-form-7/v1/contact-forms/' + expected + '/feedback', facts.cf7);
                    }
                    if (!store) {
                        await page.evaluate(() => document.addEventListener('click', event => event.preventDefault()));
                        await page.locator('a#ktk-cta').evaluate(node => node.click());
                        const href = new URL(await page.locator('a#ktk-cta').getAttribute('href'), origin);
                        check(name + ' code-owned UTM and booking destination', href.pathname === prefix + '/store2/pub-crawl-28/'
                            && href.searchParams.get('utm_source') === 'isolated-plugin-audit' && href.hash === '#book');
                        check(name + ' test did not navigate or submit', page.url() === origin + prefix + route);
                    }
                } catch (error) { check(name + ' scenario completes', false, error.message); }
            }
        } finally { await context.close(); }
    }
} finally {
    await browser.close();
    check('No unexpected runtime errors with providers blocked', report.errors.every(row =>
        ['fbq is not defined', 'FacebookSignal is not defined'].includes(row.message)), report.errors);
    report.summary = {passed: report.checks.filter(row => row.pass).length, total: report.checks.length};
    await mkdir(path.dirname(output), {recursive: true});
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({summary: report.summary, failures: report.checks.filter(row => !row.pass),
        pageErrorMessages: [...new Set(report.errors.map(row => row.message))], blockedWrites: report.blockedWrites}, null, 2));
    if (report.summary.passed !== report.summary.total) process.exitCode = 1;
}
