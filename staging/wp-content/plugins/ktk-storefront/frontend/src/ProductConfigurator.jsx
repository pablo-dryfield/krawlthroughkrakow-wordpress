import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { evaluateProductAvailability, normalizeAvailabilityConfig } from './availability';
import { resolveBookingSectionOrder } from './booking-sections';
import { sameCartExperience } from './cart-experiences';
const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const selectedDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const weekdayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function storefrontConfig(item) {
  return {
    ...(item?.storefrontConfig || {}),
    ...(item?.config || {}),
  };
}

function selectionMode(config) {
  return String(config?.selectionMode || 'boolean').trim().toLowerCase();
}

function addonEmoji(name) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('cocktail')) return '\uD83C\uDF79';
  if (normalized.includes('t-shirt') || normalized.includes('tshirt')) return '\uD83D\uDC55';
  if (
    normalized.includes('photo')
    || normalized.includes('camera')
    || normalized.includes('picture')
  ) return '\uD83D\uDCF8';
  return '';
}

function parsedCollection(value) {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function configEntries(value, keyName) {
  const collection = parsedCollection(value);
  if (Array.isArray(collection)) return collection;
  if (!collection || typeof collection !== 'object') return [];

  return Object.entries(collection).map(([key, item]) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return { [keyName]: key, ...item };
    }
    return { [keyName]: key, price: item };
  });
}

function configValues(value) {
  const collection = parsedCollection(value);
  if (Array.isArray(collection)) return collection;
  if (!collection || typeof collection !== 'object') return [];

  return Object.entries(collection).map(([key, item]) => {
    if (typeof item === 'boolean') return item ? key : null;
    if (item && typeof item === 'object') {
      return item.value ?? item.quantity ?? item.time ?? key;
    }
    return item ?? key;
  }).filter((item) => item !== null && item !== false && item !== '');
}

function configQuantities(value) {
  const collection = parsedCollection(value);
  if (Array.isArray(collection)) {
    return collection
      .map((item) => (item && typeof item === 'object'
        ? item.quantity ?? item.value
        : item))
      .filter((item) => item !== undefined && item !== null && item !== '');
  }
  if (!collection || typeof collection !== 'object') return [];

  return Object.entries(collection)
    .filter(([, item]) => item !== false && item !== null)
    .map(([key, item]) => (item && typeof item === 'object'
      ? item.quantity ?? item.value ?? key
      : key));
}

function rangeQuantities(config) {
  const minimum = Math.max(1, Math.trunc(numeric(
    config.minQuantity
      ?? config.minimumQuantity
      ?? config.quantityMin
      ?? config.rangeMin
      ?? config.minimum
      ?? config.min,
    1,
  )));
  const maximum = Math.max(minimum, Math.trunc(numeric(
    config.maxQuantity
      ?? config.maximumQuantity
      ?? config.quantityMax
      ?? config.rangeMax
      ?? config.maximum
      ?? config.max,
    minimum,
  )));

  return Array.from(
    { length: Math.min(maximum - minimum + 1, 1000) },
    (_, index) => minimum + index,
  );
}

export function resolveAddonMaxQuantity(addon, participantQuantity) {
  const config = storefrontConfig(addon);
  const rawConfiguredMaximum = Number(config.maxQuantity);
  const configuredMaximum = Number.isInteger(rawConfiguredMaximum)
    && rawConfiguredMaximum > 0
    ? rawConfiguredMaximum
    : null;
  const hasPerAttendeeLimit = addon?.maxPerAttendee !== null
    && addon?.maxPerAttendee !== undefined
    && addon?.maxPerAttendee !== '';
  const perAttendeeMaximum = hasPerAttendeeLimit
    ? Math.max(
      0,
      Math.floor(numeric(addon.maxPerAttendee) * Math.max(0, numeric(participantQuantity))),
    )
    : null;

  if (configuredMaximum !== null && perAttendeeMaximum !== null) {
    return Math.min(configuredMaximum, perAttendeeMaximum);
  }
  return configuredMaximum ?? perAttendeeMaximum ?? Math.max(50, numeric(participantQuantity));
}

function addonPrice(addon, quantity, value) {
  const config = storefrontConfig(addon);
  const tier = configEntries(config.quantityPrices, 'quantity').find(
    (item) => numeric(item.quantity) === numeric(quantity),
  );
  const option = configEntries(config.options, 'value')
    .find((item) => String(item.value) === String(value));
  const unitPrice = numeric(addon.price?.amount ?? addon.amount);

  if (tier) return numeric(tier.price);
  if (option) return numeric(option.price);
  if (selectionMode(config) === 'boolean') return quantity ? unitPrice : 0;
  return unitPrice * numeric(quantity);
}

function initialAddonValues(product, item) {
  const selected = new Map((item?.addons || []).map((addon) => [String(addon.addonId), addon]));
  return Object.fromEntries((product.addons || []).map((addon) => {
    const current = selected.get(String(addon.id));
    const mode = selectionMode(storefrontConfig(addon));
    if (mode === 'options') return [addon.id, current?.value ?? ''];
    return [addon.id, numeric(current?.quantity)];
  }));
}

function initialAddonVariantQuantities(product, item) {
  const selected = new Map((item?.addons || []).map((addon) => [String(addon.addonId), addon]));
  return Object.fromEntries((product.addons || []).map((addon) => {
    const current = selected.get(String(addon.id));
    const savedVariants = new Map(
      (Array.isArray(current?.variants) ? current.variants : [])
        .map((variant) => [String(variant.value), numeric(variant.quantity)]),
    );
    const quantities = Object.fromEntries(
      availableAddonVariants(addon).map((variant) => [
        String(variant.value),
        savedVariants.get(String(variant.value)) || 0,
      ]),
    );

    // Preserve carts created while variants were represented by a single value.
    if (current?.value && Object.hasOwn(quantities, String(current.value))) {
      quantities[String(current.value)] = numeric(current.quantity);
    }
    return [addon.id, quantities];
  }));
}

function availableAddonVariants(addon) {
  const variants = Array.isArray(addon.inventory?.variants) ? addon.inventory.variants : [];

  return variants.filter((variant) => {
    if (!variant || variant.value === undefined || variant.value === null) return false;
    if (variant.inStock === false) return false;
    if (variant.availableQuantity === null || variant.availableQuantity === undefined) return true;
    return numeric(variant.availableQuantity) > 0;
  });
}

function addonRequiresVariant(addon) {
  return addon?.inventory?.variantSelectionRequired === true;
}

function Stepper({ value, min = 0, max = 99, onChange, label }) {
  return (
    <div className="ktk-config-stepper" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Remove ${label}`}>
        {'\u2212'}
      </button>
      <output>{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Add ${label}`}>
        +
      </button>
    </div>
  );
}

export function CustomSelect({
  value,
  options,
  onChange,
  label,
  field,
  className = '',
  searchable = false,
  invalid = false,
  describedBy,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => String(option.value) === String(value)),
  );
  const selected = options[selectedIndex];
  const visibleOptions = searchable && search
    ? options.filter((option) => String(option.searchText || option.label)
      .toLowerCase()
      .includes(search.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const chooseAdjacent = (offset) => {
    const nextIndex = Math.min(options.length - 1, Math.max(0, selectedIndex + offset));
    onChange(options[nextIndex].value);
  };

  return (
    <div className={`ktk-custom-select ${className}`.trim()} ref={rootRef}>
      <button
        className={`ktk-custom-select__trigger${open ? ' is-open' : ''}`}
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${selected?.label ?? ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        data-config-field={field}
        onClick={() => {
          setSearch('');
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            chooseAdjacent(event.key === 'ArrowDown' ? 1 : -1);
          }
        }}
      >
        <span>{selected?.label ?? ''}</span>
        <i aria-hidden="true" />
      </button>
      {open && (
        <div className="ktk-custom-select__options" role="listbox" aria-label={label}>
          {searchable && (
            <div className="ktk-custom-select__search">
              <input
                type="search"
                value={search}
                autoFocus
                aria-label={`Search ${label}`}
                placeholder="Search country or code"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          )}
          {visibleOptions.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                className={active ? 'is-selected' : ''}
                type="button"
                role="option"
                aria-selected={active}
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                {option.label}
              </button>
            );
          })}
          {visibleOptions.length === 0 && (
            <p className="ktk-custom-select__empty">No countries found</p>
          )}
        </div>
      )}
    </div>
  );
}

function QuantitySelect({
  value,
  min = 0,
  max = 99,
  onChange,
  label,
  field,
}) {
  const safeMin = Math.max(0, Math.trunc(numeric(min)));
  const safeMax = Math.max(safeMin, Math.trunc(numeric(max, safeMin)));

  const options = Array.from(
    { length: safeMax - safeMin + 1 },
    (_, index) => safeMin + index,
  ).map((quantity) => ({ value: quantity, label: String(quantity) }));

  return (
    <CustomSelect
      className="ktk-config-quantity-select"
      value={value}
      options={options}
      onChange={(quantity) => onChange(numeric(quantity))}
      label={label}
      field={field}
    />
  );
}

function DatePicker({
  value,
  onChange,
  getDateAvailability = () => ({ available: true }),
  onUnavailableDate = () => {},
}) {
  const today = useMemo(() => {
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), current.getDate());
  }, []);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = value ? dateFromKey(value) : today;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const rootRef = useRef(null);
  const selectedDate = value ? dateFromKey(value) : null;
  const firstWeekday = (visibleMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const isCurrentMonth = visibleMonth.getFullYear() === today.getFullYear()
    && visibleMonth.getMonth() === today.getMonth();
  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const monday = new Date(2024, 0, 1 + index);
      return weekdayFormatter.format(monday).slice(0, 2);
    }),
    [],
  );

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const moveMonth = (offset) => {
    setVisibleMonth((current) => new Date(
      current.getFullYear(),
      current.getMonth() + offset,
      1,
    ));
  };

  return (
    <div className="ktk-date-picker" ref={rootRef}>
      <button
        className={`ktk-date-picker__trigger${open ? ' is-open' : ''}`}
        type="button"
        data-config-field="date"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedDate ? selectedDateFormatter.format(selectedDate) : 'Pick a date'}</span>
        <i aria-hidden="true" />
      </button>

      {open && (
        <div className="ktk-date-picker__popover" role="dialog" aria-label="Choose an activity date">
          <div className="ktk-date-picker__header">
            <button
              type="button"
              disabled={isCurrentMonth}
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
            >
              {'\u2190'}
            </button>
            <strong>{monthFormatter.format(visibleMonth)}</strong>
            <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>
              {'\u2192'}
            </button>
          </div>
          <div className="ktk-date-picker__weekdays" aria-hidden="true">
            {weekdayLabels.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="ktk-date-picker__days">
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const candidate = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth(),
                day,
              );
              const key = localDateKey(candidate);
              const disabled = candidate < today;
              const availability = getDateAvailability(key);
              const unavailable = !disabled && availability?.available === false;
              const redirects = unavailable && Boolean(
                availability?.redirectProductSlug || availability?.redirectUrl,
              );
              const availabilityHint = unavailable
                ? availability?.message || 'This date is unavailable for this experience.'
                : '';
              return (
                <button
                  className={[
                    key === value ? 'is-selected' : '',
                    key === localDateKey(today) ? 'is-today' : '',
                    unavailable ? 'is-unavailable' : '',
                    redirects ? 'is-redirect' : '',
                  ].filter(Boolean).join(' ')}
                  type="button"
                  disabled={disabled}
                  aria-disabled={unavailable || undefined}
                  aria-label={[
                    selectedDateFormatter.format(candidate),
                    availabilityHint,
                    redirects ? 'View related experience.' : '',
                  ].filter(Boolean).join('. ')}
                  aria-pressed={key === value}
                  key={key}
                  onClick={() => {
                    if (unavailable) {
                      onUnavailableDate(availability);
                      setOpen(false);
                      return;
                    }
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductConfigurator({
  product,
  initialItem = null,
  cartItems = [],
  onSubmit,
  onJourneyEvent = () => {},
  submitLabel = 'Add to cart',
  money,
  additionalFields = null,
  onAvailabilityRedirect = () => {},
}) {
  const config = useMemo(() => ({
    participantMode: 'quantity',
    minParticipants: 1,
    maxParticipants: 50,
    dateRequired: true,
    timeMode: 'manual',
    fullNameRequired: true,
    emailRequired: true,
    phoneRequired: true,
    ...storefrontConfig(product),
  }), [product]);
  const availabilityConfig = useMemo(() => normalizeAvailabilityConfig(config), [config]);
  const dateMode = availabilityConfig?.dateMode || 'flexible';
  const fixedDate = availabilityConfig?.fixedDate || '';
  const initialParticipants = initialItem?.options?.participants || {};
  const [participants, setParticipants] = useState(
    numeric(initialItem?.quantity, numeric(config.minParticipants, 1)),
  );
  const [men, setMen] = useState(numeric(initialParticipants.men));
  const [women, setWomen] = useState(numeric(initialParticipants.women));
  const [date, setDate] = useState(
    dateMode === 'fixed' && fixedDate ? fixedDate : (initialItem?.experienceDate || ''),
  );
  const [time, setTime] = useState(
    initialItem?.experienceTime || config.defaultStartTime || '',
  );
  const [addons, setAddons] = useState(() => initialAddonValues(product, initialItem));
  const [addonVariantQuantities, setAddonVariantQuantities] = useState(
    () => initialAddonVariantQuantities(product, initialItem),
  );
  const [addonVariantError, setAddonVariantError] = useState(null);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [activeAddonInfo, setActiveAddonInfo] = useState(null);
  const configuratorRef = useRef(null);
  const addonInfoCloseRef = useRef(null);
  const addonInfoTriggerRef = useRef(null);

  const totalParticipants = config.participantMode === 'gender_split'
    ? men + women
    : participants;
  const resolvedExperienceTime = config.timeMode === 'fixed'
    ? config.defaultStartTime
    : time;
  const resolvedExperienceDate = dateMode === 'fixed' ? fixedDate : date;
  const existingSelection = cartItems.find(item => sameCartExperience(item, {
    productId: product.id, experienceDate: resolvedExperienceDate || null,
    experienceTime: resolvedExperienceTime || null, product,
  }));
  const loadedSelectionKey = useRef(initialItem?.key || null);
  useEffect(() => {
    if (!existingSelection) { loadedSelectionKey.current = null; return; }
    if (loadedSelectionKey.current === existingSelection.key) return;
    loadedSelectionKey.current = existingSelection.key;
    setParticipants(numeric(existingSelection.quantity, numeric(config.minParticipants, 1)));
    setMen(numeric(existingSelection.options?.participants?.men));
    setWomen(numeric(existingSelection.options?.participants?.women));
    setAddons(initialAddonValues(product, existingSelection));
    setAddonVariantQuantities(initialAddonVariantQuantities(product, existingSelection));
    setAddonVariantError(null);
  }, [existingSelection, config.minParticipants, product]);
  const selectedAvailability = useMemo(
    () => evaluateProductAvailability(config, {
      experienceDate: resolvedExperienceDate,
      experienceTime: resolvedExperienceTime,
    }),
    [config, resolvedExperienceDate, resolvedExperienceTime],
  );

  const handleUnavailableDate = (availability) => {
    if (availability?.redirectProductSlug || availability?.redirectUrl) {
      onAvailabilityRedirect(availability);
      return;
    }
    setAvailabilityMessage(
      availability?.message || 'This date is unavailable for this experience.',
    );
  };

  useEffect(() => {
    if (dateMode === 'fixed' && fixedDate && date !== fixedDate) {
      setDate(fixedDate);
      setAvailabilityMessage('');
    }
  }, [date, dateMode, fixedDate]);

  useEffect(() => {
    if (!resolvedExperienceDate || selectedAvailability.available) return;

    if (dateMode !== 'fixed') setDate('');
    if (selectedAvailability.redirectProductSlug || selectedAvailability.redirectUrl) {
      onAvailabilityRedirect(selectedAvailability);
      return;
    }

    setAvailabilityMessage(
      selectedAvailability.message || 'This date is unavailable for this experience.',
    );
  }, [
    dateMode,
    onAvailabilityRedirect,
    resolvedExperienceDate,
    selectedAvailability.available,
    selectedAvailability.message,
    selectedAvailability.redirectProductSlug,
    selectedAvailability.redirectUrl,
  ]);

  useEffect(() => {
    setAddons((current) => {
      let changed = false;
      const next = { ...current };
      (product.addons || []).forEach((addon) => {
        const maximum = resolveAddonMaxQuantity(addon, totalParticipants);
        const selected = numeric(current[addon.id]);
        if (selected > maximum) {
          next[addon.id] = maximum;
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setAddonVariantQuantities((current) => {
      let changed = false;
      const next = { ...current };
      (product.addons || []).forEach((addon) => {
        if (!addonRequiresVariant(addon)) return;
        let remaining = resolveAddonMaxQuantity(addon, totalParticipants);
        const currentQuantities = current[addon.id] || {};
        const nextQuantities = { ...currentQuantities };
        availableAddonVariants(addon).forEach((variant) => {
          const key = String(variant.value);
          const selected = numeric(currentQuantities[key]);
          const clamped = Math.min(selected, remaining);
          remaining -= clamped;
          if (clamped !== selected) {
            nextQuantities[key] = clamped;
            changed = true;
          }
        });
        next[addon.id] = nextQuantities;
      });
      return changed ? next : current;
    });
  }, [product.addons, totalParticipants]);

  useEffect(() => {
    if (!activeAddonInfo) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    addonInfoCloseRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setActiveAddonInfo(null);
      window.requestAnimationFrame(() => addonInfoTriggerRef.current?.focus());
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeAddonInfo]);

  const openAddonInfo = (addon, trigger) => {
    addonInfoTriggerRef.current = trigger;
    setActiveAddonInfo(addon);
  };

  const closeAddonInfo = () => {
    setActiveAddonInfo(null);
    window.requestAnimationFrame(() => addonInfoTriggerRef.current?.focus());
  };

  const baseTotal = numeric(product.price?.amount) * totalParticipants;
  const extrasTotal = (product.addons || []).reduce(
    (total, addon) => total + addonPrice(
      addon,
      addons[addon.id],
      addons[addon.id],
    ),
    0,
  );
  const updateAddon = (addonId, value) => {
    const previousValue = addons[addonId];
    setAddons((current) => ({ ...current, [addonId]: value }));

    const addon = (product.addons || []).find(
      (candidate) => String(candidate.id) === String(addonId),
    );
    onJourneyEvent('addon_changed', {
      productId: product.id,
      productSlug: product.slug,
      addonId: addon?.id ?? addonId,
      addonName: addon?.name || 'Add-on',
      previousValue: previousValue ?? 0,
      newValue: value ?? 0,
    });
    if (!addonRequiresVariant(addon)) return;

    if (!numeric(value)) {
      setAddonVariantQuantities((current) => ({
        ...current,
        [addonId]: Object.fromEntries(
          availableAddonVariants(addon).map((variant) => [String(variant.value), 0]),
        ),
      }));
    }
    setAddonVariantError((current) => (
      String(current) === String(addonId) ? null : current
    ));
  };

  const updateAddonVariantQuantity = (addonId, variantValue, quantity) => {
    const previousValue = addonVariantQuantities[addonId]?.[variantValue] ?? 0;
    setAddonVariantQuantities((current) => ({
      ...current,
      [addonId]: {
        ...(current[addonId] || {}),
        [variantValue]: numeric(quantity),
      },
    }));
    setAddonVariantError((current) => (
      String(current) === String(addonId) ? null : current
    ));
    const addon = (product.addons || []).find(
      (candidate) => String(candidate.id) === String(addonId),
    );
    onJourneyEvent('addon_variant_changed', {
      productId: product.id,
      productSlug: product.slug,
      addonId,
      addonName: addon?.name || 'Add-on',
      variant: variantValue,
      previousValue,
      newValue: numeric(quantity),
    });
  };

  const updateParticipants = (participantType, previousValue, nextValue, setter) => {
    setter(nextValue);
    onJourneyEvent('participant_changed', {
      productId: product.id,
      productSlug: product.slug,
      participantType,
      previousValue,
      newValue: numeric(nextValue),
    });
  };

  const validate = () => {
    if (totalParticipants < numeric(config.minParticipants, 1)) {
      return { field: 'participants', message: `Choose at least ${numeric(config.minParticipants, 1)} participant(s).` };
    }
    if (totalParticipants > numeric(config.maxParticipants, 50)) {
      return { field: 'participants', message: `This booking supports up to ${numeric(config.maxParticipants, 50)} participants.` };
    }
    if (dateMode === 'fixed' && !fixedDate) {
      return { field: 'date', message: 'This experience date is not configured yet.' };
    }
    if ((dateMode === 'allowed_dates' || config.dateRequired) && !resolvedExperienceDate) {
      return { field: 'date', message: 'Choose an activity date.' };
    }
    if (config.timeMode !== 'fixed' && !time) return { field: 'time', message: 'Choose an activity time.' };
    if (!selectedAvailability.available) {
      return {
        field: 'date',
        message: selectedAvailability.message || 'This date is unavailable for this experience.',
      };
    }
    const missingVariant = (product.addons || []).find((addon) => {
      const quantity = numeric(addons[addon.id]);
      if (!quantity || !addonRequiresVariant(addon)) return false;
      const assignedQuantity = availableAddonVariants(addon).reduce(
        (total, variant) => total + numeric(
          addonVariantQuantities[addon.id]?.[String(variant.value)],
        ),
        0,
      );
      return assignedQuantity !== quantity;
    });
    if (missingVariant) {
      return {
        addonId: missingVariant.id,
        field: `addon-variant-${missingVariant.id}`,
        message: `Choose an available size for ${missingVariant.name}.`,
      };
    }
    return null;
  };

  const submit = () => {
    const validationError = validate();
    if (validationError) {
      setAvailabilityMessage(validationError.field === 'date' ? validationError.message : '');
      setAddonVariantError(validationError.addonId ?? null);
      const field = configuratorRef.current?.querySelector(
        `[data-config-field="${validationError.field}"]`,
      );
      if (field) {
        field.focus({ preventScroll: true });
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const selectedAddons = (product.addons || []).flatMap((addon) => {
      const mode = selectionMode(storefrontConfig(addon));
      const selected = addons[addon.id];
      if (mode === 'options') {
        return selected ? [{ addonId: addon.id, value: selected, quantity: 1 }] : [];
      }
      const quantity = numeric(selected);
      const variants = addonRequiresVariant(addon)
        ? availableAddonVariants(addon).flatMap((variant) => {
          const variantQuantity = numeric(
            addonVariantQuantities[addon.id]?.[String(variant.value)],
          );
          return variantQuantity > 0
            ? [{ value: variant.value, quantity: variantQuantity }]
            : [];
        })
        : [];
      return quantity > 0 ? [{
        addonId: addon.id,
        quantity,
        ...(addonRequiresVariant(addon) ? { variants } : {}),
      }] : [];
    });

    onSubmit({
      key: initialItem?.key || `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      product,
      quantity: totalParticipants,
      experienceDate: resolvedExperienceDate || null,
      experienceTime: config.timeMode === 'fixed' ? config.defaultStartTime : (time || null),
      addons: selectedAddons,
      estimatedTotal: baseTotal + extrasTotal,
      currency: product.price?.currency || 'PLN',
      options: {
        ...(config.participantMode === 'gender_split'
          ? { participants: { men, women } }
          : {}),
      },
    });
  };

  const sectionOrder = resolveBookingSectionOrder(config.sectionOrder);
  const sectionRenderers = {
    group_size: () => (config.participantMode === 'gender_split' ? (
      <div className="ktk-configurator__split">
        <label>
          <span>Men</span>
          <QuantitySelect
            value={men}
            max={Math.max(0, numeric(config.maxParticipants, 50) - women)}
            onChange={(value) => updateParticipants('men', men, value, setMen)}
            label="Number of men"
            field="participants"
          />
        </label>
        <label>
          <span>Women</span>
          <QuantitySelect
            value={women}
            max={Math.max(0, numeric(config.maxParticipants, 50) - men)}
            onChange={(value) => updateParticipants('women', women, value, setWomen)}
            label="Number of women"
            field="participants"
          />
        </label>
      </div>
    ) : (
      <div className="ktk-configurator__participant">
        <div>
          <strong>Participants</strong>
          <small>{money.format(numeric(product.price?.amount))} each</small>
        </div>
        <QuantitySelect
          value={participants}
          min={numeric(config.minParticipants, 1)}
          max={numeric(config.maxParticipants, 50)}
          onChange={(value) => updateParticipants('participants', participants, value, setParticipants)}
          label="participants"
          field="participants"
        />
      </div>
    )),
    date_time: () => (
      <>
        <div className="ktk-configurator__schedule">
          <label>
            <span>Activity date</span>
            {dateMode === 'fixed' ? (
              <div
                className="ktk-configurator__fixed-date"
                data-config-field="date"
                tabIndex={-1}
              >
                <strong>
                  {fixedDate ? selectedDateFormatter.format(dateFromKey(fixedDate)) : 'Date to be confirmed'}
                </strong>
                <small>Fixed event date</small>
              </div>
            ) : (
              <DatePicker
                value={date}
                onChange={(value) => {
                  setDate(value);
                  setAvailabilityMessage('');
                  onJourneyEvent('experience_date_changed', {
                    productId: product.id,
                    productSlug: product.slug,
                    previousValue: date || null,
                    newValue: value || null,
                  });
                }}
                getDateAvailability={(value) => evaluateProductAvailability(config, {
                  experienceDate: value,
                  experienceTime: resolvedExperienceTime,
                })}
                onUnavailableDate={handleUnavailableDate}
              />
            )}
          </label>
          <label>
            <span>Start time</span>
            {config.timeMode === 'fixed' ? (
              <div className="ktk-configurator__fixed-time">
                <strong>{config.defaultStartTime || 'To be confirmed'}</strong>
              </div>
            ) : config.timeMode === 'select' ? (
              <CustomSelect
                value={time}
                options={[
                  { value: '', label: 'Choose a time' },
                  ...configValues(config.startTimes)
                    .map((startTime) => ({ value: startTime, label: String(startTime) })),
                ]}
                onChange={(value) => {
                  setTime(value);
                  setAvailabilityMessage('');
                  onJourneyEvent('experience_time_changed', {
                    productId: product.id,
                    productSlug: product.slug,
                    previousValue: time || null,
                    newValue: value || null,
                  });
                }}
                label="Start time"
                field="time"
              />
            ) : (
              <input
                type="time"
                data-config-field="time"
                value={time}
                onChange={(event) => {
                  const value = event.target.value;
                  setTime(value);
                  setAvailabilityMessage('');
                  onJourneyEvent('experience_time_changed', {
                    productId: product.id,
                    productSlug: product.slug,
                    previousValue: time || null,
                    newValue: value || null,
                  });
                }}
              />
            )}
          </label>
        </div>
        {availabilityMessage && (
          <p className="ktk-configurator__availability-message" role="alert">
            {availabilityMessage}
          </p>
        )}
      </>
    ),
    contact_details: () => additionalFields,
    addons: () => ((product.addons || []).length > 0 ? (
      <fieldset className="ktk-configurator__addons">
        <legend>Add-Ons</legend>
        {(product.addons || []).map((addon) => {
          const addonConfig = storefrontConfig(addon);
          const mode = selectionMode(addonConfig);
          const value = addons[addon.id];
          const emoji = addonEmoji(addon.name);
          const requiresVariant = addonRequiresVariant(addon);
          const quantity = numeric(value);
          const eligibleVariants = requiresVariant
            ? availableAddonVariants(addon)
            : [];
          const assignedVariantQuantity = eligibleVariants.reduce(
            (total, variant) => total + numeric(
              addonVariantQuantities[addon.id]?.[String(variant.value)],
            ),
            0,
          );
          const maximumQuantity = resolveAddonMaxQuantity(addon, totalParticipants);
          const variantErrorId = `addon-variants-error-${addon.id}`;
          const hasAddonInfo = Boolean(addon.description || addon.imageUrl);
          return (
            <div className="ktk-configurator__addon" key={addon.id}>
              <div>
                <div className="ktk-configurator__addon-title">
                  <strong>
                    {emoji && <span className="ktk-configurator__addon-emoji" aria-hidden="true">{emoji}</span>}
                    {addon.name}
                  </strong>
                  {hasAddonInfo && (
                    <button
                      className="ktk-configurator__addon-info-button"
                      type="button"
                      aria-label={`More information about ${addon.name}`}
                      aria-haspopup="dialog"
                      aria-controls={`ktk-addon-info-${addon.id}`}
                      title={`More information about ${addon.name}`}
                      onClick={(event) => openAddonInfo(addon, event.currentTarget)}
                    >
                      <span aria-hidden="true">i</span>
                    </button>
                  )}
                </div>
              </div>
              {mode === 'boolean' ? (
                <button
                  className={numeric(value) ? 'is-active' : ''}
                  type="button"
                  aria-pressed={Boolean(numeric(value))}
                  onClick={() => updateAddon(addon.id, numeric(value) ? 0 : 1)}
                >
                  {numeric(value) ? 'Added' : `+ ${money.format(numeric(addon.price?.amount ?? addon.amount))}`}
                </button>
              ) : mode === 'options' ? (
                <CustomSelect
                  value={value || ''}
                  options={[
                    { value: '', label: 'None' },
                    ...configEntries(addonConfig.options, 'value').map((option) => ({
                      value: option.value,
                      label: `${option.label || option.value}${numeric(option.price) ? ` (+${money.format(numeric(option.price))})` : ''}`,
                    })),
                  ]}
                  onChange={(selected) => updateAddon(addon.id, selected)}
                  label={addon.name}
                />
              ) : mode === 'range' ? (
                <CustomSelect
                  value={numeric(value)}
                  options={[
                    { value: 0, label: 'None' },
                    ...rangeQuantities(addonConfig)
                      .filter((quantity) => quantity <= maximumQuantity)
                      .map((quantity) => ({
                      value: quantity,
                      label: `${quantity} (+${money.format(addonPrice(addon, quantity, quantity))})`,
                    })),
                  ]}
                  onChange={(selected) => updateAddon(addon.id, numeric(selected))}
                  label={addon.name}
                />
              ) : configQuantities(addonConfig.allowedQuantities).length > 0 ? (
                <CustomSelect
                  value={numeric(value)}
                  options={[
                    { value: 0, label: 'None' },
                    ...configQuantities(addonConfig.allowedQuantities)
                      .map((quantity) => numeric(quantity))
                      .filter((quantity) => quantity > 0 && quantity <= maximumQuantity)
                      .map((quantity) => ({
                      value: quantity,
                      label: `${quantity} (+${money.format(addonPrice(addon, quantity, quantity))})`,
                    })),
                  ]}
                  onChange={(selected) => updateAddon(addon.id, numeric(selected))}
                  label={addon.name}
                />
              ) : (
                <Stepper
                  value={numeric(value)}
                  max={maximumQuantity}
                  onChange={(quantity) => updateAddon(addon.id, quantity)}
                  label={addon.name}
                />
              )}
              {requiresVariant && quantity > 0 && (
                <div className="ktk-configurator__addon-variants">
                  <div className="ktk-configurator__addon-variants-heading">
                    <span>Sizes</span>
                    <small>{assignedVariantQuantity} / {quantity} assigned</small>
                  </div>
                  <div className="ktk-configurator__addon-variants-grid">
                    {eligibleVariants.map((variant, index) => {
                      const variantValue = String(variant.value);
                      const selectedQuantity = numeric(
                        addonVariantQuantities[addon.id]?.[variantValue],
                      );
                      const availableQuantity = variant.availableQuantity === null
                        || variant.availableQuantity === undefined
                        ? quantity
                        : numeric(variant.availableQuantity);
                      const maximum = Math.min(quantity, availableQuantity);
                      return (
                        <div className="ktk-configurator__addon-variant" key={variantValue}>
                          <span>{variant.label || variantValue}</span>
                          <CustomSelect
                            className="ktk-configurator__addon-variant-quantity"
                            value={selectedQuantity}
                            options={Array.from(
                              { length: maximum + 1 },
                              (_, optionQuantity) => ({
                                value: optionQuantity,
                                label: String(optionQuantity),
                              }),
                            )}
                            onChange={(selected) => updateAddonVariantQuantity(
                              addon.id,
                              variantValue,
                              selected,
                            )}
                            label={`${variant.label || variantValue} T-shirt quantity`}
                            field={index === 0 ? `addon-variant-${addon.id}` : undefined}
                            invalid={String(addonVariantError) === String(addon.id)}
                            describedBy={variantErrorId}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {String(addonVariantError) === String(addon.id) && (
                    <small className="ktk-field-error" id={variantErrorId} role="alert">
                      Assign exactly {quantity} T-shirt{quantity === 1 ? '' : 's'} across the sizes.
                    </small>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </fieldset>
    ) : null),
  };

  return (
    <div className="ktk-configurator" ref={configuratorRef}>
      <div className="ktk-configurator__heading">
        <div>
          <h2>{product.name}</h2>
        </div>
      </div>

      {sectionOrder.map((section) => (
        <React.Fragment key={section}>
          {sectionRenderers[section]?.()}
        </React.Fragment>
      ))}

      {activeAddonInfo && typeof document !== 'undefined' && createPortal(
        <div
          className="ktk-addon-info-modal__backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAddonInfo();
          }}
        >
          <section
            className="ktk-addon-info-modal"
            id={`ktk-addon-info-${activeAddonInfo.id}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`ktk-addon-info-title-${activeAddonInfo.id}`}
          >
            <button
              className="ktk-addon-info-modal__close"
              type="button"
              ref={addonInfoCloseRef}
              aria-label="Close add-on information"
              onClick={closeAddonInfo}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            {activeAddonInfo.imageUrl && (
              <div className="ktk-addon-info-modal__media">
                <img
                  src={activeAddonInfo.imageUrl}
                  alt={`${activeAddonInfo.name} add-on`}
                  decoding="async"
                />
              </div>
            )}
            <div className="ktk-addon-info-modal__content">
              <p className="ktk-addon-info-modal__eyebrow">Add-on details</p>
              <h3 id={`ktk-addon-info-title-${activeAddonInfo.id}`}>
                {activeAddonInfo.name}
              </h3>
              {activeAddonInfo.description && (
                <p className="ktk-addon-info-modal__description">
                  {activeAddonInfo.description}
                </p>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}

      <div className="ktk-configurator__total">
        <span>Estimated total</span>
        <strong>{money.format(baseTotal + extrasTotal)}</strong>
      </div>
      <button className="ktk-booking__cta" type="button" onClick={submit}>
        {existingSelection ? 'Update booking' : submitLabel} <span aria-hidden="true">{'\u2192'}</span>
      </button>
    </div>
  );
}
