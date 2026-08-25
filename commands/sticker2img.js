const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = async (sock, msg) => {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const sticker = quoted?.stickerMessage || msg.message?.stickerMessage;
  if (!sticker) {
    return sock.sendMessage(msg.key.remoteJid, { text: '🖼️ Reply to a sticker with .toimg' }, { quoted: msg });
  }

  try {
    const stream = await downloadContentFromMessage(sticker, 'sticker');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const input = Buffer.concat(chunks);
    const output = await sharp(input, { animated: false }).png().toBuffer();
    await sock.sendMessage(msg.key.remoteJid, {
      image: output,
      caption: '🖼️ Sticker converted to image ✅'
    }, { quoted: msg });
  } catch (e) {
    console.log('Sticker conversion error:', e?.message || e);
    await sock.sendMessage(msg.key.remoteJid, { text: '❌ Sticker convert nahi ho paya.' }, { quoted: msg });
  }
};
