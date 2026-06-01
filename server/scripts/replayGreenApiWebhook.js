const DEFAULT_URL = 'http://localhost:3000/api/webhook/whatsapp';

const normalizePhone = (value = '') => String(value).replace(/[^\d]/g, '');

const args = process.argv.slice(2);
const asPhoneSent = args.includes('--phone-sent');
const filteredArgs = args.filter((arg) => arg !== '--phone-sent');
const [rawPhone, ...messageParts] = filteredArgs;
const phone = normalizePhone(rawPhone);
const message = messageParts.join(' ').trim() || 'A B C';
const url = process.env.REPLAY_WEBHOOK_URL || DEFAULT_URL;

if (!phone) {
  console.error('Usage: npm run replay:webhook -- 919876543210 "A B C"');
  console.error('Manual phone-sent shape: npm run replay:webhook -- --phone-sent 919876543210 "A B C"');
  process.exit(1);
}

const payload = {
  typeWebhook: asPhoneSent ? 'outgoingMessageReceived' : 'incomingMessageReceived',
  instanceData: {
    idInstance: 7103000000,
    wid: '70009876543@c.us',
    typeInstance: 'whatsapp'
  },
  timestamp: Math.floor(Date.now() / 1000),
  idMessage: `LOCAL_REPLAY_${Date.now()}`,
  senderData: {
    chatId: `${phone}@c.us`,
    sender: asPhoneSent ? '70009876543@c.us' : `${phone}@c.us`,
    senderName: 'Local replay',
    senderContactName: 'Local replay',
    chatName: 'Local replay'
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: {
      textMessage: message
    }
  }
};

const main = async () => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log(`Webhook replay posted to ${url}`);
  console.log(`HTTP ${response.status} ${response.statusText}`);
  console.log(`Shape: ${asPhoneSent ? 'outgoingMessageReceived' : 'incomingMessageReceived'}`);
  console.log(`Phone: ${phone}`);
  console.log(`Message: ${message}`);
};

main().catch((error) => {
  console.error(`Webhook replay failed: ${error.message}`);
  process.exit(1);
});
