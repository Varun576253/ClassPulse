const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const getServerPort = () => process.env.PORT || process.env.API_PORT || 3000;
const devPortFile = path.join(__dirname, '..', '..', '.classpulse-web-port');
const readDevPort = () => {
  try {
    const value = fs.readFileSync(devPortFile, 'utf8').trim();
    return /^\d+$/.test(value) ? value : null;
  } catch (_) {
    return null;
  }
};
const getClientPort = () => process.env.CLIENT_PORT || process.env.WEB_PORT || readDevPort() || 5000;
const hasBuiltClient = () => fs.existsSync(path.join(__dirname, '..', '..', 'dist', 'index.html'));

const getDefaultBaseUrl = () =>
  process.env.APP_BASE_URL
  || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
  || `http://localhost:${hasBuiltClient() ? getServerPort() : getClientPort()}`;

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

module.exports = { buildQuizQr, getClientPort, getDefaultBaseUrl, getServerPort };
