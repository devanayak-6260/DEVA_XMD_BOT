const { getContentType } = require('@whiskeysockets/baileys');
const config = require('../config');

const cache = new Map();
const MAX = 500;

function remember(msg) {
  if (!msg?.key?.id || msg.key.remoteJid === 'status@broadcast' || !msg.message) return;
  cache.set(msg.key.id, { msg, time: Date.now() });
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
}

async function handleUpdate(sock, updates) {
  if (!config.antiDelete) return;
  for (const item of updates || []) {
    const protocol = item?.update?.message?.protocolMessage;
    if (!protocol || protocol.type !== 0 || !protocol.key?.id) continue;
    const old = cache.get(protocol.key.id)?.msg;
    if (!old) continue;
    const jid = protocol.key.remoteJid;
    try {
      const type = getContentType(old.message);
      let text = '🛡️ Anti-Delete: message deleted\n';
      if (type === 'conversation') text += `💬 ${old.message.conversation}`;
      else if (type === 'extendedTextMessage') text += `💬 ${old.message.extendedTextMessage.text || '[text]'}`;
      else text += `📦 Deleted ${type || 'message'}`;
      await sock.sendMessage(jid, { text });
    } catch (e) { console.log('Anti-delete error:', e?.message || e); }
    cache.delete(protocol.key.id);
  }
}

function attach(sock) {
  sock.ev.on('messages.upsert', ({ messages }) => { for (const m of messages || []) remember(m); });
  sock.ev.on('messages.update', updates => handleUpdate(sock, updates));
}
module.exports = { attach };
