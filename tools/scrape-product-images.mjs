#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_STORE_URL = "https://krawlthroughkrakow.com/store/";
const DEFAULT_CATALOG_URL =
  "https://krawlthroughkrakow.com/staging/wp-json/ktk-storefront/v1/products";
const DEFAULT_OUTPUT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  "..",
  "photo-library",
);
const USER_AGENT =
  "KTK image migration/1.0 (+https://krawlthroughkrakow.com)";
const CONCURRENCY = 4;

function getArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

function decodeHtml(value) {
  return value
    .replaceAll("\\/", "/")
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/")
    .replace(/&quot;/g, '"');
}

function slugify(value) {
  return decodeURIComponent(value)
    .toLowerCase()
    .replace(/-p\d+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function productIdFromUrl(url) {
  return url.match(/-p(\d+)(?:[/?#]|$)/i)?.[1] ?? null;
}

function productSlugFromUrl(url) {
  const pathname = new URL(url).pathname;
  return slugify(pathname.split("/").filter(Boolean).at(-1) ?? "product");
}

function extractProductPages(html, storeUrl) {
  const normalized = decodeHtml(html);
  const paths =
    normalized.match(/\/store\/[A-Za-z0-9%_.~+\-]+-p\d+/g) ?? [];

  return [...new Set(paths)].map(
    (productPath) => new URL(productPath, storeUrl).href,
  );
}

function extractProductImages(html, productId) {
  const normalized = decodeHtml(html);
  const expression = new RegExp(
    `https?://d2j6dbq0eux0bg\\.cloudfront\\.net/images/100323031/products/${productId}/[^"'<>\\s?]+\\.(?:jpe?g|png|webp|avif)`,
    "gi",
  );

  return [...new Set(normalized.match(expression) ?? [])].map((url) =>
    url.replace(/[),.;]+$/, ""),
  );
}

function extractPageTitle(html, fallbackSlug) {
  const normalized = decodeHtml(html);
  const candidates = [
    normalized.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    )?.[1],
    normalized.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    )?.[1],
    normalized.match(/<title>([^<]+)<\/title>/i)?.[1],
  ];
  const title = candidates.find(Boolean);
  return title
    ? title.replace(/\s*[|\-]\s*Krawl Through Krakow.*$/i, "").trim()
    : fallbackSlug.replaceAll("-", " ");
}

function normalizeTokens(value) {
  const ignored = new Set([
    "a",
    "an",
    "and",
    "the",
    "with",
    "krakow",
    "normal",
    "package",
    "tour",
  ]);

  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((token) => token && !ignored.has(token)),
  );
}

function tokenScore(left, right) {
  const leftTokens = normalizeTokens(left);
  const rightTokens = normalizeTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

async function fetchWithTimeout(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": USER_AGENT,
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }

  return response;
}

async function mapConcurrent(items, limit, task) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function extensionFromMime(mime, sourceUrl) {
  const mimeExtensions = {
    "image/avif": ".avif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return (
    mimeExtensions[mime] ??
    path.extname(new URL(sourceUrl).pathname).toLowerCase() ??
    ".img"
  );
}

function csvCell(value) {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

const storeUrl = getArgument("--store-url", DEFAULT_STORE_URL);
const catalogUrl = getArgument("--catalog-url", DEFAULT_CATALOG_URL);
const outputDirectory = path.resolve(
  getArgument("--output", DEFAULT_OUTPUT),
);
const photosDirectory = path.join(outputDirectory, "products");

await mkdir(photosDirectory, { recursive: true });

console.log(`Discovering products from ${storeUrl}`);
const storeHtml = await (await fetchWithTimeout(storeUrl)).text();
const productPages = extractProductPages(storeHtml, storeUrl);

if (!productPages.length) {
  throw new Error(`No Ecwid product pages were discovered at ${storeUrl}`);
}

let catalogProducts = [];
try {
  const payload = await (await fetchWithTimeout(catalogUrl)).json();
  catalogProducts = Array.isArray(payload) ? payload : payload.products ?? [];
} catch (error) {
  console.warn(`Catalog matching skipped: ${error.message}`);
}

console.log(`Found ${productPages.length} product pages; inspecting galleries`);
const scrapedProducts = await mapConcurrent(
  productPages,
  CONCURRENCY,
  async (productPage, index) => {
    const productId = productIdFromUrl(productPage);
    const slug = productSlugFromUrl(productPage);
    const html = await (await fetchWithTimeout(productPage)).text();
    const imageUrls = extractProductImages(html, productId);

    console.log(
      `[${index + 1}/${productPages.length}] ${slug}: ${imageUrls.length} image(s)`,
    );

    return {
      productId,
      slug,
      name: extractPageTitle(html, slug),
      productPage,
      imageUrls,
    };
  },
);

const knownHashes = new Map();
const manifest = [];
const downloadJobs = scrapedProducts.flatMap((product) =>
  product.imageUrls.map((sourceUrl, imageIndex) => ({
    ...product,
    sourceUrl,
    imageIndex,
  })),
);

console.log(`Downloading ${downloadJobs.length} discovered image URLs`);
await mapConcurrent(downloadJobs, CONCURRENCY, async (job, index) => {
  const response = await fetchWithTimeout(job.sourceUrl);
  const bytes = Buffer.from(await response.arrayBuffer());
  const mime = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .toLowerCase();

  if (!mime.startsWith("image/")) {
    throw new Error(`Expected an image but received ${mime}: ${job.sourceUrl}`);
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  let localFile = knownHashes.get(sha256);
  let duplicateOf = null;

  if (!localFile) {
    const extension = extensionFromMime(mime, job.sourceUrl);
    const sourceStem =
      path.basename(new URL(job.sourceUrl).pathname, extension) ||
      String(job.imageIndex + 1);
    const productDirectory = path.join(photosDirectory, job.slug);
    const fileName = `${String(job.imageIndex + 1).padStart(2, "0")}--${sourceStem}${extension}`;
    const absoluteFile = path.join(productDirectory, fileName);

    await mkdir(productDirectory, { recursive: true });
    await writeFile(absoluteFile, bytes);
    localFile = path.relative(outputDirectory, absoluteFile).replaceAll("\\", "/");
    knownHashes.set(sha256, localFile);
  } else {
    duplicateOf = localFile;
  }

  manifest.push({
    productId: job.productId,
    productSlug: job.slug,
    productName: job.name,
    productPage: job.productPage,
    sourceUrl: job.sourceUrl,
    localFile,
    duplicateOf,
    bytes: bytes.length,
    mime,
    sha256,
  });

  if ((index + 1) % 10 === 0 || index + 1 === downloadJobs.length) {
    console.log(`Downloaded ${index + 1}/${downloadJobs.length}`);
  }
});

manifest.sort((left, right) =>
  `${left.productSlug}:${left.sourceUrl}`.localeCompare(
    `${right.productSlug}:${right.sourceUrl}`,
  ),
);

const catalogMatches = catalogProducts.map((catalogProduct) => {
  const ranked = scrapedProducts
    .map((scrapedProduct) => ({
      scrapedProduct,
      score: Math.max(
        tokenScore(catalogProduct.name ?? "", scrapedProduct.name),
        tokenScore(catalogProduct.slug ?? "", scrapedProduct.slug),
      ),
    }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];

  return {
    catalogId: catalogProduct.id,
    catalogSlug: catalogProduct.slug,
    catalogName: catalogProduct.name,
    matched: Boolean(best && best.score >= 0.5),
    score: best ? Number(best.score.toFixed(3)) : 0,
    scrapedProductId: best?.scrapedProduct.productId ?? null,
    scrapedProductSlug: best?.scrapedProduct.slug ?? null,
    scrapedProductName: best?.scrapedProduct.name ?? null,
    productPage: best?.scrapedProduct.productPage ?? null,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  sourceStore: storeUrl,
  sourceCatalog: catalogUrl,
  productPages: scrapedProducts.length,
  discoveredImageUrls: downloadJobs.length,
  uniqueImages: knownHashes.size,
  duplicateImages: downloadJobs.length - knownHashes.size,
  totalUniqueBytes: manifest
    .filter((item) => !item.duplicateOf)
    .reduce((total, item) => total + item.bytes, 0),
  productsWithoutImages: scrapedProducts
    .filter((product) => product.imageUrls.length === 0)
    .map((product) => product.slug),
  unmatchedCatalogProducts: catalogMatches
    .filter((match) => !match.matched)
    .map((match) => ({
      id: match.catalogId,
      slug: match.catalogSlug,
      name: match.catalogName,
      suggestedScrapedProduct: match.scrapedProductName,
      score: match.score,
    })),
};

const csvHeaders = [
  "productId",
  "productSlug",
  "productName",
  "productPage",
  "sourceUrl",
  "localFile",
  "duplicateOf",
  "bytes",
  "mime",
  "sha256",
];
const csv = [
  csvHeaders.map(csvCell).join(","),
  ...manifest.map((item) =>
    csvHeaders.map((header) => csvCell(item[header])).join(","),
  ),
].join("\n");

await Promise.all([
  writeFile(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  ),
  writeFile(path.join(outputDirectory, "manifest.csv"), `${csv}\n`),
  writeFile(
    path.join(outputDirectory, "catalog-matches.json"),
    `${JSON.stringify(catalogMatches, null, 2)}\n`,
  ),
  writeFile(
    path.join(outputDirectory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  ),
]);

console.log(JSON.stringify(summary, null, 2));
