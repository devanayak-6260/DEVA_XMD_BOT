const config = require('../config');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const ffprobeStatic = require('ffprobe-static');

// Prexzy currently exposes multiple Instagram downloader endpoints.
// Try the dedicated endpoint first, then the newer IG/AIO fallbacks.
const APIS = [
  'https://prexzyapis.com/download/instagram',
  'https://prexzyapis.com/download/igv2',
  'https://prexzyapis.com/download/aio'
];

function isInstagramUrl(value) {
  return /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv|stories|share)\//i.test(value || '');
}

function extractUrls(text) {
  return [...new Set(
    String(text || '')
      .match(/https?:\/\/(?:www\.)?instagram\.com\/[^^\s<>]+/gi)
      ?.map(u => u.replace(/[),\]} >"'`]+$/g, '')) || []
  )];
}

function formatDuration(value) {
  if (value === undefined || value === null || value === '') return '00:00';
  if (typeof value === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) return value;
  const seconds = Math.max(0, Math.round(Number(value)));
  if (!Number.isFinite(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mediaType(url, key = '') {
  const u = String(url).toLowerCase();
  const k = String(key).toLowerCase();
  if (/\.(mp4|m4v|mov|webm)(?:[?#]|$)/i.test(u)) return 'video';
  if (/(video|mp4|play|source|stream)/i.test(k)) return 'video';
  return 'image';
}

function addMedia(out, seen, url, type, duration) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
  if (/instagram\.com\/(?:p|reel|reels|tv|stories|share)\b/i.test(url)) return;
  if (seen.has(url)) return;
  seen.add(url);
  out.push({ url, type: type || mediaType(url), duration });
}

function normalizeResponse(data) {
  const out = [];
  const seen = new Set();
  const durationKeys = ['duration', 'durationseconds', 'videoduration', 'length', 'video_duration'];

  function walk(node, parentKey = '', inheritedDuration) {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parentKey, inheritedDuration);
      return;
    }
    if (typeof node !== 'object') return;

    let duration = inheritedDuration;
    for (const key of Object.keys(node)) {
      if (durationKeys.includes(key.toLowerCase()) && node[key] !== undefined) {
        duration = node[key];
        break;
      }
    }

    for (const [key, value] of Object.entries(node)) {
      const k = key.toLowerCase();
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        const mediaKey = /(url|download|media|video|image|source|src|play|stream|link)/i.test(k);
        const isKnownMediaFile = /\.(mp4|m4v|mov|webm|jpg|jpeg|png|webp)(?:[?#]|$)/i.test(value);
        const isBad = /(avatar|profile|thumbnail|thumb|cover|instagram\.com\/)/i.test(k) || /instagram\.com\/(?:p|reel|reels|tv|stories|share)\b/i.test(value);
        if ((mediaKey || isKnownMediaFile) && !isBad) {
          addMedia(out, seen, value, mediaType(value, k), duration);
        }
      } else if (value && typeof value === 'object') {
        walk(value, k, duration);
      }
    }
  }

  walk(data);
  return out;
}

async function callApi(endpoint, url) {
  const response = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
      'Accept': 'application/json,text/plain,*/*'
    },
    signal: AbortSignal.timeout(60000)
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error('API returned invalid JSON');
  }
  if (!response.ok) throw new Error(data?.message || data?.error || `API ${response.status}`);

  const items = normalizeResponse(data);
  if (!items.length) throw new Error(data?.message || data?.error || 'No downloadable media found');
  return items;
}

async function resolveInstagram(url) {
  let lastError;
  for (const endpoint of APIS) {
    try {
      return await callApi(endpoint, url);
    } catch (e) {
      lastError = e;
      console.log(`Instagram API failed (${endpoint}):`, e?.message || e);
    }
  }
  throw lastError || new Error('No Instagram downloader available');
}

function getQuotedText(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo;
  const q = context?.quotedMessage;
  return q?.conversation ||
    q?.extendedTextMessage?.text ||
    q?.imageMessage?.caption ||
    q?.videoMessage?.caption ||
    '';
}

async function probeDuration(filePath) {
  return await new Promise((resolve) => {
    const proc = spawn(ffprobeStatic.path, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { windowsHide: true });

    let output = '';
    proc.stdout.on('data', chunk => { output += chunk.toString(); });
    proc.on('error', () => resolve(null));
    proc.on('close', code => {
      const seconds = Number.parseFloat(output.trim());
      resolve(code === 0 && Number.isFinite(seconds) && seconds >= 0 ? seconds : null);
    });
  });
}

async function downloadVideoForDuration(url) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'deva-ig-'));
  const filePath = path.join(dir, 'media.mp4');
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(120000)
    });
    if (!response.ok || !response.body) throw new Error(`Video fetch failed: HTTP ${response.status}`);

    await pipeline(response.body, fs.createWriteStream(filePath));
    const duration = await probeDuration(filePath);
    return { filePath, dir, duration };
  } catch (error) {
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function cleanupTemp(temp) {
  if (!temp?.dir) return;
  await fs.promises.rm(temp.dir, { recursive: true, force: true }).catch(() => {});
}

module.exports = async (sock, msg, args) => {
  const jid = msg.key.remoteJid;
  try {
    const body = args.join(' ').trim();
    const input = body || getQuotedText(msg);
    const urls = extractUrls(input).filter(isInstagramUrl);

    if (!urls.length) {
      return await sock.sendMessage(jid, {
        text: `╭━━〔 📥 INSTAGRAM DOWNLOADER 〕━━╮\n┃\n┃ Please send an Instagram link.\n┃ Example : ${config.prefix}insta <instagram-link>\n┃\n╰━━━━━━━━━━━━━━━━━━━━╯`
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      text: `╭━━〔 📥 INSTAGRAM DOWNLOAD 〕━━╮\n┃\n┃ Links  : ${urls.length}\n┃ Status : FETCHING... ⏳\n┃\n╰━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });

    let sent = 0;
    let failed = 0;

    for (const instagramUrl of urls) {
      try {
        const media = await resolveInstagram(instagramUrl);

        for (const item of media) {
          if (item.type === 'video') {
            let temp = null;
            try {
              // API metadata is used first, but ffprobe reads the actual video so
              // Duration never stays 00:00 when the provider omits metadata.
              temp = await downloadVideoForDuration(item.url);
              const duration = temp.duration ?? item.duration;
              const videoSource = temp.filePath;

              await sock.sendMessage(jid, {
                video: { url: videoSource },
                mimetype: 'video/mp4',
                caption: `🏆 *INSTAGRAM VIP DOWNLOADER* 🏆\n\n🎬 Your media has been downloaded!\n━━━━━━━━━━━━━━━━\n📥 Downloaded  : ✅\n🎥 Quality      : HD\n⏱️ Duration     : ${formatDuration(duration)}\n📁 File Format  : MP4\n⚡ Status       : Completed\n━━━━━━━━━━━━━━━━\n\n💎 *POWERED BY DEVA XMD BOT*`
              }, { quoted: msg });
            } finally {
              await cleanupTemp(temp);
            }
          } else {
            await sock.sendMessage(jid, {
              image: { url: item.url },
              mimetype: 'image/jpeg',
              caption: `🏆 *INSTAGRAM VIP DOWNLOADER* 🏆\n\n🎬 Your media has been downloaded!\n━━━━━━━━━━━━━━━━\n📥 Downloaded  : ✅\n🎥 Quality      : HD\n📁 File Format  : JPG\n⚡ Status       : Completed\n━━━━━━━━━━━━━━━━\n\n💎 *POWERED BY DEVA XMD BOT*`
            }, { quoted: msg });
          }
          sent++;
        }
      } catch (e) {
        failed++;
        console.log('Instagram download error:', e?.message || e);
      }
    }

    if (!sent) {
      return await sock.sendMessage(jid, {
        text: '╭━━〔 ⚠️ MEDIA NOT FOUND 〕━━╮\n┃ No downloadable public media was found.\n┃ Please check the Instagram link and try again.\n╰━━━━━━━━━━━━━━━━━━━━╯'
      }, { quoted: msg });
    }

    if (failed) {
      await sock.sendMessage(jid, {
        text: `╭━━〔 📥 DOWNLOAD SUMMARY 〕━━╮\n┃\n┃ Sent   : ${sent} ✅\n┃ Failed : ${failed} ⚠️\n┃\n╰━━━━━━━━━━━━━━━━━━━━╯`
      }, { quoted: msg });
    }
  } catch (e) {
    console.log('Instagram command error:', e?.stack || e);
    await sock.sendMessage(jid, {
      text: '╭━━〔 ❌ INSTAGRAM ERROR 〕━━╮\n┃ Downloader is temporarily unavailable.\n┃ Please try again later.\n╰━━━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }
};
