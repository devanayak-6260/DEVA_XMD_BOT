const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

const S_WHATSAPP_NET = 's.whatsapp.net';

async function getBuffer(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const resizeImage = async (imagePath) => {
  const img = await sharp(imagePath)
    .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
    .jpeg()
    .toBuffer();
  const preview = await sharp(img).normalize().jpeg().toBuffer();
  return { img, preview };
};

function getQuotedImage(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted?.imageMessage) return quoted.imageMessage;
  const quotedEphemeral = quoted?.ephemeralMessage?.message || quoted?.viewOnceMessage?.message;
  if (quotedEphemeral?.imageMessage) return quotedEphemeral.imageMessage;
  return null;
}

function senderNumber(msg) {
  return String(msg.key?.participant || msg.key?.remoteJid || '')
    .split('@')[0]
    .replace(/\D/g, '');
}

function isOwner(msg) {
  if (msg.key?.fromMe) return true;
  const owner = String(config.ownerNumber || '').replace(/\D/g, '');
  return Boolean(owner) && senderNumber(msg) === owner;
}

module.exports = async (sock, msg) => {
  const from = msg.key.remoteJid;

  if (!isOwner(msg)) {
    return sock.sendMessage(from, {
      text: '╭━━〔 🔐 ACCESS DENIED 〕━━╮\n┃ Only the owner can use .fullpp.\n╰━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }

  const quotedImage = getQuotedImage(msg);

  if (!quotedImage) {
    return sock.sendMessage(from, {
      text: '╭━━〔 🖼️ FULL PP 〕━━╮\n┃ Reply to a photo and send .fullpp\n╰━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }

  let mediaPath;

  try {
    console.log('=== FULLPP DEBUG START ===');
    const buffer = await getBuffer(quotedImage, 'image');
    console.log('Buffer created, size:', buffer.length, 'bytes');

    mediaPath = path.join(process.cwd(), 'temp', `${Date.now()}.jpg`);
    await fs.mkdir(path.dirname(mediaPath), { recursive: true });
    await fs.writeFile(mediaPath, buffer);

    const resized = await resizeImage(mediaPath);
    console.log('Image processed, output size:', resized.img.length, 'bytes');

    const result = await sock.query({
      tag: 'iq',
      attrs: {
        to: S_WHATSAPP_NET,
        type: 'set',
        xmlns: 'w:profile:picture'
      },
      content: [{
        tag: 'picture',
        attrs: { type: 'image' },
        content: resized.img
      }]
    });

    console.log('Profile-picture query successful:', result);

    await sock.sendMessage(from, {
      text: '╭━━〔 🖼️ PROFILE PICTURE 〕━━╮\n┃\n┃ Status : UPDATED ✅\n┃ Quality: HIGH QUALITY\n┃ Crop   : NONE\n┃\n╰━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  } catch (err) {
    console.error('=== FULLPP ERROR ===');
    console.error(err?.stack || err);

    await sock.sendMessage(from, {
      text: '╭━━〔 ❌ PROFILE PICTURE ERROR 〕━━╮\n┃ Could not update profile picture.\n┃ Reply to a JPG/PNG photo and try again.\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });

    const ownerJid = String(config.ownerNumber || '').replace(/\D/g, '');
    if (ownerJid && ownerJid !== senderNumber(msg)) {
      try {
        await sock.sendMessage(`${ownerJid}@s.whatsapp.net`, {
          text: `Fullpp error in ${from}:\n${err?.message || err}`
        });
      } catch (_) {}
    }
  } finally {
    if (mediaPath) {
      try { await fs.unlink(mediaPath); } catch (_) {}
    }
  }
};
