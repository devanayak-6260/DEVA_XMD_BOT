const config = require('../config');
const settings = require('../lib/settings');
const { requireOwner } = require('../lib/auth');
module.exports = async (sock, msg, args = []) => {
  if (!await requireOwner(sock, msg)) return;
  const jid = msg.key.remoteJid;
  const keyword = args.join(' ').trim().toLowerCase();
  if (!keyword) return sock.sendMessage(jid, { text: '❌ Use: .delreply <keyword>' }, { quoted: msg });
  if (!config.autoReplyKeywords || !Object.prototype.hasOwnProperty.call(config.autoReplyKeywords, keyword)) {
    return sock.sendMessage(jid, { text: `❌ Keyword not found: ${keyword}` }, { quoted: msg });
  }
  delete config.autoReplyKeywords[keyword];
  settings.save();
  await sock.sendMessage(jid, { text: `🗑️ Removed auto reply: ${keyword}` }, { quoted: msg });
};
