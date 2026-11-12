import { getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/min';

function internationalPhone(value) {
  const entered = String(value || '').trim();
  if (!entered) return '';
  if (entered.startsWith('00')) return `+${entered.slice(2).replace(/\D/g, '')}`;
  if (entered.includes('+')) return `+${entered.slice(entered.indexOf('+') + 1).replace(/\D/g, '')}`;
  return '';
}

export function normalizePhoneInput(value, currentCountry = '') {
  const international = internationalPhone(value);
  if (international) {
    const parsed = parsePhoneNumberFromString(international);
    if (parsed?.country) {
      return {
        phoneCountry: parsed.country,
        phone: parsed.nationalNumber,
      };
    }

    return {
      phoneCountry: currentCountry,
      phone: international,
    };
  }

  return {
    phoneCountry: currentCountry,
    phone: String(value || '').replace(/\D/g, ''),
  };
}

export function normalizeContactPhone(contact = {}) {
  return {
    ...contact,
    ...normalizePhoneInput(contact.phone, contact.phoneCountry),
  };
}

export function phoneForApi(phone, countryCode) {
  const entered = String(phone || '').trim();
  if (!entered) return '';

  const international = internationalPhone(entered);
  if (international) {
    return parsePhoneNumberFromString(international)?.number || international;
  }

  if (!countryCode) return entered.replace(/\D/g, '');

  try {
    const parsed = parsePhoneNumberFromString(entered, countryCode);
    return parsed?.number || `+${getCountryCallingCode(countryCode)}${entered.replace(/\D/g, '')}`;
  } catch {
    return entered.replace(/\D/g, '');
  }
}
