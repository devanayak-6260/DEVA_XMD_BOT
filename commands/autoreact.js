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
      text: `╭━━〔 ❤️ AUTO REACT SETTINGS 〕━━╮\n┃\n┃ Current : ${list}\n┃\n┃ Set    : .autoreact ❤️ 🔥 👍\n┃ Reset  : .autoreact default\n┃\n╰━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }

  if (raw.toLowerCase() === 'default') {
    config.customReactEmoji = [];
    settings.save();
    return sock.sendMessage(jid, { text: '╭━━〔 ❤️ AUTO REACT 〕━━╮\n┃\n┃ Status : RESET TO DEFAULT ✅\n┃\n╰━━━━━━━━━━━━━━━━━╯' }, { quoted: msg });
  }

  const emojis = [...new Set(Array.from(raw).filter(ch => /\p{Extended_Pictographic}/u.test(ch)))];
  if (!emojis.length) {
    return sock.sendMessage(jid, { text: '╭━━〔 ⚠️ INVALID EMOJI 〕━━╮\n┃ Send one or more emojis.\n┃ Example : .autoreact ❤️ 🔥 👍\n╰━━━━━━━━━━━━━━━━━━━━━╯' }, { quoted: msg });
  }

  config.customReactEmoji = emojis.slice(0, 20);
  settings.save();
  await sock.sendMessage(jid, {
    text: `╭━━〔 ❤️ AUTO REACT UPDATED 〕━━╮\n┃\n┃ Reactions : ${config.customReactEmoji.join(' ')}\n┃ Status    : ENABLED 🟢\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯`
  }, { quoted: msg });
};
