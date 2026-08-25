const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const config = require('../config');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function getImageMessage(msg) {
  const direct = msg.message?.imageMessage;
  if (direct) return direct;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted?.imageMessage) return quoted.imageMessage;
  const ephemeral = msg.message?.ephemeralMessage?.message;
  const viewOnce = msg.message?.viewOnceMessage?.message;
  const wrapped = ephemeral || viewOnce;
  if (wrapped?.imageMessage) return wrapped.imageMessage;
  const quotedEphemeral = quoted?.ephemeralMessage?.message || quoted?.viewOnceMessage?.message;
  if (quotedEphemeral?.imageMessage) return quotedEphemeral.imageMessage;
  return null;
}

function senderNumber(msg) {
  return String(msg.key?.participant || msg.key?.remoteJid || '').split('@')[0].replace(/\D/g, '');
}

function isOwner(msg) {
  if (msg.key?.fromMe) return true;
  const owner = String(config.ownerNumber || '').replace(/\D/g, '');
  return Boolean(owner) && senderNumber(msg) === owner;
}

// IMPORTANT: do NOT resize, crop, stretch, add borders, or add backgrounds.
// Keep the source image's original pixel dimensions and composition.
// Only normalize orientation and encode as high-quality JPEG because the
// WhatsApp profile-picture upload endpoint accepts an image buffer.
async function prepareOriginalImage(input) {
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) throw new Error('Invalid image dimensions');

  return sharp(input)
    .rotate()
    .jpeg({
      quality: 100,
      chromaSubsampling: '4:4:4'
    })
    .toBuffer();
}

module.exports = async (sock, msg) => {
  if (!isOwner(msg)) {
    return sock.sendMessage(msg.key.remoteJid, { text: '⛔ Sirf owner .fullpp use kar sakta hai.' }, { quoted: msg });
  }

  const image = getImageMessage(msg);
  if (!image) {
    return sock.sendMessage(msg.key.remoteJid, { text: '🖼️ Photo par reply karke .fullpp likho.' }, { quoted: msg });
  }

  try {
    const stream = await downloadContentFromMessage(image, 'image');
    const input = await streamToBuffer(stream);
    const pp = await prepareOriginalImage(input);
    const targetJid = sock.user?.id || msg.key?.participant || msg.key?.remoteJid;
    if (!targetJid) throw new Error('Bot JID not found');

    await sock.updateProfilePicture(targetJid, pp);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '✅ *FULL ORIGINAL PP SET HO GAYI!*\n\n🖼️ Original photo ko bina crop, stretch, resize ya background ke upload kiya gaya hai.\n📐 Photo ka original composition preserve hai.'
    }, { quoted: msg });
  } catch (e) {
    console.log('Full PP error:', e?.stack || e);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Profile picture set nahi ho payi. JPG/PNG photo par reply karke .fullpp dobara try karo.'
    }, { quoted: msg });
  }
};
