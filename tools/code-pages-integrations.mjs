import {readFile,writeFile} from 'node:fs/promises';
export async function buildPageIntegrations(homepage, assets) {
  const source=await readFile(homepage+'/integrations.php','utf8');
  const original="array( 'canonical', 'shortlink'";
  if (!source.includes(original)) throw new Error('Review changed homepage metadata filtering before rebuilding page integrations');
  const integrations=source.replaceAll('ktk_homepage_','ktk_pages_').replaceAll('KTK_HOMEPAGE_','KTK_PAGES_')
    .replace(original,"array( 'canonical', 'prev', 'next', 'shortlink'")
    .replace('/** Homepage-only','/** Generated from homepage integrations by tools/code-pages-integrations.mjs. Page-only');
  await writeFile(assets+'/integrations.php',integrations);
}
