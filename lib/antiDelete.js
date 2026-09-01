const config = require('../config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Keep recent incoming messages so a Delete for Everyone event can be mapped
// back to the original message. The cache is intentionally in-memory.
const cache = new Map();
// Secondary index makes revoke lookups O(1) instead of scanning the whole cache.
const chatIdIndex = new Map();
const MAX = 2000;
const TTL = 24 * 60 * 60 * 1000;

function cacheKey(key) {
  if (!key?.id) return null;
  return `${key.remoteJid || ''}|${key.participant || ''}|${key.id}`;
}

function unwrapMessage(message) {
  let current = message;
  if (!current) return null;

  for (let i = 0; i < 8 && current; i++) {
    if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    else if (current.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message;
    else break;
  }
  return current;
}

function remember(msg) {
  const key = msg?.key;
  const id = cacheKey(key);
  if (!id || key.remoteJid === 'status@broadcast' || key.fromMe || !msg.message) return;

  cache.set(id, { msg, time: Date.now() });
  chatIdIndex.set(`${key.remoteJid || ''}|${key.id}`, id);

  while (cache.size > MAX) {
    const oldestId = cache.keys().next().value;
    const oldest = cache.get(oldestId);
    cache.delete(oldestId);
    if (oldest?.msg?.key) chatIdIndex.delete(`${oldest.msg.key.remoteJid || ''}|${oldest.msg.key.id}`);
  }
}

function cleanup() {
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now - entry.time > TTL) {
      cache.delete(id);
      if (entry?.msg?.key) chatIdIndex.delete(`${entry.msg.key.remoteJid || ''}|${entry.msg.key.id}`);
    }
  }
}

function findOriginal(key) {
  const direct = cache.get(cacheKey(key));
  if (direct) return direct.msg;

  // WhatsApp can change/omit participant fields on update events. Use the
  // chat + message id secondary index rather than scanning thousands of entries.
  const indexed = chatIdIndex.get(`${key?.remoteJid || ''}|${key?.id || ''}`);
  if (indexed) return cache.get(indexed)?.msg || null;
  return null;
}

function getText(message) {
  const m = unwrapMessage(message);
  if (!m) return null;
  if (m.conversation != null) return m.conversation;
  if (m.extendedTextMessage?.text != null) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption != null) return m.imageMessage.caption;
  if (m.videoMessage?.caption != null) return m.videoMessage.caption;
  if (m.documentMessage?.caption != null) return m.documentMessage.caption;
  return null;
}

function getParticipantJid(old, key) {
  return old?.key?.participant || key?.participant || old?.key?.remoteJid || key?.remoteJid || null;
}

function mentionInfo(jid, participant, old) {
  const isGroup = typeof jid === 'string' && jid.endsWith('@g.us');
  if (!participant) {
    return { prefix: '⚠️ इस बंदे ने यह मैसेज Delete for Everyone किया:', mentions: [] };
  }

  const number = participant.split('@')[0].split(':')[0];
  const name = old?.pushName ? String(old.pushName).trim() : '';

  if (isGroup) {
    return {
      prefix: `⚠️ @${number} ने यह मैसेज Delete for Everyone किया:`,
      mentions: [participant]
    };
  }

  // In a private 1-to-1 chat WhatsApp does not create a real @mention.
  // Still show the sender clearly, using pushName when available and the
  // WhatsApp number as a fallback.
  const sender = name ? `${name} (@${number})` : `@${number}`;
  return {
    prefix: `⚠️ ${sender} ने यह मैसेज Delete for Everyone किया:`,
    mentions: []
  };
}

async function resendDeleted(sock, old, jid, key) {
  const participant = getParticipantJid(old, key);
  const { prefix, mentions } = mentionInfo(jid, participant, old);
  const text = getText(old.message);
  const isPrivate = typeof jid === 'string' && !jid.endsWith('@g.us');

  // In private chats use a styled, quoted/reply-style notification. The
  // original message is quoted when possible, while the text is also copied
  // into the notification so it remains visible even if WhatsApp renders the
  // quote as deleted. Groups keep the compact sender/mention format.
  const sendText = (body) => {
    if (isPrivate) {
      return sock.sendMessage(jid, {
        text: `╭─〔 🗑️ MESSAGE DELETED 〕\n│ ↩️ Reply to deleted message\n│ 💬 *“${String(body).replace(/\*/g, '')}”*\n│\n│ ⚠️ *यह मैसेज sender ने Delete for Everyone किया।*\n╰────────────────────╯`,
        quoted: old
      });
    }

    return sock.sendMessage(jid, {
      text: `${prefix}\n\n${body}`,
      ...(mentions.length ? { mentions } : {})
    });
  };

  if (text !== null) {
    await sendText(text);
    return true;
  }

  const m = unwrapMessage(old.message);
  if (!m) return false;

  // Try to restore common media messages as well. The deletion notice and
  // sender mention are included in the media caption.
  try {
    if (m.imageMessage) {
      const buffer = await downloadMediaMessage(old, 'buffer', {}, {
        reuploadRequest: sock.updateMediaMessage
      });
      await sock.sendMessage(jid, {
        image: buffer,
        caption: `〔 ↩️ DELETED PHOTO 〕
│ 🖼️ [PHOTO]
│
│ ⚠️ Sender ने यह फोटो
│ Delete for Everyone किया।
╰────────────────╯`,
        ...(mentions.length ? { mentions } : {})
      });
      return true;
    }

    if (m.videoMessage) {
      const buffer = await downloadMediaMessage(old, 'buffer', {}, {
        reuploadRequest: sock.updateMediaMessage
      });
      await sock.sendMessage(jid, {
        video: buffer,
        caption: `${prefix}\n\n${m.videoMessage.caption || '[Video]'}`,
        ...(mentions.length ? { mentions } : {})
      });
      return true;
    }

    if (m.documentMessage) {
      const buffer = await downloadMediaMessage(old, 'buffer', {}, {
        reuploadRequest: sock.updateMediaMessage
      });
      await sock.sendMessage(jid, {
        document: buffer,
        mimetype: m.documentMessage.mimetype,
        fileName: m.documentMessage.fileName || 'document',
        caption: prefix,
        ...(mentions.length ? { mentions } : {})
      });
      return true;
    }
  } catch (e) {
    console.log('[ANTI-DELETE] Media restore failed:', e?.message || e);
  }

  return false;
}

async function handleUpdate(sock, updates) {
  if (!config.antiDelete) return;
  cleanup();

  for (const item of updates || []) {
    const update = item?.update || {};
    const key = item?.key || {};

    // Baileys v7 emits Delete for Everyone through messages.update as:
    // { key: <original-message-key>, update: { message: null,
    //   messageStubType: REVOKE } }
    const isRevoke =
      Number(update.messageStubType) === 0 ||
      String(update.messageStubType || '').toUpperCase() === 'REVOKE' ||
      (update.message === null && update.messageStubType != null);

    if (!isRevoke || !key.id) continue;

    const old = findOriginal(key);
    if (!old) {
      console.log(`[ANTI-DELETE] Original message not found: ${key.id}`);
      continue;
    }

    // Only restore messages originally sent by another participant.
    if (old.key?.fromMe) {
      const oldCacheKey = cacheKey(old.key);
      cache.delete(oldCacheKey);
      chatIdIndex.delete(`${old.key.remoteJid || ''}|${old.key.id || ''}`);
      continue;
    }

    const jid = old.key.remoteJid || key.remoteJid;
    if (!jid || jid === 'status@broadcast') continue;

    try {
      const restored = await resendDeleted(sock, old, jid, key);
      if (restored) {
        console.log(`[ANTI-DELETE] Restored deleted message ${key.id} in ${jid}`);
      } else {
        console.log(`[ANTI-DELETE] Deleted message ${key.id} detected, but this type could not be restored.`);
      }
    } catch (e) {
      console.log('[ANTI-DELETE] Restore error:', e?.stack || e?.message || e);
    }

    cache.delete(cacheKey(old.key));
    chatIdIndex.delete(`${old.key.remoteJid || ''}|${old.key.id || ''}`);
  }
}

function attach(sock) {
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages || []) remember(msg);
  });

  sock.ev.on('messages.update', (updates) => {
    handleUpdate(sock, updates).catch((e) => {
      console.log('[ANTI-DELETE] Handler error:', e?.stack || e?.message || e);
    });
  });
}

module.exports = { attach };
