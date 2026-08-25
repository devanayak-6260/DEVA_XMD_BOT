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
  antidelete: 'antiDelete',
  autoreply: 'autoReply'
};

module.exports = async (sock, msg, command, args = []) => {
  // Supports both forms:
  // .on autoreply / .off autoreply
  // and .on statusseen / .off statusseen
  const name = String(args[0] || '').toLowerCase().replace(/^auto/, '');
  const key = aliases[name] || aliases[String(args[0] || '').toLowerCase()];

  if (!key) {
    return sock.sendMessage(msg.key.remoteJid, {
      text: '⚙️ Use: .on <feature> / .off <feature>\n\nFeatures: statusseen, statuslike, react, online, typing, recording, callreject, antidelete, autoreply'
    }, { quoted: msg });
  }

  // The command itself is the action: `.on` => true, `.off` => false.
  const action = String(command || '').toLowerCase();
  if (action !== 'on' && action !== 'off') {
    return sock.sendMessage(msg.key.remoteJid, {
      text: `Use .on ${name} or .off ${name}`
    }, { quoted: msg });
  }

  const value = action === 'on';
  settings.set(key, value);

  // Smart mode is automatically enabled when Auto Reply is turned on.
  if (key === 'autoReply' && value) {
    config.smartAutoReply = true;
    settings.save();
  }

  await sock.sendMessage(msg.key.remoteJid, {
    text: key === 'autoReply'
      ? `🤖 Smart Auto Reply ${value ? 'ON ✅' : 'OFF ❌'}\n🧠 Mode: ${value ? 'SMART' : 'DISABLED'}`
      : `✅ ${name} ${value ? 'ON' : 'OFF'}`
  }, { quoted: msg });
};
