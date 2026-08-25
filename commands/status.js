const config = require("../config");

module.exports = async (sock, msg) => {
  const text = `
╭━━━〔 ${config.botName} 〕━━━╮
┃ ⚙️ BOT FEATURES
┃
┃ 👁 Auto Status Seen: ${config.autoStatusSeen ? "ON ✅" : "OFF ❌"}
┃ ❤️ Auto Status Like: ${config.autoStatusLike ? "ON ✅" : "OFF ❌"}
┃ 👍 Auto React: ${config.autoReact ? "ON ✅" : "OFF ❌"}
┃ 🟢 Always Online: ${config.alwaysOnline ? "ON ✅" : "OFF ❌"}
┃ ⌨️ Auto Typing: ${config.autoTyping ? "ON ✅" : "OFF ❌"}
┃ 🎙 Auto Recording: ${config.autoRecording ? "ON ✅" : "OFF ❌"}
┃ 📵 Auto Call Reject: ${config.autoCallReject ? "ON ✅" : "OFF ❌"}
┃ 🛡️ Anti-Delete: ${config.antiDelete ? "ON ✅" : "OFF ❌"}
╰━━━━━━━━━━━━━━━━━━━━╯`;

  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
};
