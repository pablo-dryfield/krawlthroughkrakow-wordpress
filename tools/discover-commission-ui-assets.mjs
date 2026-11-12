import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function discoverCommissionAssets(buildPath, expectedSha, expectedRelease) {
  const root = fs.realpathSync(buildPath);
  const read = relative => {
    const target = path.resolve(root, relative.replace(/^\/+/, ''));
    if (!target.startsWith(root + path.sep)) throw new Error('Asset path escapes the UI build.');
    return fs.readFileSync(target);
  };
  const metadata = JSON.parse(read('release-metadata.json'));
  if (metadata.gitSha !== expectedSha || metadata.releaseId !== expectedRelease) throw new Error('UI artifact identity mismatch.');
  const manifest = JSON.parse(read('asset-manifest.json'));
  const registered = new Set(Object.values(manifest.files));
  const assets = [];
  for (const mapPath of registered) {
    if (!/^\/static\/js\/[\w.-]+\.js\.map$/.test(mapPath)) continue;
    const map = JSON.parse(read(mapPath));
    const sources = (map.sources ?? []).map(value => value.replaceAll('\\', '/'));
    const isPage = sources.some(value => /(?:^|\/)pages\/AffiliatesPage\.tsx$/.test(value));
    const isControl = sources.some(value => /(?:^|\/)components\/affiliates\/AffiliateCommissionRules\.tsx$/.test(value));
    if (!isPage && !isControl) continue;
    const publicPath = '/' + map.file;
    if (!/^\/static\/js\/[\w.-]+\.js$/.test(publicPath) || !registered.has(publicPath)) throw new Error('Mapped commission asset is not registered.');
    const bytes = read(publicPath);
    assets.push({ path: publicPath, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), isPage, isControl,
      sources: sources.filter(value => /(?:AffiliatesPage|AffiliateCommissionRules)\.tsx$/.test(value)) });
  }
  if (!assets.some(asset => asset.isPage) || !assets.some(asset => asset.isControl)) throw new Error('Required commission UI sources are absent from the release maps.');
  return { metadata, assets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(discoverCommissionAssets(...process.argv.slice(2)))); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
