const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// WhatsApp can wrap quoted media inside ephemeral/view-once containers.
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

async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), `deva-${Date.now()}.jpg`);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
    headers: { 'User-Agent': 'DEVA-XMD-BOT/1.0' },
    signal: AbortSignal.timeout(60000)
  });

  const text = (await response.text()).trim();
  if (!response.ok || !/^https?:\/\//i.test(text)) {
    throw new Error(`Catbox upload failed: ${response.status} ${text.slice(0, 200)}`);
  }
  return text;
}

// Fallback host. tmpfiles links are temporary (about 60 minutes), but this
// keeps .url usable when Catbox is temporarily unavailable.
async function uploadToTmpfiles(buffer) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), `deva-${Date.now()}.jpg`);

  const response = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: form,
    headers: { 'User-Agent': 'DEVA-XMD-BOT/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(60000)
  });

  const data = await response.json().catch(() => null);
  const pageUrl = data?.data?.url;
  if (!response.ok || !pageUrl) {
    throw new Error(`Tmpfiles upload failed: ${response.status}`);
  }

  // Convert the tmpfiles page URL into its direct file URL.
  return pageUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
}

async function makePublicUrl(input) {
  // Normalize to JPEG so unusual WhatsApp image formats do not break upload.
  const jpeg = await sharp(input).jpeg({ quality: 90 }).toBuffer();

  try {
    return await uploadToCatbox(jpeg);
  } catch (catboxError) {
    console.log('Catbox upload failed, trying fallback:', catboxError?.message || catboxError);
    return await uploadToTmpfiles(jpeg);
  }
}

module.exports = async (sock, msg) => {
  const image = getImageMessage(msg);
  if (!image) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: '🖼️ Photo par reply karke .url likho.' },
      { quoted: msg }
    );
  }

  try {
    const stream = await downloadContentFromMessage(image, 'image');
    const input = await streamToBuffer(stream);
    const url = await makePublicUrl(input);

    await sock.sendMessage(
      msg.key.remoteJid,
      { text: `🔗 *Image URL Generated*\n\n${url}` },
      { quoted: msg }
    );
  } catch (e) {
    console.log('Image URL error:', e?.stack || e);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: '❌ Photo ka URL nahi bana paya. Image par reply karke `.url` dobara try karo.' },
      { quoted: msg }
    );
  }
};
