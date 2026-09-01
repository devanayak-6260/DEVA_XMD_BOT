const { requireOwner } = require('../lib/auth');
const messageStore = require('../lib/messageStore');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async (sock, msg) => {
  if (!await requireOwner(sock, msg)) return;

  const jid = msg.key.remoteJid;
  // messageStore contains only messages sent by this WhatsApp account.
  // Incoming messages from other users are never targeted by .clear.
  const keys = messageStore.get(jid);

  let deleted = 0;
  for (const key of keys.reverse()) {
    try {
      await sock.sendMessage(jid, { delete: key });
      deleted++;
      await sleep(120);
    } catch (_) {
      // WhatsApp may reject deletion of messages outside its allowed window
      // or messages the account is not permitted to delete.
    }
  }

  messageStore.remove(jid, keys.map((k) => k.id));
  console.log(`[CLEAR] ${jid}: own-message delete attempts=${keys.length}, accepted=${deleted}`);
};
