const config = require('../config');
const settings = require('../lib/settings');

const aliases = {
  statusseen: 'autoStatusSeen',
  statuslike: 'autoStatusLike',
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
      text: '⚙️ Usage: .on <feature> / .off <feature>\n\nFeatures: statusseen, statuslike, react, online, typing, recording, callreject, antidelete'
    }, { quoted: msg });
  }
  const action = String(args[1] || '').toLowerCase();
  const value = action === 'on' ? true : action === 'off' ? false : null;
  if (value === null) {
    return sock.sendMessage(msg.key.remoteJid, { text: `Current: ${config[key] ? 'ON ✅' : 'OFF ❌'}\nUse .on ${name} or .off ${name}` }, { quoted: msg });
  }
  settings.set(key, value);
  await sock.sendMessage(msg.key.remoteJid, { text: `✅ ${name} ${value ? 'ON' : 'OFF'}` }, { quoted: msg });
};
