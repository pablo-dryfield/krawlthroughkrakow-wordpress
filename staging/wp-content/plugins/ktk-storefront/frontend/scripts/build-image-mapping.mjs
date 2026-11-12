import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const archiveRoot = resolve(
  process.argv[2]
    || 'C:/Users/pjcam/Documents/Projects/krawlthroughkrakow-wordpress/photo-library',
);
const outputFile = resolve(
  process.argv[3] || './image-mapping.json',
);
const mediaOrigin = 'https://media.krawlthroughkrakow.com';

const [manifest, matches] = await Promise.all([
  readFile(join(archiveRoot, 'manifest.json'), 'utf8').then(JSON.parse),
  readFile(join(archiveRoot, 'catalog-matches.json'), 'utf8').then(JSON.parse),
]);

const deduplicator = resolve(
  fileURLToPath(new URL('./visual-deduplicate.py', import.meta.url)),
);
const deduplication = spawnSync(
  'python',
  [deduplicator, archiveRoot],
  { encoding: 'utf8' },
);
if (deduplication.status !== 0) {
  throw new Error(deduplication.stderr || 'Visual image deduplication failed.');
}
const selectedImages = JSON.parse(deduplication.stdout);

const products = matches.map((match) => {
  const recordsByFile = new Map(
    manifest
      .filter((image) => image.productSlug === match.scrapedProductSlug)
      .map((image) => [image.localFile, image]),
  );
  const records = (selectedImages[match.scrapedProductSlug] || [])
    .map((localFile) => recordsByFile.get(localFile))
    .filter(Boolean)
    .slice(0, 8);

  const images = records.map((image, index) => {
    const sourceFile = image.duplicateOf || image.localFile;
    const extension = extname(sourceFile).toLowerCase() || '.jpg';
    const filename = `${String(index + 1).padStart(2, '0')}-${image.sha256.slice(0, 12)}${extension}`;
    const objectKey = `products/${match.catalogId}/${filename}`;

    return {
      order: index + 1,
      url: `${mediaOrigin}/${objectKey}`,
      alt: `${match.catalogName} experience in Krakow`,
      objectKey,
      sourceFile,
      mime: image.mime,
      sha256: image.sha256,
    };
  });

  return {
    productId: match.catalogId,
    slug: match.catalogSlug,
    name: match.catalogName,
    imageUrl: images[0]?.url || null,
    images,
    sourceMatch: {
      slug: match.scrapedProductSlug,
      score: match.score,
      originallyMatched: match.matched,
      manuallyApproved: !match.matched,
    },
  };
});

const mapping = {
  generatedAt: new Date().toISOString(),
  bucket: 'ktk-product-media',
  mediaOrigin,
  products,
  productsWithoutImages: products
    .filter((product) => !product.images.length)
    .map(({ productId, slug, name }) => ({ productId, slug, name })),
};

await writeFile(outputFile, `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  outputFile,
  products: products.length,
  mappedProducts: products.filter((product) => product.images.length).length,
  imageRelations: products.reduce((total, product) => total + product.images.length, 0),
  productsWithoutImages: mapping.productsWithoutImages.length,
}));
