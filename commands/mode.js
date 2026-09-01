const config = require('../config');
const { requireOwner } = require('../lib/auth');
const settings = require('../lib/settings');

module.exports = async (sock, msg, args = []) => {
  if (!await requireOwner(sock, msg)) return;

  const jid = msg.key.remoteJid;
  const mode = String(args[0] || '').toLowerCase();

  if (!mode) {
    return sock.sendMessage(jid, {
      text: `Current mode: ${config.mode === '*private*' ? '*private*' : 'public'}\nUsage: .mode public|private`
    }, { quoted: msg });
  }

  if (!['public', 'private'].includes(mode)) {
    return sock.sendMessage(jid, {
      text: 'Usage: .mode public|private'
    }, { quoted: msg });
  }

  config.mode = mode;
  settings.save();

  await sock.sendMessage(jid, {
    text: mode === 'public'
      ? '🌐 Public *Mode*'
      : '🔒 Private *Mode*'
  }, { quoted: msg });

  await sock.sendMessage(jid, {
    text: mode === 'public'
      ? '⚙️ Bot mode set to *PUBLIC*'
      : '⚙️ Bot mode set to *PRIVATE*'
  }, { quoted: msg });
};
