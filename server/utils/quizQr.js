const QRCode = require('qrcode');

const getDefaultBaseUrl = () =>
  process.env.APP_BASE_URL
  || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
  || `http://localhost:${process.env.PORT || process.env.API_PORT || 5000}`;

const buildQuizQr = async (sessionId, overrideBaseUrl) => {
  const baseUrl = (overrideBaseUrl || getDefaultBaseUrl()).replace(/\/$/, '');
  const quizUrl = `${baseUrl}/quiz?sessionId=${sessionId}`;
  const qrCode = await QRCode.toDataURL(quizUrl, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2
  });
  return { quizUrl, qrCode };
};

module.exports = { buildQuizQr, getDefaultBaseUrl };
