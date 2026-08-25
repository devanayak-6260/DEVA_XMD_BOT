const config = require('../config');
const { requireOwner } = require('../lib/auth');
const settings = require('../lib/settings');
const aliases = { statusseen:'autoStatusSeen', statuslike:'autoStatusLike', react:'autoReact', online:'alwaysOnline', typing:'autoTyping', recording:'autoRecording', callreject:'autoCallReject', antidelete:'antiDelete', autoreply:'autoReply' };

module.exports = async (sock, msg, command, args) => {
  if (!(await requireOwner(sock, msg))) return;
  const feature = String(args[0] || '').toLowerCase().trim();
  const key = aliases[feature] || aliases[feature.replace(/^auto-?/, '')] || (feature === 'autoreply' ? 'autoReply' : null);
  if (!key || !['on','off'].includes(command)) return sock.sendMessage(msg.key.remoteJid,{text:'⚙️ Use: .on <feature> / .off <feature>\n\nstatusseen | statuslike | react | online | typing | recording | callreject | antidelete | autoreply'},{quoted:msg});
  const value = command === 'on'; settings.set(key,value);
  await sock.sendMessage(msg.key.remoteJid,{text:`✅ ${args[0]} ${value?'ON':'OFF'}`},{quoted:msg});
};
