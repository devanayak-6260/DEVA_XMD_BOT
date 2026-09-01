const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function unwrapViewOnce(message) {
  const m = message?.viewOnceMessageV2?.message ||
    message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2Extension?.message;
  return m || message;
}

module.exports = async (sock, msg) => {
  const jid = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) {
    return sock.sendMessage(jid, {
      text: `╭━━〔 👁️ VIEW ONCE 〕━━╮\n┃\n┃ Reply to a View Once\n┃ photo/video/document/audio\n┃ and send : .vv\n┃\n╰━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }

  const media = unwrapViewOnce(quoted);
  const type = Object.keys(media || {}).find(k =>
    ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(k)
  );

  if (!type) {
    return sock.sendMessage(jid, {
      text: '╭━━〔 ⚠️ INVALID MEDIA 〕━━╮\n┃ The replied message is not\n┃ a supported View Once media.\n╰━━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }

  const mediaMsg = media[type];
  try {
    const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const common = { quoted: msg };
    if (type === 'imageMessage') {
      await sock.sendMessage(jid, {
        image: buffer,
        mimetype: mediaMsg.mimetype || 'image/jpeg',
        caption: mediaMsg.caption || ''
      }, common);
    } else if (type === 'videoMessage') {
      await sock.sendMessage(jid, {
        video: buffer,
        mimetype: mediaMsg.mimetype || 'video/mp4',
        caption: mediaMsg.caption || '',
        gifPlayback: !!mediaMsg.gifPlayback
      }, common);
    } else if (type === 'audioMessage') {
      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype: mediaMsg.mimetype || 'audio/mpeg',
        ptt: !!mediaMsg.ptt
      }, common);
    } else {
      await sock.sendMessage(jid, {
        document: buffer,
        mimetype: mediaMsg.mimetype || 'application/octet-stream',
        fileName: mediaMsg.fileName || 'view-once-file'
      }, common);
    }
  } catch (e) {
    console.log('VV Error:', e?.stack || e);
    await sock.sendMessage(jid, {
      text: '╭━━〔 ❌ VIEW ONCE ERROR 〕━━╮\n┃ Media could not be processed.\n┃ Please try again.\n╰━━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }
};
