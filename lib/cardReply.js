const fs = require('fs');
const path = require('path');

const thumbnail = fs.readFileSync(path.join(__dirname, '../media/ping-thumb.jpg'));
const photoB64 = thumbnail.toString('base64');

function makeCardQuote(msg) {
  const senderId = String(msg?.key?.participant || msg?.key?.remoteJid || '')
    .split('@')[0]
    .replace(/[^0-9]/g, '') || '0';

  return {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast'
    },
    message: {
      contactMessage: {
        displayName: 'DEVA XMD-BOT',
        jpegThumbnail: thumbnail,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;DEVA XMD-BOT;;;\nFN:DEVA XMD-BOT\nPHOTO;ENCODING=b;TYPE=JPEG:${photoB64}\nitem1.TEL;waid=${senderId}:${senderId}\nitem1.X-ABLabel:Mobile\nEND:VCARD`
      }
    }
  };
}

module.exports = { thumbnail, photoB64, makeCardQuote };
