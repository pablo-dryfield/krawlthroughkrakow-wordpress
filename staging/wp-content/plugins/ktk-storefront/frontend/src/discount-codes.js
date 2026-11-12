export function singleDiscountCode(value) {
  const codes = (Array.isArray(value) ? value : [value])
    .filter((code) => typeof code === 'string')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  return codes.slice(-1);
}
