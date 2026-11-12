import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seoMetadata, validateSeoMetadata, validateSeoRoutes, codePageDescription} from '../code-pages-seo.mjs';

const manifest = JSON.parse(await readFile(new URL('../../docs/code-pages/full-migration/manifest.json', import.meta.url), 'utf8'));
const routes = manifest.routes.map(row => row.route);

test('pilot contains exactly eight reviewed and registered content routes', () => {
  assert.equal(Object.keys(seoMetadata.pages).length, 8);
  assert.equal(seoMetadata.reviewedOn, '2026-11-12');
  assert.doesNotThrow(() => validateSeoRoutes(routes));
});

test('only explicit routes change; other descriptions retain their original values', () => {
  for (const route of routes) {
    assert.equal(codePageDescription(route, 'original'), seoMetadata.pages[route]?.description ?? 'original');
  }
  for (const route of ['/', '/store/', '/store2/', '/krakow-pub-crawl/', '/category/party-tips/', '/staging/new-years-eve/']) {
    assert.equal(codePageDescription(route, 'original'), 'original');
  }
});

test('descriptions cannot contain markup, empty values or duplicated copy', () => {
  for (const description of ['', ' leading space', '<script>alert(1)</script>', 'line\nbreak']) {
    const data = structuredClone(seoMetadata);
    data.pages['/about-us/'].description = description;
    assert.throws(() => validateSeoMetadata(data));
  }
  const duplicate = structuredClone(seoMetadata);
  duplicate.pages['/about-us/'].description = duplicate.pages['/meeting-point/'].description;
  assert.throws(() => validateSeoMetadata(duplicate));
});

test('SEO data cannot silently alter canonicals, titles or indexing policy', () => {
  for (const field of ['title', 'canonical', 'robots', 'redirect']) {
    const data = structuredClone(seoMetadata);
    data.pages['/about-us/'][field] = 'unreviewed';
    assert.throws(() => validateSeoMetadata(data));
  }
});

test('unregistered and protected routes fail before building', () => {
  assert.throws(() => validateSeoRoutes(routes.filter(route => route !== '/about-us/')));
  for (const route of ['/store/', '/store2/pub-crawl-28/', '/staging/about-us/', '//example.com/', '/about-us/?test=1']) {
    const data = structuredClone(seoMetadata);
    data.pages[route] = {description:'Different description', role:'test'};
    assert.throws(() => validateSeoRoutes(routes, data));
  }
});

test('NYE and regular meeting descriptions remain separate', () => {
  const nye = codePageDescription('/new-years-eve/', '');
  assert.match(nye, /31 December 2026/);
  assert.match(nye, /5 PM or 7:30 PM/);
  assert.match(nye, /meeting points are to be confirmed/);
  assert.doesNotMatch(nye, /Adam Statue|9 PM/);
  assert.match(codePageDescription('/meeting-point/', ''), /Adam Statue.*9 PM/);
});
