import IMAGE_SIZES from '../../includes/product-image-sizes.json' with { type: 'json' };

// Keep catalog/API image URLs as the fallback. Only the reviewed product and
// exact original photo URLs have local size candidates.
export function responsiveProductImage(productId, imageUrl, role, assetBaseUrl) {
  if (productId !== IMAGE_SIZES.productId && productId !== String(IMAGE_SIZES.productId)) return {};
  if (typeof imageUrl !== 'string' || !Object.hasOwn(IMAGE_SIZES.images, imageUrl)
    || !Object.hasOwn(IMAGE_SIZES.sizes, role)) return {};
  if (typeof assetBaseUrl !== 'string' || /[\s,]/.test(assetBaseUrl) || !assetBaseUrl.endsWith('/')) return {};
  let base;
  try { base = new URL(assetBaseUrl); } catch { return {}; }
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) return {};

  const image = IMAGE_SIZES.images[imageUrl];
  return {
    srcSet: [...image.variants.map(({path, width}) => `${base.href}${path} ${width}w`), `${imageUrl} ${image.width}w`].join(', '),
    sizes: IMAGE_SIZES.sizes[role],
    width: image.width,
    height: image.height,
  };
}
