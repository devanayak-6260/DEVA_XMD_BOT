const config = require('../config');
const path = require('path');
const fs = require('fs');

module.exports = async (sock, msg) => {
  const pfx = config.prefix || '.';
  const menu = `╭━〔 👑 ${config.botName} 〕━╮
┃ ✦ ULTRA PRO BOT v4.1 ✦
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 👤 OWNER   ➜ ${config.ownerName || 'DEVA'}
┃ 🟢 STATUS  ➜ ONLINE
┃ ⚡ PREFIX  ➜ ${pfx}
┃ ⏱️ UPTIME  ➜ ${formatUptime(process.uptime())}
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 👑 VIP MENU 〕━━╮
┃
┃ 📥  MEDIA
┃  ├─ 🖼️ STICKER
┃  ├─ 🔄 TOIMG
┃  ├─ 🔗 URL
┃  ├─ 📐 RESIZE
┃  ├─ 🗜️ COMPRESS
┃  ├─ 🖼️ PNG
┃  └─ 🖼️ JPG
┃
┃ 🛠️  TOOLS
┃  ├─ ⚡ PING
┃  ├─ 📊 STATUS
┃  ├─ ⏱️ RUNTIME
┃  ├─ 👤 PROFILE / INFO
┃  ├─ ❤️ REACT
┃  └─ 🖼️ FULLPP
┃
┃ 👥  GROUP
┃  ├─ ➕ ADD
┃  ├─ ❌ KICK
┃  ├─ 👑 PROMOTE
┃  ├─ 🔻 DEMOTE
┃  ├─ 🔓 OPEN
┃  ├─ 🔒 CLOSE
┃  ├─ 📢 TAGALL
┃  ├─ 👻 HIDETAG
┃  ├─ ℹ️ GROUPINFO
┃  └─ 👑 ADMINS
┃
┃ 🤖  AUTO / SECURITY
┃  ├─ ${pfx}on <feature>
┃  ├─ ${pfx}off <feature>
┃  └─ 🛡️ ANTIDELETE
┃
┃ 👑  OWNER
┃  ├─ 👑 OWNER
┃  └─ ❓ HELP
┃
╰━━━━━━━━━━━━━━━━━━━━╯
       ⚡ DEVA XMD ⚡

💡 ${pfx}help — Command help
💡 ${pfx}status — Auto feature status
💡 ${pfx}autoreact ❤️ 🔥 👍 — Custom auto reactions
💡 ${pfx}clear — Reply to a message to delete it
💡 ${pfx}on statusseen — Example`;

  const p = path.join(__dirname, '../media/menu.jpg');
  try {
    if (fs.existsSync(p)) {
      await sock.sendMessage(msg.key.remoteJid, {
        image: fs.readFileSync(p),
        mimetype: 'image/jpeg',
        caption: menu
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
    }
  } catch {
    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  }
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  if (m || h || d) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
