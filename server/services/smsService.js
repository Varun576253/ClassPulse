const twilio = require('twilio');
const { toE164 } = require('../utils/phone');
const { greenApiReady, sendWhatsAppText } = require('./whatsappService');

const smsReady = () => Boolean(
  process.env.TWILIO_ACCOUNT_SID
  && process.env.TWILIO_AUTH_TOKEN
  && process.env.TWILIO_SMS_FROM
);

const sendSms = async (phone, body) => {
  if (!smsReady()) {
    if (!greenApiReady()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Password reset delivery is not configured. Contact your administrator to set up SMS or WhatsApp.');
      }
      console.warn('[sms] No SMS/WhatsApp configured. Logging message to console (development only):');
      console.warn(`[sms] TO: ${phone}`);
      console.warn(`[sms] MESSAGE: ${body}`);
      return { channel: 'console' };
    }

    await sendWhatsAppText(phone, body);
    return { channel: 'whatsapp' };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    to: toE164(phone),
    from: process.env.TWILIO_SMS_FROM,
    body
  });
  return { channel: 'sms' };
};

module.exports = {
  smsReady,
  sendSms
};
