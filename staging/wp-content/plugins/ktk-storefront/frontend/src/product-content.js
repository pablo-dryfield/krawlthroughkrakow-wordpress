const PRODUCT_CONTENT = {
  'bubble-football-43': {
    kicker: 'Private group activity',
    summary: 'Bounce, crash and laugh your way through Krakow in giant inflatable bubbles.',
    description:
      'Add a ridiculous twist to the world most popular game. Bubble Football is built for groups who want an active, easy-to-book experience with plenty of chaos and no football skills required.',
    highlights: [
      'Ideal for stag groups, birthdays and team events',
      'No football experience needed',
      'Indoor or outdoor setup depending on weather',
    ],
    gallery: [
      'https://d2j6dbq0eux0bg.cloudfront.net/images/100323031/products/637225330/4185643684.jpg',
      'https://d2j6dbq0eux0bg.cloudfront.net/images/100323031/products/637225330/4185643685.jpg',
      'https://d2j6dbq0eux0bg.cloudfront.net/images/100323031/products/637225330/4185643686.jpg',
    ],
    checkoutUrl: 'https://krawlthroughkrakow.com/store/Bubble-Football-p637225330',
  },
};

function compact(values) {
  return [...new Set(
    values.filter((value) => typeof value === 'string' && value.trim()),
  )];
}

export function getProductContent(product) {
  const mapped = PRODUCT_CONTENT[product.slug] ?? {};
  const configured = product.config?.content && typeof product.config.content === 'object'
    ? product.config.content
    : {};
  const apiImages = Array.isArray(product.images)
    ? product.images.map((image) => (typeof image === 'string' ? image : image?.url))
    : [];
  const gallery = compact([
    ...apiImages,
    product.imageUrl,
    ...(mapped.gallery ?? []),
  ]);

  return {
    kicker:
      configured.kicker ||
      product.kicker ||
      mapped.kicker ||
      product.productType?.name ||
      'Krakow experience',
    summary:
      configured.summary ||
      product.summary ||
      mapped.summary ||
      'A locally operated Krakow experience, ready to become the best part of your trip.',
    description:
      configured.description ||
      product.description ||
      mapped.description ||
      '',
    highlights:
      (Array.isArray(configured.highlights) && configured.highlights.length
        ? configured.highlights
        : Array.isArray(product.highlights) && product.highlights.length
          ? product.highlights
          : mapped.highlights) ?? [],
    importantInformation: Array.isArray(configured.importantInformation)
      ? compact(configured.importantInformation)
      : [],
    meetingPoint:
      configured.meetingPoint && typeof configured.meetingPoint === 'object'
        ? {
          name: String(configured.meetingPoint.name || '').trim(),
          address: String(configured.meetingPoint.address || '').trim(),
          instructions: String(configured.meetingPoint.instructions || '').trim(),
          mapUrl: String(configured.meetingPoint.mapUrl || '').trim(),
        }
        : null,
    gallery,
    checkoutUrl:
      product.checkoutUrl ||
      mapped.checkoutUrl ||
      'https://krawlthroughkrakow.com/store',
  };
}
