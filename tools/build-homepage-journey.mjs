import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
const { build } = require('esbuild');
await build({
  entryPoints: [path.join(root, 'tools/homepage-journey-entry.mjs')],
  outfile: path.join(root, 'staging/wp-content/mu-plugins/ktk-homepage-assets/journey.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
});
console.log('Built homepage journey collector from the shared storefront queue.');
