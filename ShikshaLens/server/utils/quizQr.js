const QRCode = require('qrcode');

const buildQuizQr = async (sessionId) => {
  const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || process.env.API_PORT || 5000}`;
  const quizUrl = `${baseUrl}/quiz?sessionId=${sessionId}`;
  const qrCode = await QRCode.toDataURL(quizUrl, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2
  });

  return { quizUrl, qrCode };
};

module.exports = {
  buildQuizQr
};
