function buildMenuCaption({ botSettings, prefix = "", uptime = "", platform = process.platform }) {
  const ownerName = "DEVA-NAYAK";
  const mode = String(botSettings?.mode || "public").toUpperCase();
  const pfx = prefix;
  return `
╭─❏ 👑 *DEVA XMD BOT* ❏─⊷
┃ 🚀  *ULTRA PRO BOT v4.1*  ┃
┣━━━━━━━━━━━━━━━━━━━
┃ 👤 *Oᴡɴᴇʀ* ➜ *${ownerName}*
┃https://wa.me/916260021735
┃ 💻 *Pʟᴀᴛꜰᴏʀᴍ* ➜ ${platform}
┃ 🔐 *Mᴏᴅᴇ* ➜ ${mode}
┃ ⚡ *Pʀᴇꜰɪx* ➜ ${pfx}
┃ ⏱️ *Uᴘᴛɪᴍᴇ* ➜ ${uptime}
╰━━━━━━━━━━━━━━━──⊷
┃
╭────❏ *🌐 Gᴇɴᴇʀᴀʟ* ❏
┃ 📜 • ${pfx}ᴍᴇɴᴜ
┃ 📡 • ${pfx}Pɪɴɢ
┃ ⚡ • ${pfx}Aʟɪᴠᴇ
┃ ⏳ • ${pfx}ᴜᴘᴛɪᴍᴇ
╰━━━━━━━━━━━━━━──⊷
┃
╭────❏ *⚙️ Bᴏᴛ Sᴇᴛᴛɪɴɢꜱ* ❏
┃ • ${pfx}Mᴏᴅᴇ ᴘᴜʙʟɪᴄ/ᴘʀɪᴠᴀᴛᴇ
┃ • ${pfx}Pʀᴇꜰɪx
┃ • ${pfx}Sᴇᴛᴛɪɴɢꜱ
┃ • ${pfx}Rᴇꜱᴛᴀʀᴛ
╰━━━━━━━━━━━━━━──⊷
┃
╭────❏ *Aᴜᴛᴏ Sʏꜱᴛᴇᴍ* ❏
┃ • ${pfx}Oɴʟɪɴᴇ  Oɴ/Oꜰꜰ
┃ • ${pfx}Tʏᴘɪɴɢ Oɴ/Oꜰꜰ
┃ • ${pfx}Rᴇᴄᴏʀᴅɪɴɢ Oɴ/Oꜰꜰ
┃ • ${pfx}Cᴀʟʟʀᴇᴊᴇᴄᴛ Oɴ/Oꜰꜰ
┃ • ${pfx}Aɴᴛɪᴅᴇʟᴇᴛᴇ Oɴ/Oꜰꜰ
┃ • ${pfx}Rᴇᴀᴅ Oɴ/Oꜰꜰ
┃ • ${pfx}SᴛᴀᴛᴜꜱRᴇᴘʟʏ Oɴ/Oꜰꜰ
┃ • ${pfx}Sᴛᴀᴛᴜꜱꜱᴇɴᴅᴇʀ  Oɴ/Oꜰꜰ
┃ • ${pfx}Sᴛᴀᴛᴜꜱʟɪᴋᴇ Oɴ/Oꜰꜰ
┃ • ${pfx}Aᴜᴛᴏʀᴇᴀᴄᴛ Oɴ/Oꜰꜰ
┃ • ${pfx}Sʀᴇᴀᴄᴛ Oɴ/Oꜰꜰ
╰━━━━━━━━━━━━━━──⊷
┃
╭────❏ *👥 Gʀᴏᴜᴘ Mᴀɴᴀɢᴇᴍᴇɴᴛ* ❏
┃ • ${pfx}Gʀᴏᴜᴘɪɴꜰᴏ
┃ • ${pfx}Tᴀɢᴀʟʟ
┃ • ${pfx}Kɪᴄᴋ
┃ • ${pfx}Pʀᴏᴍᴏᴛᴇ/Dᴇᴍᴏᴛᴇ
┃ • ${pfx}GʀᴏᴜᴘTᴇxᴛDᴇʟᴇᴛᴇ Oɴ/Oꜰꜰ
╰━━━━━━━━━━━━━━──⊷
┃
╭────❏ *🎨 Mᴇᴅɪᴀ Tᴏᴏʟꜱ* ❏
┃ • ${pfx}Sᴀᴠᴇ
┃ • ${pfx}Sᴛɪᴄᴋᴇʀ
┃ • ${pfx}Vᴠ
┃ • ${pfx}Uʀʟ
┃ • ${pfx}Fᴜʟʟᴘᴘ 
┃ • ${pfx}Fᴀɴᴄʏᴛᴇxᴛ
┃ • ${pfx}Tᴛꜱ <ᴛᴇxᴛ>
┃ • ${pfx}Tᴏᴍᴘ3 (ʀᴇᴘʟʏ ᴛᴏ ᴠɪᴅᴇᴏ)
╰━━━━━━━━━━━━━━──⊷
┃
╭────❏ *🪄 Iᴍᴀɢᴇ Eᴅɪᴛɪɴɢ* ❏
│ • ${pfx}Rᴇᴍᴏᴠᴇʙɢ 
╰━━━━━━━━━━━━━━──⊷
┃
╭────❏ 📥 *Dᴏᴡɴʟᴏᴀᴅᴇʀ* ❏
┃ • ${pfx}Sᴏɴɢ
┃ • ${pfx}Iɴꜱᴛᴀɢʀᴀᴍ
┃ • ${pfx}Pɪɴᴛᴇʀᴇꜱᴛ 
╰━━━━━━━━━━━━━━──⊷
┃
╭────❏ 👑 *Oᴡɴᴇʀ Pᴀɴᴇʟ* ❏──⊷
┃ • ${pfx}Oᴡɴᴇʀ
┃ • ${pfx}Pᴀɪʀ 91XXXXXXXXXX
┃ • ${pfx}Bʟᴏᴄᴋ
┃ • ${pfx}Cʟᴇᴀʀ
┃
╰━💻 *Cᴏᴅᴇᴅ ʙʏ : ᴅᴇᴠᴀ*❤️`;
}

module.exports = { buildMenuCaption };

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

module.exports = { handleMenuCommand };
