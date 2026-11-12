const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const STORE_TIMEZONE = 'Europe/Warsaw';
export const DEFAULT_BOOKING_CUTOFF_MINUTES = 0;

function text(value, maxLength = 255) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function dateKey(value) {
  const normalized = text(value, 10);
  if (!DATE_PATTERN.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : normalized;
}

function timeKey(value) {
  const normalized = text(value, 5);
  return TIME_PATTERN.test(normalized) ? normalized : null;
}

function minuteValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(10080, Math.max(0, Math.trunc(parsed)));
}

function dateModeValue(value) {
  const normalized = text(value, 32).toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'fixed' || normalized === 'fixed_date') return 'fixed';
  if (
    normalized === 'allowed'
    || normalized === 'allowed_dates'
    || normalized === 'allowed_dates_only'
    || normalized === 'allowlist'
  ) {
    return 'allowed_dates';
  }
  if (normalized === 'flexible' || normalized === 'open') return 'flexible';
  return null;
}

function uniqueDateKeys(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map(dateKey).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return null;
  const date = dateKey(rule.date);
  if (!date) return null;
  const redirectProductId = Number(rule.redirectProductId);
  const redirectProductSlug = text(rule.redirectProductSlug, 160);
  const redirectUrl = text(rule.redirectUrl, 500);
  const reason = text(rule.reason, 300);
  return {
    date,
    ...(rule.enabled === false ? { enabled: false } : {}),
    ...(rule.mode ? { mode: text(rule.mode, 20).toLowerCase() } : {}),
    ...(minuteValue(rule.cutoffMinutes) !== null ? { cutoffMinutes: minuteValue(rule.cutoffMinutes) } : {}),
    ...(reason ? { reason } : {}),
    ...(Number.isInteger(redirectProductId) && redirectProductId > 0 ? { redirectProductId } : {}),
    ...(redirectProductSlug ? { redirectProductSlug } : {}),
    ...(redirectUrl ? { redirectUrl } : {}),
  };
}

export function normalizeAvailabilityConfig(config) {
  const source = config?.availability && typeof config.availability === 'object'
    ? config.availability
    : null;
  if (!source) return null;
  const fixedDate = dateKey(source.fixedDate ?? source.date);
  const allowedDates = uniqueDateKeys(source.allowedDates ?? source.availableDates);
  const explicitDateMode = dateModeValue(source.dateMode ?? source.bookingDateMode);
  const dateMode = explicitDateMode || (fixedDate ? 'fixed' : (allowedDates.length ? 'allowed_dates' : null));
  const cutoffMinutes = minuteValue(source.cutoffMinutes);
  const blockedDates = Array.isArray(source.blockedDates)
    ? source.blockedDates.map(normalizeRule).filter(Boolean)
    : [];
  const dateOverrides = Array.isArray(source.dateOverrides)
    ? source.dateOverrides.map(normalizeRule).filter(Boolean).map((rule) => ({
      ...rule,
      enabled: rule.enabled !== false,
      mode: rule.mode === 'blocked' || rule.mode === 'closed' ? 'blocked' : 'available',
    }))
    : [];

  if (
    !dateMode
    && !fixedDate
    && allowedDates.length === 0
    && cutoffMinutes === null
    && blockedDates.length === 0
    && dateOverrides.length === 0
  ) {
    return null;
  }
  return {
    ...(dateMode ? { dateMode } : {}),
    ...(fixedDate ? { fixedDate } : {}),
    ...(allowedDates.length ? { allowedDates } : {}),
    ...(cutoffMinutes !== null ? { cutoffMinutes } : {}),
    ...(blockedDates.length ? { blockedDates } : {}),
    ...(dateOverrides.length ? { dateOverrides } : {}),
  };
}

function displayDate(value) {
  const date = dateKey(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function partsInTimezone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return parts;
}

function zonedDateTimeToInstant(date, time, timeZone = STORE_TIMEZONE) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  try {
    const parts = partsInTimezone(guess, timeZone);
    const zonedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second || 0,
    );
    const offset = zonedAsUtc - guess.getTime();
    return new Date(guess.getTime() - offset);
  } catch {
    return new Date(`${date}T${time}:00`);
  }
}

function ruleRedirect(rule) {
  return {
    redirectProductId: rule?.redirectProductId ?? null,
    redirectProductSlug: rule?.redirectProductSlug ?? null,
    redirectUrl: rule?.redirectUrl ?? null,
  };
}

export function evaluateProductAvailability(config, {
  experienceDate,
  experienceTime,
  now = new Date(),
} = {}) {
  const availability = normalizeAvailabilityConfig(config);
  const cutoffMinutes = availability?.cutoffMinutes ?? DEFAULT_BOOKING_CUTOFF_MINUTES;
  const requestedDate = dateKey(experienceDate);
  const selectedDate = availability?.dateMode === 'fixed' && availability.fixedDate
    ? availability.fixedDate
    : requestedDate;
  const available = {
    available: true,
    reason: 'available',
    message: null,
    cutoffMinutes,
    redirectProductId: null,
    redirectProductSlug: null,
    redirectUrl: null,
  };
  if (availability?.dateMode === 'fixed') {
    if (!availability.fixedDate) {
      return {
        ...available,
        available: false,
        reason: 'fixed_date_mismatch',
        message: 'This experience does not have its fixed date configured yet.',
      };
    }
    if (requestedDate && requestedDate !== availability.fixedDate) {
      return {
        ...available,
        available: false,
        reason: 'fixed_date_mismatch',
        message: `This experience is only available on ${displayDate(availability.fixedDate)}.`,
      };
    }
  }

  if (!selectedDate) return available;

  if (availability?.dateMode === 'allowed_dates'
    && !(availability.allowedDates || []).includes(selectedDate)) {
    return {
      ...available,
      available: false,
      reason: 'not_allowed_date',
      message: 'This date is not available for this experience.',
    };
  }

  const override = (availability?.dateOverrides || []).find(
    (rule) => rule.enabled !== false && rule.date === selectedDate,
  );
  const blockedRule = (availability?.blockedDates || []).find((rule) => rule.date === selectedDate);
  if (override?.mode === 'blocked') {
    return {
      available: false,
      reason: 'blocked_date',
      message: override.reason || 'This date is unavailable for this experience.',
      cutoffMinutes: override.cutoffMinutes ?? cutoffMinutes,
      ...ruleRedirect(override),
    };
  }
  if (!override && blockedRule) {
    return {
      available: false,
      reason: 'blocked_date',
      message: blockedRule.reason || 'This date is unavailable for this experience.',
      cutoffMinutes,
      ...ruleRedirect(blockedRule),
    };
  }

  const effectiveCutoff = override?.cutoffMinutes ?? cutoffMinutes;
  const selectedTime = timeKey(experienceTime ?? config?.defaultStartTime);
  if (selectedTime && effectiveCutoff > 0) {
    const startAt = zonedDateTimeToInstant(selectedDate, selectedTime);
    const cutoffAt = new Date(startAt.getTime() - effectiveCutoff * 60 * 1000);
    if (now.getTime() >= cutoffAt.getTime()) {
      return {
        available: false,
        reason: 'cutoff',
        message: `Bookings for this time close ${effectiveCutoff} minutes before the start.`,
        cutoffMinutes: effectiveCutoff,
        ...ruleRedirect(override),
      };
    }
  }

  return {
    ...available,
    cutoffMinutes: effectiveCutoff,
  };
}
