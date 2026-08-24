require("dotenv").config();

module.exports = {
  botName: "DEVA XMD-BOT",
  ownerName: "DEVA",
  ownerNumber: process.env.OWNER_NUMBER || "",
  prefix: ".",
  sessionName: "deva-session",

  pairingCode: true,

  autoStatusSeen: true,
  autoStatusLike: true,
  autoReact: true,
  alwaysOnline: true,
  autoTyping: true,
  autoRecording: true,
  autoCallReject: true,
  antiDelete: true,

  reactEmoji: ["❤️", "🔥", "👍", "😍", "😂", "💯"],
  statusReaction: ["❤️", "🔥", "👍", "😍"],
  timezone: "Asia/Kolkata"
};
