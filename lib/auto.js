const config = require("../config");
const { getRandomEmoji, getStatusEmoji } = require("./functions");

function isStatus(msg) {
  return msg?.key?.remoteJid === "status@broadcast";
}

async function autoFeatures(sock) {
  if (config.alwaysOnline) {
    try { await sock.sendPresenceUpdate("available"); } catch (_) {}
    setInterval(async () => {
      try { await sock.sendPresenceUpdate("available"); } catch (_) {}
    }, 25000);
  }

  if (config.autoCallReject) {
    sock.ev.on("call", async (calls) => {
      for (const call of calls || []) {
        try {
          if (call?.id && call?.from) {
            await sock.rejectCall(call.id, call.from);
            console.log(`Rejected incoming call from ${call.from}`);
          }
        } catch (e) {
          console.log("Call reject error:", e?.message || e);
        }
      }
    });
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages || []) {
      if (!msg?.message || msg.key?.fromMe) continue;

      if (isStatus(msg)) {
        if (config.autoStatusSeen) {
          try { await sock.readMessages([msg.key]); } catch (_) {}
        }
        if (config.autoStatusLike) {
          try {
            await sock.sendMessage("status@broadcast", {
              react: { text: getStatusEmoji(), key: msg.key }
            }, { statusJidList: [msg.key.participant || msg.key.remoteJid] });
          } catch (e) {
            console.log("Status reaction error:", e?.message || e);
          }
        }
        continue;
      }

      const jid = msg.key.remoteJid;
      if (!jid) continue;

      if (config.autoTyping) {
        try { await sock.sendPresenceUpdate("composing", jid); } catch (_) {}
      }

      if (config.autoRecording) {
        try {
          await new Promise(resolve => setTimeout(resolve, 700));
          await sock.sendPresenceUpdate("recording", jid);
        } catch (_) {}
      }

      if (config.autoReact) {
        try {
          await sock.sendMessage(jid, {
            react: { text: getRandomEmoji(), key: msg.key }
          });
        } catch (_) {}
      }
    }
  });
}

module.exports = autoFeatures;
