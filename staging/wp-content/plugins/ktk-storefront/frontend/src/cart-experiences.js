export function cartExperienceKey(item) {
  const productId = Number(item?.productId ?? item?.product?.id);
  if (!Number.isSafeInteger(productId) || productId <= 0) return null;
  const config = { ...item.product?.storefrontConfig, ...item.product?.config };
  const date = item.experienceDate || config.availability?.fixedDate || null;
  const time = config.timeMode === 'fixed'
    ? config.defaultStartTime || null
    : item.experienceTime || config.defaultStartTime || null;
  return JSON.stringify([productId, date, time]);
}

export function sameCartExperience(left, right) {
  const key = cartExperienceKey(left);
  return key !== null && key === cartExperienceKey(right);
}

/** Replace the complete selection, retaining its stable journey identity and position. */
export function upsertCartExperience(cart, incoming, editingKey = null) {
  const indexes = cart.flatMap((item, index) => (
    (editingKey && item.key === editingKey) || sameCartExperience(item, incoming) ? [index] : []
  ));
  const previous = cart.find(item => editingKey && item.key === editingKey) ?? cart[indexes[0]] ?? null;
  const item = {
    ...incoming,
    key: previous?.key || (cart.some(row => row.key === incoming.key)
      ? `${incoming.productId}-${globalThis.crypto?.randomUUID?.() || Date.now()}` : incoming.key),
    cartItemNumber: previous?.cartItemNumber || incoming.cartItemNumber,
  };
  const anchor = indexes[0] ?? cart.length;
  const items = [];
  cart.forEach((row, index) => {
    if (index === anchor) items.push(item);
    if (!indexes.includes(index)) items.push(row);
  });
  if (anchor === cart.length) items.push(item);
  return { items, item, previous, index: anchor };
}

export function normalizeCartExperiences(cart) {
  return cart.reduce((items, item) => upsertCartExperience(items, item).items, []);
}
