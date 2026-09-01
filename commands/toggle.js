const config = require('../config');
const settings = require('../lib/settings');

const aliases = {
  statusseen: 'autoStatusSeen',
  react: 'autoReact',
  online: 'alwaysOnline',
  typing: 'autoTyping',
  recording: 'autoRecording',
  callreject: 'autoCallReject',
  antidelete: 'antiDelete'
};

module.exports = async (sock, msg, args = []) => {
  const name = String(args[0] || '').toLowerCase().replace(/^auto/, '');
  const key = aliases[name] || aliases[String(args[0] || '').toLowerCase()];
  if (!key) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: '╭━━〔 ⚙️ FEATURE CONTROL 〕━━╮\n┃\n┃ Usage : .on <feature> / .off <feature>\n┃\n┃ statusseen • react • online\n┃ typing • recording • callreject\n┃ antidelete\n┃\n╰━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }
  const action = String(args[1] || '').toLowerCase();
  const value = action === 'on' ? true : action === 'off' ? false : null;
  if (value === null) {
    return sock.sendMessage(msg.key.remoteJid, { text: `╭━━〔 ⚙️ FEATURE STATUS 〕━━╮\n┃\n┃ Feature : ${name.toUpperCase()}\n┃ Status  : ${config[key] ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n┃\n┃ Use : .on ${name} / .off ${name}\n┃\n╰━━━━━━━━━━━━━━━━╯` }, { quoted: msg });
  }
  settings.set(key, value);
  await sock.sendMessage(msg.key.remoteJid, { text: `╭━━〔 ⚙️ FEATURE UPDATED 〕━━╮\n┃\n┃ Feature : ${name.toUpperCase()}\n┃ Status  : ${value ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n┃\n╰━━━━━━━━━━━━━━━━━━━━╯` }, { quoted: msg });
};
