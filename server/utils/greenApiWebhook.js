const { normalizePhone } = require('./phone');

const INCOMING_WEBHOOK = 'incomingMessageReceived';
const PHONE_SENT_WEBHOOK = 'outgoingMessageReceived';
const SUPPORTED_MESSAGE_TYPES = new Set(['textMessage', 'extendedTextMessage', 'quotedMessage']);

const cleanChatId = (value = '') => String(value || '').trim();

const isPrivateChatId = (value = '') => /@c\.us$/i.test(cleanChatId(value));

const getIncomingText = (messageData = {}) => String(
  messageData?.textMessageData?.textMessage
  || messageData?.extendedTextMessageData?.text
  || messageData?.extendedTextMessageData?.description
  || messageData?.extendedTextMessageData?.caption
  || ''
).trim();

const getSenderPhone = (senderData = {}) => {
  const privateChatId = [senderData.sender, senderData.chatId]
    .map(cleanChatId)
    .find(isPrivateChatId);

  return normalizePhone(privateChatId || senderData.sender || senderData.chatId || '');
};

const getReplyPhone = (payload = {}) => {
  const senderData = payload.senderData || {};

  if (payload.typeWebhook === PHONE_SENT_WEBHOOK) {
    return normalizePhone(senderData.chatId || senderData.sender || '');
  }

  return getSenderPhone(senderData);
};

const parseGreenApiReply = (payload = {}) => {
  const typeWebhook = payload.typeWebhook;
  const messageData = payload.messageData || {};
  const typeMessage = messageData.typeMessage;

  if (![INCOMING_WEBHOOK, PHONE_SENT_WEBHOOK].includes(typeWebhook)) {
    return {
      accepted: false,
      reason: `ignored webhook type ${typeWebhook || 'unknown'}`
    };
  }

  if (!SUPPORTED_MESSAGE_TYPES.has(typeMessage)) {
    return {
      accepted: false,
      reason: `ignored message type ${typeMessage || 'unknown'}`
    };
  }

  const phone = getReplyPhone(payload);
  const body = getIncomingText(messageData);

  if (!phone) {
    return { accepted: false, reason: 'missing sender phone' };
  }

  if (!body) {
    return { accepted: false, reason: 'missing text body' };
  }

  return {
    accepted: true,
    phone,
    body,
    senderName: payload.senderData?.chatName || payload.senderData?.senderName || payload.senderData?.senderContactName || '',
    idMessage: payload.idMessage || '',
    source: typeWebhook === PHONE_SENT_WEBHOOK ? 'phone' : 'incoming',
    typeMessage
  };
};

module.exports = {
  getIncomingText,
  getReplyPhone,
  getSenderPhone,
  parseGreenApiReply
};
