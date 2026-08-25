const config = require('../config');
const settings = require('../lib/settings');
const { requireOwner } = require('../lib/auth');

module.exports = async (sock, msg, args = []) => {
  if (!await requireOwner(sock, msg)) return;
  const jid = msg.key.remoteJid;
  const raw = args.join(' ').trim();

  if (!raw) {
    const list = Array.isArray(config.customReactEmoji) && config.customReactEmoji.length
      ? config.customReactEmoji.join(' ')
      : config.reactEmoji.join(' ');
    return sock.sendMessage(jid, {
      text: `❤️ CUSTOM AUTO REACT\n\nCurrent: ${list}\n\nUse: .autoreact ❤️ 🔥 👍\nReset: .autoreact default`
    }, { quoted: msg });
  }

  if (raw.toLowerCase() === 'default') {
    config.customReactEmoji = [];
    settings.save();
    return sock.sendMessage(jid, { text: '✅ Custom auto reactions reset to default.' }, { quoted: msg });
  }

  const emojis = [...new Set(Array.from(raw).filter(ch => /\p{Extended_Pictographic}/u.test(ch)))];
  if (!emojis.length) {
    return sock.sendMessage(jid, { text: '❌ Send emoji(s). Example: .autoreact ❤️ 🔥 👍' }, { quoted: msg });
  }

  config.customReactEmoji = emojis.slice(0, 20);
  settings.save();
  await sock.sendMessage(jid, {
    text: `✅ Custom auto reactions set:\n${config.customReactEmoji.join(' ')}`
  }, { quoted: msg });
};
