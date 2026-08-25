// DEVA XMD-BOT — Protected Menu Module
// Menu text is obfuscated and reconstructed only at runtime.
// This prevents casual/plain-text editing; it is NOT unbreakable security.
'use strict';

const config = require('../config');
const fs = require('fs');
const path = require('path');

const _key = Buffer.from('YLZHDKuMROFvW9F3EP3qZ++unbXMfqdaVZ+I07gyGcU=', 'base64');
const _data = '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';

function _menuText() {
  const enc = Buffer.from(_data, 'base64');
  const out = Buffer.allocUnsafe(enc.length);
  for (let i = 0; i < enc.length; i++) out[i] = enc[i] ^ _key[i % _key.length];
  return out.toString('utf8')
    .replace(/\\$\\{BOT_NAME\\}/g, String(config.botName || 'DEVA XMD-BOT'))
    .replace(/\\$\\{OWNER_NAME\\}/g, String(config.ownerName || 'DEVA'))
    .replace(/\\$\\{PREFIX\\}/g, String(config.prefix || '.'))
    .replace(/\\$\\{UPTIME\\}/g, formatUptime(process.uptime()));
}

module.exports = async (sock, msg) => {
  const menu = _menuText();
  const p = path.join(__dirname, '../media/menu.jpg');
  try {
    if (fs.existsSync(p)) {
      await sock.sendMessage(msg.key.remoteJid, {
        image: fs.readFileSync(p),
        mimetype: 'image/jpeg',
        caption: menu
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
    }
  } catch {
    await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });
  }
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  if (m || h || d) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
