const unavailable = (reason) => ({ available: false, reason });

// Follow the configured experience date; ISO weekdays are Monday1 through Sunday7.
export function evaluateAddonAvailability(config, experienceDate) {
  const rules = config?.availability;
  if (rules === undefined) return { available: true, reason: 'available' };
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)
    || (rules.enabled !== undefined && typeof rules.enabled !== 'boolean')) {
    return unavailable('invalid_rule');
  }
  if (rules.enabled === false) return unavailable('disabled');
  if (rules.daysOfWeek === undefined) return { available: true, reason: 'available' };
  const days = rules.daysOfWeek;
  if (!Array.isArray(days) || !days.length || days.length > 7
    || days.some(day => !Number.isInteger(day) || day < 1 || day > 7)
    || new Set(days).size !== days.length) return unavailable('invalid_rule');
  const date = typeof experienceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(experienceDate)
    ? new Date(`${experienceDate}T00:00:00.000Z`) : null;
  if (!date || !Number.isFinite(date.getTime())
    || date.toISOString().slice(0, 10) !== experienceDate) return unavailable('date_required');
  return days.includes(date.getUTCDay() || 7)
    ? { available: true, reason: 'available' } : unavailable('weekday');
}
