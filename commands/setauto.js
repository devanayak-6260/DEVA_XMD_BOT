const config = require('../config');
const { requireOwner } = require('../lib/auth');
const settings = require('../lib/settings');
const aliases = { read:'autoRead', statusseen:'autoStatusSeen', react:'autoReact', online:'alwaysOnline', typing:'autoTyping', recording:'autoRecording', callreject:'autoCallReject', antidelete:'antiDelete' };
module.exports = async (sock, msg, command, args) => {
  if (!(await requireOwner(sock, msg))) return;
  const key = aliases[String(args[0] || '').toLowerCase().replace(/^auto/, '')];
  if (!key || !['on','off'].includes(command)) return sock.sendMessage(msg.key.remoteJid,{text:'╭━━〔 ⚙️ FEATURE CONTROL 〕━━╮\n┃\n┃ Usage : .on <feature> / .off <feature>\n┃\n┃ Features :\n┃ • read\n┃ • statusseen\n┃ • react\n┃ • online\n┃ • typing\n┃ • recording\n┃ • callreject\n┃ • antidelete\n┃\n╰━━━━━━━━━━━━━━━━━━━╯'},{quoted:msg});
  const value = command === 'on'; settings.set(key,value);
  await sock.sendMessage(msg.key.remoteJid,{text:`╭━━〔 ⚙️ FEATURE UPDATED 〕━━╮\n┃\n┃ Feature : ${String(args[0]).toUpperCase()}\n┃ Status  : ${value ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n┃\n╰━━━━━━━━━━━━━━━━━━━━╯`},{quoted:msg});
};
