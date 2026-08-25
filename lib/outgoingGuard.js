// Tracks messages actually sent by this bot so self-chat can distinguish
// bot-generated messages from messages typed manually by the owner.
const ids = new Set();
const signatures = new Map();

function remember(jid, text, id) {
  if (id) {
    ids.add(String(id));
    setTimeout(() => ids.delete(String(id)), 120000);
  }
  if (jid && text) {
    const key = `${jid}|${String(text).trim()}`;
    signatures.set(key, Date.now());
    setTimeout(() => {
      if (signatures.get(key) && Date.now() - signatures.get(key) >= 115000) signatures.delete(key);
    }, 120000);
  }
}

function isBotMessage(msg) {
  const id = msg?.key?.id;
  if (id && ids.has(String(id))) return true;
  const jid = msg?.key?.remoteJid;
  const text = String(
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption || ''
  ).trim();
  if (!jid || !text) return false;
  const key = `${jid}|${text}`;
  return signatures.has(key);
}

function install(sock) {
  if (sock.__devaOutgoingGuardInstalled) return;
  const original = sock.sendMessage.bind(sock);
  sock.sendMessage = async (jid, content, options) => {
    const sent = await original(jid, content, options);
    const text = content?.text || content?.caption || '';
    remember(jid, text, sent?.key?.id);
    return sent;
  };
  sock.__devaOutgoingGuardInstalled = true;
}

module.exports = { install, remember, isBotMessage };
