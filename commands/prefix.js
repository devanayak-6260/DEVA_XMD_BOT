const config = require('../config');
const settings = require('../lib/settings');
const { isOwner } = require('../lib/auth');

module.exports = async (sock, msg, args) => {
  if (!isOwner(msg)) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: '╭━━〔 🔐 ACCESS DENIED 〕━━╮\n┃ Only the owner can change prefix.\n╰━━━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }

  const next = args.join(' ').trim();

  if (!next) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: `╭━〔 🔧 PREFIX SETTINGS 〕━╮\n┃\n┃ Current : *${config.prefix}*\n┃\n┃ Use     : ${config.prefix}prefix <new-prefix>\n┃ Example : ${config.prefix}prefix !\n┃\n╰━━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }

  if (/\s/.test(next)) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: '╭━━〔 ⚠️ INVALID PREFIX 〕━━╮\n┃ Spaces are not allowed.\n┃ Examples : !  |  #  |  rt  |  deva\n╰━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }

  if (next.length > 30) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: '╭━━〔 ⚠️ PREFIX TOO LONG 〕━━╮\n┃ Maximum length : 30 characters\n╰━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }

  const oldPrefix = config.prefix;
  config.prefix = next;
  settings.save();

  return sock.sendMessage(msg.key.remoteJid, {
    text: `╭━〔 🔧 PREFIX UPDATED 〕━╮\n┃\n┃ Old : *${oldPrefix}*\n┃ New : *${config.prefix}*\n┃\n┃ Commands :\n┃ ${config.prefix}menu\n┃ ${config.prefix}statuslike\n┃ ${config.prefix}autoreact\n┃\n╰━━━━━━━━━━━━━━━╯`
  }, { quoted: msg });
};
