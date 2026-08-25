const { requireOwner } = require('../lib/auth');

module.exports = async (sock, msg) => {
  if (!await requireOwner(sock, msg)) return;
  const jid = msg.key.remoteJid;
  const c = msg.message?.extendedTextMessage?.contextInfo;
  const quotedKey = c?.stanzaId ? {
    remoteJid: jid,
    fromMe: !!c.participant ? false : false,
    id: c.stanzaId,
    participant: c.participant
  } : null;
  try {
    if (quotedKey) {
      await sock.sendMessage(jid, { delete: quotedKey });
      return;
    }
    await sock.sendMessage(jid, { delete: msg.key });
  } catch (e) {
    await sock.sendMessage(jid, { text: '❌ Clear failed. Reply to a message and use .clear.' }, { quoted: msg });
  }
};
