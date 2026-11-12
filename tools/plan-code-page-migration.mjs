import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.');
const out = path.join(root, 'docs/code-pages/full-migration');
await mkdir(out, { recursive: true });
const inventory = JSON.parse(await readFile('docs/code-pages/site-inventory-2026-11-05/inventory.json', 'utf8'));
const contentBuckets = new Set(['standalone WordPress page', 'blog article', 'generated archive']);
const routes = inventory.entries.filter(row => contentBuckets.has(row.migration_bucket)).map(row => {
  const route = new URL(row.url).pathname;
  const key = row.kind === 'page' ? route.split('/').filter(Boolean).at(-1) : `${row.kind === 'blog post' ? 'post' : 'archive'}-${route.replace(/^\/+|\/+$/g, '').replaceAll('/', '-')}`;
  return { key, route, sourceUrl: row.url, title: row.title || row.production.html_title, kind: row.kind,
    postId: ['page','blog post'].includes(row.kind) ? row.id || null : null,
    termId: /^(category|tag) archive$/.test(row.kind) ? row.id || null : null, expectedSections: row.production.sections, features: row.production.features,
    source: `docs/code-pages/full-migration/captures/${key}`, status: 'planned' };
});
const aliases = inventory.entries.filter(row => row.migration_bucket === 'redirect or canonical alias').map(row => ({
  route: new URL(row.url).pathname, target: new URL(row.alias_target).pathname,
  sourceUrl: row.url, kind: row.kind, status: row.production.renderer === 'code-managed homepage' ? 'existing-homepage-canonical-alias' : 'planned-redirect',
}));
if (new Set(routes.map(row => row.key)).size !== routes.length) throw new Error('Duplicate migration keys');
if (routes.some(row => /^\/(?:store|store2)(?:\/|$)/.test(row.route))) throw new Error('Store routes must not enter content registry');
const manifest = { version: 1, createdAt: new Date().toISOString(), environment: 'staging-only',
  scope: 'All audited non-Ecwid legacy content, archives and aliases. Production, Ecwid, storefront and OmniLodge deployment are excluded.',
  routes, aliases, protectedFamilies: ['/', '/store/', '/store2/'],
  issues: [
    { id: 'legacy-brunch-link', route: '/', status: 'reviewed-protected-Ecwid-route', note: 'Dead link is in the already code-managed homepage; do not change the Ecwid route. Track a narrowly scoped staging-only incoming-link correction separately.' },
    { id: 'nye-legacy-year', route: '/new-years-eve/', status: 'review-required', note: 'Preserve layout; verify the current product-32 offer before correcting obsolete event year/time copy. Do not alter legal policy copy.' },
    { id: 'blog-homepage-collision', route: '/krakow-pub-crawl/', status: 'preserve-existing-homepage-canonical-alias', note: 'Not one of the 56 independently rendered articles. Keep current homepage behavior rather than invent another article URL or changing production SEO semantics.' },
  ],
  checkpoints: { preEditBackup: 'deploy-backups/before-full-page-migration-20261105-133409.zip', preEditBackupSha256: '0E6EFE81F285678FA76F5561AE6824DD13EB333B13881E8A5043C9DAC21296A6' },
};
await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(path.join(out, 'MIGRATION-PLAN.md'), `# Complete Non-Ecwid Migration Plan\n\nApproved on 2026-11-05: migrate all audited non-Ecwid pages, blog articles, archives and aliases to staging. Preserve production and all Ecwid routes. WordPress remains the server; Divi rendering/JavaScript is removed from migrated frontend routes.\n\n## Coverage\n\n- ${routes.length} content routes: 21 page designs (including the existing pilot), 56 article routes and 39 archive variants.\n- ${aliases.length} aliases: preserve existing redirect status/destination or the existing code-managed homepage canonical alias.\n- Forms, galleries, sliders, FAQ toggles, countdowns, maps/video consent, blog layout/pagination, booking attribution and keyboard controls remain functional.\n- Broken incoming links and stale offer-copy issues are tracked explicitly; Ecwid endpoints and legal text are not silently rewritten.\n\n## Release Gates\n\n1. [x] Pre-edit backup and complete route inventory.\n2. [ ] Capture production HTML/CSS/metadata and desktop/mobile baselines for every content route.\n3. [ ] Build an explicit, staging-only shared route registry and localized assets.\n4. [ ] Implement/test native interactive components and secure form handling.\n5. [ ] Verify content, metadata, responsive geometry/pixels, links and exclusions locally.\n6. [ ] Back up staging; deploy dependency-first and verify every SHA-256.\n7. [ ] Verify every live staging route, alias, form contract and SEO boundary.\n8. [ ] Refresh only scoped staging caches and verify device variants.\n\n## Route Checklist\n\n| Route | Kind | Status |\n| --- | --- | --- |\n${routes.map(row => `| ${row.route} | ${row.kind} | Planned |`).join('\n')}\n\nMachine-readable progress and evidence: manifest.json. A route is not complete merely because it is listed; capture/build/test/deployment evidence is required.\n`);
console.log(JSON.stringify({ contentRoutes: routes.length, aliases: aliases.length, out }));
