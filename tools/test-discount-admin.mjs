import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const omni = path.resolve(process.argv[2] || '../omni-lodge-discount-basis');
const require = createRequire(import.meta.url);
const { build } = require(path.join(omni, 'ui/node_modules/esbuild'));
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const result = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {MantineProvider} from '@mantine/core'; import '@mantine/core/styles.css'; import Page from './src/pages/settings/SettingsStorefrontPromotions'; createRoot(document.getElementById('root')).render(<MantineProvider><Page/></MantineProvider>);`, resolveDir: path.join(omni, 'ui'), loader: 'tsx' },
  bundle: true, write: false, outdir: 'out', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'isolated-admin', setup(build) {
    build.onResolve({ filter: /(?:PageAccessGuard|useModuleAccess|axiosInstance)$/ }, args => ({ path: args.path.split('/').pop(), namespace: 'qa' }));
    build.onLoad({ filter: /.*/, namespace: 'qa' }, ({ path: name }) => ({ contents:
      name === 'PageAccessGuard' ? 'export const PageAccessGuard = ({children})=>children;' :
      name === 'useModuleAccess' ? 'export const useModuleAccess=()=>({ready:true,canView:true,canCreate:true,canUpdate:true,canDelete:true});' :
      'export default {get:async(url)=>({data:url==="/products"?[{data:[{id:28,name:"Pub Crawl"}]}]:{data:[]}}),post:async(url,payload)=>{window.savedDiscount=payload;return {data:{}}}};' }));
  } }],
});
const js = result.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = result.outputFiles.find(file => file.path.endsWith('.css')).contents;
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : req.url === '/app.css' ? 'text/css' : 'text/html');
  res.end(req.url === '/app.js' ? js : req.url === '/app.css' ? css : '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checks: [], errors: [] };
const dir = 'docs/storefront-discounts';
await mkdir(dir, { recursive: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button', { name: 'New code', exact: true }).click();
    await page.getByRole('textbox', { name: 'Code', exact: true }).fill('TENPERPERSON');
    await page.getByRole('textbox', { name: 'Promotion name', exact: true }).fill('10 PLN per person');
    await page.getByRole('textbox', { name: 'Discount type', exact: true }).click();
    await page.getByRole('option', { name: 'Fixed amount', exact: true }).click();
    await page.getByRole('textbox', { name: 'Apply discount', exact: true }).click();
    await page.getByRole('option', { name: 'Per person', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Also synchronize this code to Ecwid' }).isDisabled(), true);
    await page.getByRole('dialog').screenshot({ path: `${dir}/admin-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Save promotion', exact: true }).click();
    await page.waitForFunction(() => Boolean(window.savedDiscount));
    assert.deepEqual(await page.evaluate(() => ({ basis: savedDiscount.applicationBasis, scope: savedDiscount.discountScope, value: savedDiscount.value, type: savedDiscount.type, sync: savedDiscount.syncToEcwid })), { basis: 'person', scope: 'tour', value: 10, type: 'fixed', sync: false });
    report.checks.push(`${width}: actual form fields, dropdowns, responsive layout and payload verified`);
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
await writeFile(`${dir}/admin-browser.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
