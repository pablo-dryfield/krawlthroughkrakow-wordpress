import { createRequire } from 'node:module';
import { writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
let modulePath;
try { modulePath = require.resolve('lucide'); } catch {
  modulePath = require.resolve(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/lucide'));
}
const icons = require(modulePath);
const names = ['ArrowUpRight', 'ArrowDown', 'MapPin', 'Menu', 'X', 'Plus', 'Play', 'ChevronLeft', 'ChevronRight', 'Expand'];
const symbols = names.map(name => {
  const id = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const paths = icons[name].map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ')}/>`).join('');
  return `<symbol id="${id}" viewBox="0 0 24 24">${paths}</symbol>`;
}).join('');
const destination = 'staging/wp-content/mu-plugins/ktk-homepage-assets';
await writeFile(`${destination}/icons.svg`, `<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`);
await copyFile(path.resolve(modulePath, '../../../LICENSE'), `${destination}/lucide-LICENSE.txt`);
console.log(`Built ${names.length} Lucide icons; no runtime library.`);
