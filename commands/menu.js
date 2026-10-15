function buildMenuCaption({ botSettings, prefix = "", uptime = "", platform = process.platform }) {
  const ownerName = "DEVA-NAYAK";
  const mode = String(botSettings?.mode || "public").toUpperCase();
  const pfx = prefix;
  return `╭━〔 👑 DEVA XMD BOT 〕━╮
 ┃ ⚡  ULTRA PRO BOT v4.1
 ┣━━━━━━━━━━━━━━━━━━━┫
 ┃ 👤 OWNER ➜ *${ownerName}*
 ┃https://wa.me/916260021735
 ┃ 💻 PLATFORM ➜ ${platform}
 ┃ 🔐 MODE ➜ ${mode}
 ┃ ⚡ PREFIX ➜ ${pfx}
 ┃ ⏱️ UPTIME ➜ ${uptime}
 ╰━━━━━━━━━━━━━━━━━
 ┃
 ╭━━〔 ⚡ GENERAL 〕━━╮
 ┃ • ${pfx}menu
 ┃ • ${pfx}ping
 ┃ • ${pfx}alive
 ┃ • ${pfx}uptime
 ╰━━━━━━━━━━━━━━━━━━╯
 ┃
 ╭━〔 ⚙️ BOT SETTINGS 〕━╮
 ┃ • mode public/private
 ┃ • prefix
 ┃ • settings
 ┃ • ${pfx}restart
 ╰━━━━━━━━━━━━━━━━━━╯
 ┃
 ╭━〔 ✨ AUTO SYSTEM 〕━╮
 ┃ • ${pfx}online on/off
 ┃ • ${pfx}Typing on/off
 ┃ • ${pfx}Recording on/off
 ┃ • ${pfx}Callreject on/off
 ┃ • ${pfx}Antidelete on/off
 ┃ • ${pfx}Read on/off
 ┃ • ${pfx}StatusReply on/off
 ┃ • ${pfx}StatusSender on/off
 ┃ • ${pfx}Statuslike on/off
 ┃ • ${pfx}Autoreact on/off
 ┃ • ${pfx}Sreact on/off
 ╰━━━━━━━━━━━━━━━━━━╯
 ┃
 ╭━━〔 👥 GROUP 〕━━╮
 ┃ • ${pfx}groupinfo
 ┃ • ${pfx}Tagall
 ┃ • ${pfx}kick
 ┃ • ${pfx}promote / ${pfx}demote
 ┃ • ${pfx}GroupTextDelete on/off
 ╰━━━━━━━━━━━━━━━━━━╯
 ┃
 ╭━━━〔 🎨 MEDIA 〕━━━╮
 ┃ • ${pfx}Save
 ┃ • ${pfx}sticker
 ┃ • ${pfx}vv
 ┃ • ${pfx}url
 ┃ • ${pfx}fullpp
 ┃ • ${pfx}sticker
 ┃ • ${pfx}fancytext
 ┃ • ${pfx}tts <text>
 ┃ • ${pfx}tomp3 (reply to video)
 ╰━━━━━━━━━━━━━━━━━━╯
 ┃
 ╭━〔 🖼️ IMAGE EDITING 〕━╮
 ┃ • ${pfx}removebg
 ╰━━━━━━━━━��━━━━━━━━━╯
 ┃
 ╭━━〔  📥 DOWNLOAD 〕━━╮
 ┃ • ${pfx}song
 ┃ • ${pfx}instagram
 ┃ • ${pfx}pinterest
 ╰━━━━━━━━━━━━━━━━━━╯
 ┃
 ╭━━〔 👑 OWNER 〕━━╮
 ┃ • ${pfx}owner
 ┃ • ${pfx}pair 91XXXXXXXXXX
 ┃ • ${pfx}block
 ┃ • ${pfx}clear
 ┃
 ╰━💻 CODED BY : DEVA❤️`;
}

const fs = require("fs");

async function handleMenuCommand({ sock, jid, quoted, botSettings, formatUptime, menuImagePath }) {
  const caption = buildMenuCaption({
    botSettings,
    prefix: botSettings.prefix || "",
    uptime: formatUptime(Date.now() - global.botStartTime),
    platform: process.platform
  });

  if (fs.existsSync(menuImagePath)) {
    await sock.sendMessage(jid, { image: fs.readFileSync(menuImagePath), caption }, { quoted });
  } else {
    await sock.sendMessage(jid, { text: caption }, { quoted });
  }
}

module.exports = { buildMenuCaption, handleMenuCommand };
