export const BOOKING_SECTION_ORDER = [
  'date_time',
  'group_size',
  'contact_details',
  'addons',
];

export function resolveBookingSectionOrder(value) {
  const seen = new Set();
  const normalized = (Array.isArray(value) ? value : [])
    .filter((section) => BOOKING_SECTION_ORDER.includes(section))
    .filter((section) => {
      if (seen.has(section)) return false;
      seen.add(section);
      return true;
    });

  return [
    ...normalized,
    ...BOOKING_SECTION_ORDER.filter((section) => !seen.has(section)),
  ];
}
