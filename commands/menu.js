const config = require('../config');
const path = require('path');
const fs = require('fs');

module.exports = async (sock, msg) => {
  const pfx = config.prefix || '.';
  const menu = `╭━〔 👑 DEVA XMD BOT 〕━╮
┃ ⚡  ULTRA PRO BOT v4.1 ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 👤 OWNER ➜ *${config.ownerName || 'DEVA-NAYAK'}*
┃ 💻 PLATFORM ➜ ${process.platform}
┃ 🔐 MODE    ➜ ${(config.mode || 'public').toUpperCase()}
┃ ⚡ PREFIX  ➜ ${pfx}
┃ ⏱️ UPTIME  ➜ ${formatUptime(process.uptime())}
╰━━━━━━━━━━━━━━━━━
┃ 
╭━━〔 ⚡ GENERAL 〕━━╮
┃ • ${pfx}menu
┃ • ${pfx}ping
┃ • ${pfx}uptime
┃ • ${pfx}settings
╰━━━━━━━━━━━━━━━━━━╯
┃ 
╭━━〔 🛠️ TOOLS 〕━━╮
┃ • ${pfx}clear
╰━━━━━━━━━━━━━━━━━━╯
┃ 
╭━━〔 🎨 MEDIA 〕━━╮
┃ • ${pfx}sticker
┃ • ${pfx}v2sticker (Video → Sticker)
┃ • ${pfx}toimg
┃ • ${pfx}url
┃ • ${pfx}fullpp
┃ • ${pfx}vv (View Once)
╰━━━━━━━━━━━━━━━━━━╯
┃ 
╭━━〔  📥 DOWNLOAD 〕━━╮
┃ • ${pfx}insta
┃ • ${pfx}instagram
┃ • ${pfx}pin
┃ • ${pfx}pinterest
┃ • ${pfx}song
┃ • ${pfx}apk
╰━━━━━━━━━━━━━━━━━━╯
┃ 
╭━〔 ✨ AUTO SYSTEM 〕━╮
┃ • ${pfx}autoreact on/off
┃ • ${pfx}read on/off
┃ • ${pfx}setreact 💫🌟🕊️❤️
┃ • ${pfx}statuslike on/off
┃ • ${pfx}statuslike 🧡🤍💚
┃ • ${pfx}statusseen on/off
┃ • ${pfx}online on/off
┃ • ${pfx}typing on/off
┃ • ${pfx}recording on/off
┃ • ${pfx}callreject on/off
┃ • ${pfx}antidelete on/off
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━━〔 ⚙️ MODE 〕━━╮
┃ • ${pfx}mode
┃ • ${pfx}mode public
┃ • ${pfx}mode private
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━━〔 🔧 PREFIX 〕━━╮
┃ • ${pfx}prefix
┃ • ${pfx}prefix !
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━━〔 👑 OWNER 〕━━╮
┃ • ${pfx}owner
┃
╰━💻 CODED BY : DEVA❤️`;

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
  } catch (e) {
    console.log('Menu Error:', e?.message || e);
    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  }
};

function formatUptime(seconds) {
  const total = Math.floor(Number(seconds) || 0);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
