const config = require('../config');
const settings = require('../lib/settings');
const { requireOwner } = require('../lib/auth');

function getReplies() {
  if (!config.autoReplyKeywords || typeof config.autoReplyKeywords !== 'object' || Array.isArray(config.autoReplyKeywords)) {
    config.autoReplyKeywords = {};
  }
  return config.autoReplyKeywords;
}

module.exports = async (sock, msg, args = []) => {
  if (!await requireOwner(sock, msg)) return;
  const jid = msg.key.remoteJid;
  const sub = String(args[0] || '').toLowerCase();
  const replies = getReplies();

  if (!sub || sub === 'status') {
    const entries = Object.entries(replies);
    const list = entries.length ? entries.map(([k,v]) => `• ${k} → ${v}`).join('\n') : 'No keyword replies set.';
    return sock.sendMessage(jid, {
      text: `🤖 KEYWORD AUTO REPLY\n\nStatus: ${config.autoReply ? 'ON ✅' : 'OFF ❌'}\n\n${list}\n\nCommands:\n.on autoreply\n.off autoreply\n.setreply hello | Hello 👋\n.delreply hello`
    }, { quoted: msg });
  }

  if (sub === 'on' || sub === 'off') {
    config.autoReply = sub === 'on';
    config.smartAutoReply = true;
    settings.save();
    return sock.sendMessage(jid, { text: `🤖 Smart Auto Reply: ${config.autoReply ? 'ON ✅' : 'OFF ❌'}\n🧠 Reply mode: SMART` }, { quoted: msg });
  }

  if (sub === 'smart') {
    const mode = String(args[1] || '').toLowerCase();
    if (!['on','off'].includes(mode)) return sock.sendMessage(jid, { text: 'Use: .autoreply smart on / .autoreply smart off' }, { quoted: msg });
    config.smartAutoReply = mode === 'on';
    settings.save();
    return sock.sendMessage(jid, { text: `🧠 Smart Reply: ${config.smartAutoReply ? 'ON ✅' : 'OFF ❌'}` }, { quoted: msg });
  }

  return sock.sendMessage(jid, {
    text: `⚙️ Use:\n.setreply <keyword> | <reply>\n.delreply <keyword>\n.autoreply status\n.on autoreply\n.off autoreply`
  }, { quoted: msg });
};
