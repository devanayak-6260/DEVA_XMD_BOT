const commands = require('./commands');
const autoFeatures = require('./auto');
const { attach } = require('./antiDelete');
const settings = require('./settings');
const messageStore = require('./messageStore');
const { makeCardQuote } = require('./cardReply');

module.exports = async function connect(sock) {
  settings.load();

  // Give every text reply the same DEVA XMD-BOT contact-card preview used by .ping.
  // Media/reaction/delete messages are left untouched.
  if (!sock.__devaCardReplyPatch) {
    const originalSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options = {}) => {
      if (content?.text && !content?.edit) {
        const safeOptions = { ...options, quoted: makeCardQuote(options.quoted) };
        return originalSendMessage(jid, content, safeOptions);
      }
      return originalSendMessage(jid, content, options);
    };
    sock.__devaCardReplyPatch = true;
  }
  const seenMessages = new Map();
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Ignore history/synthetic events and process only live notifications.
    if (type && type !== 'notify') return;
    for (const msg of messages || []) {
      if (!msg?.message || msg?.requestId) continue;
      const messageId = msg?.key?.id;
      if (messageId) {
        if (seenMessages.has(messageId)) continue;
        seenMessages.set(messageId, Date.now());
        if (seenMessages.size > 500) {
          const oldest = seenMessages.keys().next().value;
          seenMessages.delete(oldest);
        }
      }
      messageStore.remember(msg);
      // Do not block the upsert loop on network-heavy command handlers.
      Promise.resolve(commands(sock, msg)).catch((e) => {
        console.log('Command Error:', e?.stack || e?.message || e);
      });
    }
  });
  attach(sock);
  await autoFeatures(sock);
  console.log('Bot handlers loaded ✅');
};
