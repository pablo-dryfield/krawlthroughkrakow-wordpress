import PRODUCT_CONTENT from '../../includes/product-content-fallbacks.json' with { type: 'json' };

function compact(values) {
  return [...new Set(
    values.filter((value) => typeof value === 'string' && value.trim()),
  )];
}

export function getPastCampaign(product, today) {
  const campaign = PRODUCT_CONTENT[product.slug]?.pastCampaign;
  if (!campaign || Number(product.id) !== campaign.productId) return null;
  const availability = product.config?.availability;
  const dates = availability?.allowedDates;
  if (availability?.dateMode !== 'allowed_dates' || !Array.isArray(dates)
    || dates.length !== campaign.lastDates.length
    || !campaign.lastDates.every((date) => dates.includes(date))) return null;
  const day = today ?? new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)
    || campaign.lastDates.some((date) => date >= day)) return null;
  if (availability.dateOverrides && !Array.isArray(availability.dateOverrides)) return null;
  if (availability.dateOverrides?.some((rule) => rule.enabled !== false
    && !['blocked', 'closed'].includes(rule.mode) && rule.date >= day)) return null;
  return campaign;
}

export function getProductContent(product) {
  const mapped = PRODUCT_CONTENT[product.slug] ?? {};
  const pastCampaign = getPastCampaign(product);
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
      pastCampaign?.summary ||
      configured.summary ||
      product.summary ||
      mapped.summary ||
      'A locally operated Krakow experience, ready to become the best part of your trip.',
    description:
      pastCampaign?.description ||
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
    pastCampaign,
  };
}
