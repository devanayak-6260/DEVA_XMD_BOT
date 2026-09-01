const config = require('../config');
const { getRandomEmoji, getStatusEmojis } = require('./functions');

function isStatus(msg) {
  return msg?.key?.remoteJid === 'status@broadcast';
}

const fire = (promise, label) => {
  Promise.resolve(promise).catch((e) => {
    if (label) console.log(`${label}:`, e?.message || e);
  });
};

async function autoFeatures(sock) {
  if (config.alwaysOnline) {
    fire(sock.sendPresenceUpdate('available'));
    const onlineTimer = setInterval(() => {
      fire(sock.sendPresenceUpdate('available'));
    }, 25000);
    // Do not keep Node alive just for this timer during shutdown/restart.
    onlineTimer.unref?.();
  }

  if (config.autoCallReject) {
    sock.ev.on('call', (calls) => {
      for (const call of calls || []) {
        if (call?.id && call?.from) {
          fire(sock.rejectCall(call.id, call.from), '[CALL REJECT]');
        }
      }
    });
  }

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages || []) {
      if (!msg?.message || msg.key?.fromMe) continue;

      if (isStatus(msg)) {
        // Independent status actions run concurrently; one slow WhatsApp
        // request no longer blocks the other action or the next message.
        if (config.autoStatusSeen) fire(sock.readMessages([msg.key]));
        if (config.autoStatusLike) {
          const emojis = [...new Set(getStatusEmojis())].filter(Boolean);
          if (emojis.length) {
            const store = global.__devaStatusLike || (global.__devaStatusLike = { index: 0 });
            const emoji = emojis[store.index % emojis.length];
            store.index = (store.index + 1) % emojis.length;
            fire(sock.sendMessage('status@broadcast', {
              react: { text: emoji, key: msg.key }
            }, { statusJidList: [msg.key.participant || msg.key.remoteJid] }), '[STATUS LIKE]');
          }
        }
        continue;
      }

      const jid = msg.key.remoteJid;
      if (!jid) continue;

      if (config.autoRead) fire(sock.readMessages([msg.key]));
      if (config.autoTyping) fire(sock.sendPresenceUpdate('composing', jid));

      if (config.autoRecording) {
        // Schedule recording without blocking command processing.
        setTimeout(() => {
          fire(sock.sendPresenceUpdate('recording', jid));
        }, 700).unref?.();
      }

      if (config.autoReact) {
        fire(sock.sendMessage(jid, {
          react: { text: getRandomEmoji(), key: msg.key }
        }), '[AUTO REACT]');
      }
    }
  });
}

module.exports = autoFeatures;
