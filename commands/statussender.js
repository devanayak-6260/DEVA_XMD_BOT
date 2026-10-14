const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function isStatusSenderRequest(text) {
  return /^(?:send|send me|send video|send photo|send status|send the status|send it)$/i.test(String(text || '').trim());
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    else if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else break;
  }
  return current || null;
}

async function sendLatestStatus(sock, jid, status) {
  const content = unwrapMessage(status?.message) || status?.message;
  if (!content) throw new Error('No saved status is available');
  if (typeof content.conversation === 'string') {
    await sock.sendMessage(jid, { text: content.conversation });
  } else if (content.extendedTextMessage?.text) {
    await sock.sendMessage(jid, { text: content.extendedTextMessage.text });
  } else if (content.imageMessage) {
    const media = content.imageMessage;
    const buffer = await streamToBuffer(await downloadContentFromMessage(media, 'image'));
    await sock.sendMessage(jid, { image: buffer, caption: media.caption || undefined });
  } else if (content.videoMessage) {
    const media = content.videoMessage;
    const buffer = await streamToBuffer(await downloadContentFromMessage(media, 'video'));
    await sock.sendMessage(jid, { video: buffer, caption: media.caption || undefined, mimetype: media.mimetype || 'video/mp4' });
  } else {
    throw new Error('This status type is not supported');
  }
}

module.exports = { isStatusSenderRequest, sendLatestStatus };
