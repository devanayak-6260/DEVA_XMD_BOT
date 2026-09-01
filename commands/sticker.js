const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

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

  return null;
}

module.exports = async (sock, msg) => {
  const image = getImageMessage(msg);
  if (!image) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: '╭━━〔 🎨 STICKER MAKER 〕━━╮\n┃ Reply to a photo and send .sticker\n╰━━━━━━━━━━━━━━━━━━━╯' },
      { quoted: msg }
    );
  }

  try {
    const stream = await downloadContentFromMessage(image, 'image');
    const input = await streamToBuffer(stream);
    const webp = await sharp(input)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85 })
      .toBuffer();

    await sock.sendMessage(
      msg.key.remoteJid,
      { sticker: webp },
      { quoted: msg }
    );
  } catch (e) {
    console.log('Image to sticker error:', e?.message || e);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: '╭━━〔 ❌ STICKER ERROR 〕━━╮\n┃ Photo could not be converted.\n┃ Please try again.\n╰━━━━━━━━━━━━━━━━━━━━━╯' },
      { quoted: msg }
    );
  }
};
