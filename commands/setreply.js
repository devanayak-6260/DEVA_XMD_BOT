const config = require('../config');
const settings = require('../lib/settings');
const { requireOwner } = require('../lib/auth');

function replies() {
  if (!config.autoReplyKeywords || typeof config.autoReplyKeywords !== 'object' || Array.isArray(config.autoReplyKeywords)) config.autoReplyKeywords = {};
  return config.autoReplyKeywords;
}

module.exports = async (sock, msg, args = []) => {
  if (!await requireOwner(sock, msg)) return;
  const jid = msg.key.remoteJid;
  const raw = args.join(' ').trim();
  const sep = raw.indexOf('|');
  if (sep < 1) return sock.sendMessage(jid, { text: '❌ Use: .setreply keyword | reply\nExample: .setreply hello | Hello 👋' }, { quoted: msg });
  const keyword = raw.slice(0, sep).trim().toLowerCase();
  const reply = raw.slice(sep + 1).trim();
  if (!keyword || !reply) return sock.sendMessage(jid, { text: '❌ Keyword और reply दोनों दें.' }, { quoted: msg });
  replies()[keyword] = reply;
  settings.save();
  await sock.sendMessage(jid, { text: `✅ Auto reply saved:\n${keyword} → ${reply}` }, { quoted: msg });
};
