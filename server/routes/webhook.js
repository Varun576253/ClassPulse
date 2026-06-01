const express = require('express');
const { receiveWhatsappResponse } = require('../controllers/whatsappController');

const router = express.Router();

router.post('/', receiveWhatsappResponse);
router.post('/whatsapp', receiveWhatsappResponse);
router.post('/greenapi', receiveWhatsappResponse);

router.get('/whatsapp', (req, res) => {
  res.json({
    success: true,
    service: 'ClassPulse WhatsApp webhook',
    accepts: ['POST /api/webhook/whatsapp', 'POST /api/webhook', 'POST /webhook/whatsapp', 'POST /']
  });
});

module.exports = router;
