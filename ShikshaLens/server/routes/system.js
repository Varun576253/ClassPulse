const express = require('express');
const { smsReady } = require('../services/smsService');
const { getGreenApiInstanceStatus, greenApiReady } = require('../services/whatsappService');

const router = express.Router();

const detectNgrokUrl = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 700);

  try {
    const response = await fetch(process.env.NGROK_API_URL || 'http://127.0.0.1:4040/api/tunnels', {
      signal: controller.signal
    });

    if (!response.ok) {
      return '';
    }

    const payload = await response.json();
    const tunnel = (payload.tunnels || []).find((item) => item.proto === 'https' && item.public_url);
    return tunnel?.public_url || '';
  } catch (_) {
    return '';
  } finally {
    clearTimeout(timeout);
  }
};

const getBaseUrl = async (req) => {
  if (process.env.PUBLIC_WEBHOOK_URL) {
    return process.env.PUBLIC_WEBHOOK_URL.replace(/\/$/, '');
  }

  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (replitDomain) {
    const domain = replitDomain.split(',')[0].trim();
    return `https://${domain}`;
  }

  const ngrokUrl = await detectNgrokUrl();
  if (ngrokUrl) {
    return ngrokUrl.replace(/\/$/, '');
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
};

const sameUrl = (left = '', right = '') =>
  String(left).replace(/\/+$/, '') === String(right).replace(/\/+$/, '');

router.get('/status', async (req, res) => {
  const greenApiConfigured = greenApiReady();
  const smsConfigured = smsReady();
  const baseUrl = await getBaseUrl(req);
  const webhookPath = '/api/webhook/whatsapp';
  const webhookUrl = `${baseUrl}${webhookPath}`;
  const greenApiStatus = await getGreenApiInstanceStatus();
  const configuredWebhookUrl = greenApiStatus.webhookUrl || '';
  const incomingWebhookEnabled = String(greenApiStatus.incomingWebhook || '').toLowerCase() === 'yes';
  const greenApiWebhookMatches = Boolean(configuredWebhookUrl) && sameUrl(configuredWebhookUrl, webhookUrl);
  const greenApiAuthorized = greenApiStatus.state === 'authorized';
  const webhookHealthy = greenApiConfigured
    && greenApiAuthorized
    && incomingWebhookEnabled
    && greenApiWebhookMatches;
  const missing = [
    ['GREENAPI_INSTANCE_ID', process.env.GREENAPI_INSTANCE_ID],
    ['GREENAPI_API_TOKEN', process.env.GREENAPI_API_TOKEN],
    ['TWILIO_ACCOUNT_SID', process.env.TWILIO_ACCOUNT_SID],
    ['TWILIO_AUTH_TOKEN', process.env.TWILIO_AUTH_TOKEN],
    ['TWILIO_SMS_FROM', process.env.TWILIO_SMS_FROM]
  ].filter(([, v]) => !v).map(([k]) => k);

  return res.json({
    success: true,
    status: {
      api: 'online',
      database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      geminiConfigured: Boolean(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      whatsappMode: 'greenapi',
      greenApiConfigured,
      greenApiStatusChecked: greenApiStatus.checked,
      greenApiStatusError: greenApiStatus.error || '',
      greenApiState: greenApiStatus.state || '',
      greenApiAuthorized,
      configuredWebhookUrl,
      incomingWebhookEnabled,
      greenApiWebhookMatches,
      webhookHealthy,
      realWhatsappReady: webhookHealthy,
      smsConfigured,
      passwordResetConfigured: smsConfigured || greenApiConfigured,
      passwordResetChannel: smsConfigured ? 'sms' : greenApiConfigured ? 'whatsapp' : 'none',
      missing,
      webhookPath,
      webhookUrl,
      fallbackWebhookUrls: [
        `${baseUrl}/api/webhook`,
        `${baseUrl}/webhook/whatsapp`,
        `${baseUrl}/`
      ]
    }
  });
});

module.exports = router;
