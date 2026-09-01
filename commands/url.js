const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// URL uploader adapted from the DEVA-FLASH-MD URL command.
// Prefer setting IMGBB_API_KEY in the environment; the fallback keeps the
// original feature working for this build.
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '8b468bac6311f8b2fd23d20e90186ac8';

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function unwrapMessage(message) {
  if (!message) return null;
  return message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message;
}

function getImageMessage(msg) {
  const direct = unwrapMessage(msg.message);
  if (direct?.imageMessage) return direct.imageMessage;

  const context = direct?.extendedTextMessage?.contextInfo;
  const quoted = unwrapMessage(context?.quotedMessage);
  if (quoted?.imageMessage) return quoted.imageMessage;

  return null;
}

async function uploadToImgBB(buffer) {
  const body = new URLSearchParams();
  body.set('image', buffer.toString('base64'));

  const { data } = await axios.post(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
    body.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 60000,
      maxBodyLength: 40 * 1024 * 1024
    }
  );

  if (!data?.success || !data?.data?.url) {
    throw new Error(data?.error?.message || 'ImgBB upload failed');
  }
  return data.data.url;
}

module.exports = async (sock, msg) => {
  const jid = msg.key.remoteJid;
  const image = getImageMessage(msg);

  if (!image) {
    return sock.sendMessage(
      jid,
      { text: '╭━━〔 🔗 IMAGE URL 〕━━╮\n┃ Reply to a photo and send .url\n╰━━━━━━━━━━━━━━━━━━╯' },
      { quoted: msg }
    );
  }

  let tempPath;
  try {
    const stream = await downloadContentFromMessage(image, 'image');
    const input = await streamToBuffer(stream);

    const maxSize = 32 * 1024 * 1024;
    if (input.length > maxSize) {
      return sock.sendMessage(
        jid,
        { text: '╭━━〔 ❌ IMAGE TOO LARGE 〕━━╮\n┃ Maximum size: 32 MB\n╰━━━━━━━━━━━━━━━━━━╯' },
        { quoted: msg }
      );
    }

    // Save temporarily, matching the original URL script's temp-file flow.
    const tmpDir = path.join(process.cwd(), 'temp');
    fs.mkdirSync(tmpDir, { recursive: true });
    tempPath = path.join(tmpDir, `image-${Date.now()}.media`);
    fs.writeFileSync(tempPath, input);

    const link = await uploadToImgBB(input);

    await sock.sendMessage(
      jid,
      {
        text: `╭━━〔 🔗 IMAGE URL READY 〕━━╮\n┃\n┃ ${link}\n┃\n╰━━━━━━━━━━━━━━━━╯\n\n⚡ Powered by DEVA XMD BOT`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true
        }
      },
      { quoted: msg }
    );
  } catch (e) {
    console.log('ImgBB URL error:', e?.stack || e);
    await sock.sendMessage(
      jid,
      { text: '╭━━〔 ❌ URL GENERATION FAILED 〕━━╮\n┃ ImgBB upload failed.\n┃ Reply to the image and try again.\n╰━━━━━━━━━━━━━━━━━━━━━╯' },
      { quoted: msg }
    );
  } finally {
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
  }
};
