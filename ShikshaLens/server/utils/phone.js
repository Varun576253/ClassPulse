const DEFAULT_COUNTRY_CODE = String(process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');

const digitsOnly = (value = '') => String(value)
  .replace('whatsapp:', '')
  .replace('@c.us', '')
  .replace(/[^\d+]/g, '')
  .replace(/^\+/, '')
  .replace(/\D/g, '');

const normalizePhone = (value = '') => {
  const phone = digitsOnly(value);

  if (DEFAULT_COUNTRY_CODE && /^\d{10}$/.test(phone)) {
    return `${DEFAULT_COUNTRY_CODE}${phone}`;
  }

  return phone;
};

const validatePhone = (value = '') => {
  const phone = normalizePhone(value);

  if (!/^\d{7,15}$/.test(phone)) {
    return {
      valid: false,
      error: 'Phone number must be 10 local digits or 7-15 digits with country code, for example 9876543210 or 919876543210.'
    };
  }

  return { valid: true, phone };
};

const toE164 = (value = '') => {
  const phone = normalizePhone(value);
  return phone ? `+${phone}` : '';
};

module.exports = {
  normalizePhone,
  validatePhone,
  toE164
};
