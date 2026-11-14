import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { extractPublishedContainer, summarizePublishedContainer, inspectStorefrontEvents } from './booking-measurement.mjs';
import { fetchCompleteResponse } from './read-only-http.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const argumentsList = process.argv.slice(2);
const publicContainer = argumentsList.includes('--public-container');
const output = argumentsList.find(argument => argument !== '--public-container');
if (!output || argumentsList.length !== (publicContainer ? 2 : 1)) {
  throw new Error('Usage: node tools/audit-booking-measurement.mjs [--public-container] docs/seo/.../report.json');
}
const outputPath = path.resolve(root, output);
if (!outputPath.startsWith(path.resolve(root, 'docs/seo') + path.sep)
    || path.extname(outputPath) !== '.json') throw new Error('An SEO evidence JSON path is required');

const files = [
  'staging/wp-content/plugins/ktk-storefront/frontend/src/google-ads-conversion.js',
  'staging/wp-content/plugins/ktk-storefront/frontend/src/main.jsx',
  'staging/wp-content/plugins/ktk-storefront/frontend/src/journey-queue.js',
  'staging/wp-content/plugins/ktk-storefront/frontend/src/journey-tracking.js',
  'tools/homepage-journey-entry.mjs',
  'staging/wp-content/mu-plugins/ktk-homepage-shortcode.php',
  'staging/wp-content/mu-plugins/ktk-code-pages.php',
  'staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js',
  'staging/wp-content/mu-plugins/ktk-homepage-assets/parity.js',
  'staging/wp-content/mu-plugins/ktk-site-integrations.php',
];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sources = new Map();
for (const file of files) sources.set(file, await readFile(path.join(root, file), 'utf8'));
const sourceHashes = Object.fromEntries([...sources].map(([file, text]) => [file, sha256(text)]));
const storefront = inspectStorefrontEvents(sources.get(files[1]));
if (storefront.conversionCalls.length !== 1
    || storefront.conversionCalls[0].enclosingCondition !== 'paid'
    || storefront.conversionCalls[0].branch !== 'consequent'
    || storefront.conversionCalls[0].argument !== 'result'
    || !storefront.paidConditions.includes("result.paymentStatus === 'paid' || result.total === 0")) {
  throw new Error('The reviewed confirmed-order call boundary has changed');
}
const report = { checkedAt: new Date().toISOString(), sourceHashes, storefront,
  scope: 'Read-only source audit; optional public GTM definition GET with bounded read retries, parsed but never executed.',
  networkGets: 0, providerEventsSent: 0, customerRecordsRead: 0,
  notConsentVerification: true, notProviderReceiptVerification: true };
if (publicContainer) {
  const response = await fetchCompleteResponse('https://www.googletagmanager.com/gtm.js?id=GTM-PHXGRZ',
    { redirect: 'error' }, { request: (url, options) => {
      report.networkGets += 1;
      return fetch(url, options);
    } });
  const body = await response.text();
  if (!response.ok || body.length > 5000000
      || !/javascript/i.test(response.headers.get('content-type') || '')) {
    throw new Error('Public GTM response is not JavaScript');
  }
  const resource = extractPublishedContainer(body);
  report.publicContainer = { url: 'https://www.googletagmanager.com/gtm.js?id=GTM-PHXGRZ',
    status: response.status, sha256: sha256(body), bytes: Buffer.byteLength(body),
    resourceSha256: sha256(JSON.stringify(resource)),
    ...summarizePublishedContainer(resource) };
}
for (const file of files) {
  if (sha256(await readFile(path.join(root, file), 'utf8')) !== sourceHashes[file]) {
    throw new Error(`Source changed during audit: ${file}`);
  }
}
report.sourceStable = true;
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ sources: files.length, sourceStable: true,
  journeyEvents: storefront.journeyEvents.length, conversionCalls: storefront.conversionCalls.length,
  publicContainerVersion: report.publicContainer?.version ?? null,
  networkGets: report.networkGets, providerEventsSent: 0, customerRecordsRead: 0 }, null, 2));
