import { config } from '../config.js';

export interface NormalizedPhone {
  raw: string;
  e164: string;
  countryCode: string;
  nationalNumber: string;
  jid: string;
  isValid: boolean;
}

/**
 * Normalizes phone numbers with special focus on Indian (+91) 10-digit mobile numbers,
 * while supporting arbitrary international numbers complying with E.164.
 */
export function normalizePhoneNumber(input: string, defaultCountry = config.DEFAULT_COUNTRY_CODE): NormalizedPhone {
  if (!input) {
    return { raw: '', e164: '', countryCode: '', nationalNumber: '', jid: '', isValid: false };
  }

  // Strip spaces, dashes, parentheses, dots
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  let countryCode = defaultCountry;
  let nationalNumber = cleaned;

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      countryCode = '91';
      nationalNumber = cleaned.substring(2);
    } else {
      countryCode = cleaned.substring(0, cleaned.length > 10 ? cleaned.length - 10 : 2);
      nationalNumber = cleaned.substring(countryCode.length);
    }
  } else if (cleaned.startsWith('0') && cleaned.length === 11 && defaultCountry === '91') {
    // Indian trunk prefix 0
    nationalNumber = cleaned.substring(1);
    countryCode = '91';
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    countryCode = '91';
    nationalNumber = cleaned.substring(2);
  } else if (cleaned.length === 10 && defaultCountry === '91') {
    nationalNumber = cleaned;
    countryCode = '91';
  }

  // Validate standard Indian mobile: 10 digits starting with 6, 7, 8, or 9
  const isIndianMobile = countryCode === '91' && /^[6-9]\d{9}$/.test(nationalNumber);
  const isGenericValid = /^\d{7,14}$/.test(nationalNumber);

  const isValid = countryCode === '91' ? isIndianMobile : isGenericValid;
  const e164 = `+${countryCode}${nationalNumber}`;
  const jid = `${countryCode}${nationalNumber}@s.whatsapp.net`;

  return {
    raw: input,
    e164,
    countryCode,
    nationalNumber,
    jid,
    isValid,
  };
}

export function jidToPhoneNumber(jid: string): string {
  if (!jid) return '';
  const num = jid.split('@')[0].split(':')[0];
  return `+${num}`;
}
