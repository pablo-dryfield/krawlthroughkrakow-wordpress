import {readFile} from 'node:fs/promises';
import {loadOfferFacts,expandOfferMetadata} from './site-offer-facts.mjs';

export const seoMetadata = expandOfferMetadata(JSON.parse(await readFile(new URL('./code-pages-seo.json', import.meta.url), 'utf8')),await loadOfferFacts());

export function validateSeoMetadata(data) {
  if (data?.schemaVersion !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedOn || '') || !data.pages || Array.isArray(data.pages)) {
    throw new Error('Reviewed SEO metadata source required');
  }
  const descriptions = new Set();
  for (const [route, entry] of Object.entries(data.pages)) {
    if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(route) || /^\/(?:staging|store|store2|author|category|tag)(?:\/|$)/.test(route)) {
      throw new Error('Invalid content metadata route: ' + route);
    }
    if (Object.keys(entry).sort().join(',') !== 'description,role' || typeof entry.role !== 'string' || !entry.role.trim()
      || typeof entry.description !== 'string' || entry.description !== entry.description.trim() || !entry.description
      || /[<>{}\r\n]/.test(entry.description) || descriptions.has(entry.description)) {
      throw new Error('Distinct plain-text description and URL role required: ' + route);
    }
    descriptions.add(entry.description);
  }
  for (const [route,reason] of Object.entries(data.holds || {})) {
    if (!/^\/[a-z0-9-]+\/$/.test(route) || data.pages[route] || typeof reason !== 'string' || !reason.trim() || /[<>\r\n]/.test(reason)) {
      throw new Error('A held page needs a distinct explicit plain-text reason: ' + route);
    }
  }
  return data;
}

validateSeoMetadata(seoMetadata);

export function validateSeoRoutes(routes, data = seoMetadata) {
  validateSeoMetadata(data);
  const known = new Set(routes);
  for (const route of [...Object.keys(data.pages), ...Object.keys(data.holds || {})]) {
    if (!known.has(route)) throw new Error('SEO override has no registered content page: ' + route);
  }
}

export function codePageDescription(route, capturedDescription, data = seoMetadata) {
  return data.pages[route]?.description ?? capturedDescription;
}
