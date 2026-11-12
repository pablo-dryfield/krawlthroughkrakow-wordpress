export function cartItemJourneySnapshot(item, cartPosition, itemTotal = item?.estimatedTotal) {
  const itemNumber = Number(item?.cartItemNumber);
  const normalizedPosition = Number(cartPosition);
  const total = Number(itemTotal);
  const productAddons = item?.product?.addons || [];
  return {
    cartItemId: String(item?.key || ''),
    cartItemNumber: Number.isInteger(itemNumber) && itemNumber > 0
      ? itemNumber
      : (Number.isInteger(normalizedPosition) && normalizedPosition > 0 ? normalizedPosition : null),
    cartPosition: Number.isInteger(normalizedPosition) && normalizedPosition > 0
      ? normalizedPosition
      : null,
    productId: item?.productId ?? null,
    productSlug: item?.productSlug || item?.product?.slug || '',
    productName: item?.productName || item?.product?.name || 'Experience',
    quantity: Number(item?.quantity) || 0,
    experienceDate: item?.experienceDate || null,
    experienceTime: item?.experienceTime || null,
    participants: item?.options?.participants || null,
    addons: (item?.addons || []).map((selected) => {
      const addon = productAddons.find(
        (candidate) => String(candidate.id) === String(selected.addonId),
      );
      return {
        addonId: selected.addonId,
        name: addon?.name || selected.name || 'Add-on',
        quantity: Number(selected.quantity) || 0,
        value: selected.value || null,
        variants: (selected.variants || []).map((variant) => ({
          value: variant.value,
          quantity: Number(variant.quantity) || 0,
        })),
      };
    }),
    itemTotal: Number.isFinite(total) ? total : null,
    currency: item?.currency || item?.product?.price?.currency || 'PLN',
  };
}

export function nextCartItemNumber(cart) {
  return cart.reduce(
    (maximum, item) => Math.max(maximum, Number(item?.cartItemNumber) || 0),
    0,
  ) + 1;
}
