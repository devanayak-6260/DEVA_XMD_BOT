const config = require('../config');
const settings = require('../lib/settings');
const { requireOwner } = require('../lib/auth');

function parseEmojis(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...segmenter.segment(text)]
      .map(x => x.segment.trim())
      .filter(x => x && /\p{Extended_Pictographic}/u.test(x));
  }
  return [...text].filter(x => /[\u{1F300}-\u{1FAFF}]/u.test(x));
}

module.exports = async (sock, msg, args = []) => {
  if (!(await requireOwner(sock, msg))) return;

  const jid = msg.key.remoteJid;
  const action = String(args[0] || '').toLowerCase();

  if (action === 'on' || action === 'off') {
    const enabled = action === 'on';
    settings.set('autoStatusLike', enabled);
    return sock.sendMessage(jid, {
      text: `╭━━〔 💙 STATUS LIKE 〕━━╮\n┃\n┃ Status : ${enabled ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n┃\n╰━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }

  if (action === 'emoji') {
    const raw = args.slice(1).join(' ').trim();
    if (!raw) {
      const current = Array.isArray(config.customStatusReaction) && config.customStatusReaction.length
        ? config.customStatusReaction.join(' ')
        : '❤️';
      return sock.sendMessage(jid, {
        text: `╭━━〔 💙 STATUS LIKE EMOJIS 〕━━╮\n┃\n┃ Current : ${current}\n┃\n┃ Use : .statuslike emoji 🔥💚💛\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯`
      }, { quoted: msg });
    }
    const emojis = parseEmojis(raw);
    if (!emojis.length) {
      return sock.sendMessage(jid, {
        text: '╭━━〔 ⚠️ INVALID EMOJI 〕━━╮\n┃ Please provide one or more emojis.\n┃ Example : .statuslike emoji ❤️💚💛\n╰━━━━━━━━━━━━━━━━━━━━━━╯'
      }, { quoted: msg });
    }
    settings.setCustom('customStatusReaction', emojis);
    return sock.sendMessage(jid, {
      text: `╭━━〔 💙 EMOJIS UPDATED 〕━━╮\n┃\n┃ Reactions : ${emojis.join(' ')}\n┃ Status    : ENABLED 🟢\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }

  // Direct syntax: .statuslike ❤️💚💛
  if (action && action !== 'on' && action !== 'off') {
    const raw = args.join(' ').trim();
    const emojis = parseEmojis(raw);
    if (!emojis.length) {
      return sock.sendMessage(jid, {
        text: '╭━━〔 ⚠️ INVALID EMOJI 〕━━╮\n┃ Please provide one or more emojis.\n┃ Example : .statuslike ❤️💚💛\n╰━━━━━━━━━━━━━━━━━━━━━━╯'
      }, { quoted: msg });
    }
    settings.setCustom('customStatusReaction', emojis);
    settings.set('autoStatusLike', true);
    return sock.sendMessage(jid, {
      text: `╭━━〔 💙 STATUS LIKE ACTIVATED 〕━━╮\n┃\n┃ Status  : ENABLED 🟢\n┃ Emojis  : ${emojis.join(' ')}\n┃ Mode    : ROTATION 🔄\n┃\n┃ One reaction is sent per viewed status.\n┃\n╰━━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }

  return sock.sendMessage(jid, {
    text: `╭━━〔 💙 STATUS LIKE SETTINGS 〕━━╮\n┃\n┃ Status : ${config.autoStatusLike ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n┃ Emojis : ${(Array.isArray(config.customStatusReaction) && config.customStatusReaction.length) ? config.customStatusReaction.join(' ') : '❤️'}\n┃\n┃ Commands :\n┃ • .statuslike on/off\n┃ • .statuslike ❤️💚💛\n┃ • .statuslike emoji 🔥\n┃\n╰━━━━━━━━━━━━━━━━━━━━━╯`
  }, { quoted: msg });
};
