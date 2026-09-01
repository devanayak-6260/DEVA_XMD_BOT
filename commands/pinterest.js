const config = require('../config');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const { spawn, execFileSync } = require('child_process');
const ffprobeStatic = require('ffprobe-static');

function extractPinterestUrls(text) {
  return [...new Set(String(text || '').match(/https?:\/\/(?:www\.)?(?:pinterest\.[a-z.]+|pin\.it)\/[^\s<>]+/gi)?.map(u => u.replace(/[),\]} >"'`]+$/g, '')) || [])];
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\\u002F/gi, '/').replace(/\\\//g, '/').replace(/\\u0026/gi, '&');
}

function cleanUrl(url) {
  let u = decodeHtml(url).trim();
  try { u = JSON.parse('"' + u.replace(/"/g, '\\"') + '"'); } catch (_) {}
  return u.replace(/\\\//g, '/').replace(/\\u0026/gi, '&').replace(/\\u003F/gi, '?');
}

function findMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i');
  return decodeHtml((html.match(re1) || html.match(re2))?.[1] || '');
}

function addCandidate(found, seen, url, type, quality = 0) {
  const clean = cleanUrl(url);
  if (!/^https?:\/\//i.test(clean) || seen.has(clean)) return;
  if (/pinimg\.com\/(?:[a-z]+-)?(?:avatars|users)\//i.test(clean)) return;
  const lower = clean.toLowerCase();
  // Only treat actual Pinterest video CDN URLs / video extensions as video.
  // A JSON field named `video` can still point to a poster/thumbnail, so the
  // field name alone must never force video classification.
  const isVideo = /(?:v1|v2)\.pinimg\.com\/videos\//i.test(lower) || /\.(?:mp4|m4v|webm)(?:[?#]|$)/i.test(lower) || /\.m3u8(?:[?#]|$)/i.test(lower);
  seen.add(clean);
  found.push({ url: clean, type: isVideo ? 'video' : 'image', quality });
}

function findJsonMedia(html) {
  const found = [];
  const seen = new Set();

  // Direct Pinterest CDN video URLs. These are the most reliable source for video pins.
  const directVideoRe = /https?:\\?\/\\?\/(?:v1|v2)\.pinimg\.com\/videos\/[^"'<>\\\s\\]+/gi;
  let m;
  while ((m = directVideoRe.exec(html))) {
    addCandidate(found, seen, m[0], 'video', qualityFromUrl(m[0]));
  }

  // SSR / Relay JSON commonly exposes videos as videos.videoList / video_list.
  // Extract the actual pinimg video CDN URL, not a poster image accidentally
  // stored in a field named `video`.
  const videoUrlRe = /https?:\\?\/\\?\/(?:v1|v2)\.pinimg\.com\/videos\/[^"'< >\\\s]+/gi;
  while ((m = videoUrlRe.exec(html))) {
    addCandidate(found, seen, m[0], 'video', qualityFromUrl(m[0]));
  }

  // Other direct media URLs from SSR / Relay JSON.
  const keyRe = /(?:download_url|downloadUrl|originals?|orig|src|url)\s*["']?\s*[:=]\s*["'](https?:\\?\/\\?\/[^"']+)["']/gi;
  while ((m = keyRe.exec(html))) {
    addCandidate(found, seen, m[1], undefined, qualityFromUrl(m[1]));
  }

  // Generic CDN URLs, including escaped JSON strings.
  const cdnRe = /https?:\\?\/\\?\/(?:i|v1|v2)\.pinimg\.com\/[^"'<>\s\\]+/gi;
  while ((m = cdnRe.exec(html))) {
    const u = m[0];
    addCandidate(found, seen, u, /\/videos\//i.test(u) || /\.(?:mp4|m4v|m3u8)(?:[?#]|$)/i.test(u) ? 'video' : 'image', qualityFromUrl(u));
  }

  return found;
}

function qualityFromUrl(url) {
  const s = String(url || '').toLowerCase();
  const match = s.match(/(?:v_|v)(\d{3,4})p|(?:\/)(\d{3,4})p(?:\/|$)/i);
  return Number(match?.[1] || match?.[2] || (s.includes('/originals/') ? 10000 : 0));
}

function sortVideos(media) {
  return media.filter(x => x.type === 'video').sort((a, b) => {
    const am = /\.m3u8(?:[?#]|$)/i.test(a.url) ? 0 : 1;
    const bm = /\.m3u8(?:[?#]|$)/i.test(b.url) ? 0 : 1;
    return (bm - am) || (b.quality - a.quality);
  });
}

function pickBestMedia(media) {
  const videos = sortVideos(media);
  if (videos.length) return videos[0];
  const images = media.filter(x => x.type === 'image');
  images.sort((a, b) => b.quality - a.quality);
  return images[0] || null;
}

async function resolvePin(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Pinterest page HTTP ${response.status}`);
  const html = await response.text();
  const media = [];

  const ogVideo = findMeta(html, 'og:video');
  const ogVideoSecure = findMeta(html, 'og:video:secure_url');
  const ogImage = findMeta(html, 'og:image');
  if (ogVideo) media.push({ url: ogVideo, type: 'video', quality: qualityFromUrl(ogVideo) });
  if (ogVideoSecure) media.push({ url: ogVideoSecure, type: 'video', quality: qualityFromUrl(ogVideoSecure) });
  media.push(...findJsonMedia(html));
  if (ogImage && !media.some(x => x.type === 'video')) media.push({ url: ogImage, type: 'image', quality: qualityFromUrl(ogImage) });

  const unique = [];
  const seen = new Set();
  for (const item of media) {
    const clean = cleanUrl(item.url);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    unique.push({ ...item, url: clean });
  }
  const videos = sortVideos(unique);
  if (videos.length) return { ...videos[0], alternatives: videos.slice(1) };
  const best = pickBestMedia(unique);
  if (!best) throw new Error('No public downloadable media found');
  return best;
}

async function downloadToTemp(url, extension = 'mp4') {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'deva-pin-'));
  const filePath = path.join(dir, `media.${extension}`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
        'Accept': extension === 'mp4' ? 'video/mp4,video/*;q=0.9,*/*;q=0.8' : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.pinterest.com/',
        'Origin': 'https://www.pinterest.com'
      },
      signal: AbortSignal.timeout(120000)
    });
    if (!response.ok || !response.body) throw new Error(`Media HTTP ${response.status}`);
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error('Pinterest returned a webpage instead of the media file');
    }
    await pipeline(response.body, fs.createWriteStream(filePath));
    const stat = await fs.promises.stat(filePath);
    if (!stat.size) throw new Error('Empty media response');
    return { dir, filePath };
  } catch (e) {
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }
}

function getFfmpegPath() {
  // Prefer a working system FFmpeg. Some hosts install ffmpeg-static's
  // package but remove/disable its binary, which causes ENOENT.
  const candidates = [];
  try {
    const p = execFileSync('sh', ['-lc', 'command -v ffmpeg'], { encoding: 'utf8' }).trim();
    if (p) candidates.push(p);
  } catch (_) {}
  try {
    const p = require('ffmpeg-static');
    if (p) candidates.push(p);
  } catch (_) {}
  for (const p of candidates) {
    try {
      execFileSync(p, ['-version'], { stdio: 'ignore' });
      return p;
    } catch (_) {}
  }
  throw new Error('FFmpeg is not available on this server. Install ffmpeg on the host.');
}

async function hasUsableVideoStream(filePath) {
  try {
    const probe = ffprobeStatic.path;
    await new Promise((resolve, reject) => {
      const proc = spawn(probe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', filePath], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('error', reject);
      proc.on('close', code => code === 0 ? resolve(out) : reject(new Error(err || `ffprobe exited ${code}`)));
    });
    const data = JSON.parse(await new Promise((resolve) => {
      const proc = spawn(probe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', filePath]);
      let out=''; proc.stdout.on('data', d=>out+=d.toString()); proc.on('close',()=>resolve(out));
    }));
    return Array.isArray(data.streams) && data.streams.length > 0;
  } catch (_) { return false; }
}

async function makePlayableMp4(inputPath, dir) {
  const ffmpegPath = getFfmpegPath();
  const outputPath = path.join(dir, 'playable.mp4');

  const run = (args) => new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('error', reject);
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(err.trim() || `FFmpeg exited ${code}`)));
  });

  // Let FFmpeg choose the streams. This handles video-only Pins without
  // failing on a missing audio stream, then encodes to WhatsApp-friendly MP4.
  await run([
    '-hide_banner', '-loglevel', 'error',
    '-i', inputPath,
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    '-y', outputPath
  ]).catch(async firstError => {
    // Final fallback for video-only sources / unusual audio streams.
    await run([
      '-hide_banner', '-loglevel', 'error',
      '-i', inputPath,
      '-an',
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y', outputPath
    ]).catch(() => { throw firstError; });
  });

  const stat = await fs.promises.stat(outputPath).catch(() => null);
  if (!stat?.size) throw new Error('Could not create a playable MP4');
  return outputPath;
}

async function downloadHlsToMp4(url) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'deva-pin-hls-'));
  const filePath = path.join(dir, 'media.mp4');
  const ffmpegPath = getFfmpegPath();

  await new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-user_agent', 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
      '-headers', 'Referer: https://www.pinterest.com/\r\nOrigin: https://www.pinterest.com\r\n',
      '-i', url,
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', '-y', filePath
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('error', reject);
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(err.trim() || `FFmpeg exited ${code}`)));
  });
  const stat = await fs.promises.stat(filePath).catch(() => null);
  if (!stat?.size) throw new Error('HLS conversion produced no video');
  return { dir, filePath };
}

async function cleanup(temp) {
  if (temp?.dir) await fs.promises.rm(temp.dir, { recursive: true, force: true }).catch(() => {});
}

module.exports = async (sock, msg, args) => {
  const jid = msg.key.remoteJid;
  const urls = extractPinterestUrls((args || []).join(' '));
  if (!urls.length) {
    return sock.sendMessage(jid, {
      text: `╭━━〔 📌 PINTEREST DOWNLOADER 〕━━╮\n┃\n┃ Send a public Pinterest link.\n┃ Example : ${config.prefix}pin <pinterest-link>\n┃ Alias   : ${config.prefix}pinterest <pinterest-link>\n┃\n┃ 🔑 API KEY : NOT REQUIRED\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }

  await sock.sendMessage(jid, {
    text: `╭━━〔 📌 PINTEREST DOWNLOAD 〕━━╮\n┃\n┃ Links  : ${urls.length}\n┃ Status : FETCHING... ⏳\n┃ 🔑 API  : NOT REQUIRED\n┃\n╰━━━━━━━━━━━━━━━╯`
  }, { quoted: msg });

  let sent = 0;
  for (const pinUrl of urls) {
    try {
      const item = await resolvePin(pinUrl);
      if (item.type === 'video') {
        let temp = null;
        let playablePath = null;
        const candidates = [item, ...(item.alternatives || [])];
        let lastError = null;
        try {
          for (const candidate of candidates) {
            try {
              temp = /\.m3u8(?:[?#]|$)/i.test(candidate.url)
                ? await downloadHlsToMp4(candidate.url)
                : await downloadToTemp(candidate.url, 'mp4');
              if (!/\.m3u8(?:[?#]|$)/i.test(candidate.url) && !(await hasUsableVideoStream(temp.filePath))) {
                throw new Error('Pinterest returned a video URL without a usable video stream');
              }
              playablePath = await makePlayableMp4(temp.filePath, temp.dir);
              break;
            } catch (candidateError) {
              lastError = candidateError;
              await cleanup(temp);
              temp = null;
            }
          }
          if (!playablePath) throw lastError || new Error('No playable Pinterest video was found');
          await sock.sendMessage(jid, {
            video: { url: playablePath },
            mimetype: 'video/mp4',
            caption: '📌 *PINTEREST DOWNLOADER*\n\n📥 Downloaded : ✅\n🎥 Type       : Video\n🔑 API Key    : Not Required\n⚡ Status     : Completed\n\n💎 *POWERED BY DEVA XMD BOT*'
          }, { quoted: msg });
        } finally { await cleanup(temp); }
      } else {
        let temp = null;
        try {
          const ext = /\.(png)(?:[?#]|$)/i.test(item.url) ? 'png' : /\.(webp)(?:[?#]|$)/i.test(item.url) ? 'webp' : 'jpg';
          temp = await downloadToTemp(item.url, ext);
          await sock.sendMessage(jid, {
            image: { url: temp.filePath },
            mimetype: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
            caption: '📌 *PINTEREST DOWNLOADER*\n\n📥 Downloaded : ✅\n🖼️ Type       : Photo\n🔑 API Key    : Not Required\n⚡ Status     : Completed\n\n💎 *POWERED BY DEVA XMD BOT*'
          }, { quoted: msg });
        } finally { await cleanup(temp); }
      }
      sent++;
    } catch (e) {
      console.log('Pinterest download error:', e?.stack || e?.message || e);
      await sock.sendMessage(jid, {
        text: `╭━━〔 ⚠️ PINTEREST ERROR 〕━━╮\n┃\n┃ ${String(e?.message || 'Unable to download media').slice(0, 180)}\n┃\n┃ API Key : Not Required\n╰━━━━━━━━━━━━━━━━━━╯`
      }, { quoted: msg });
    }
  }

  if (!sent) {
    return sock.sendMessage(jid, {
      text: '╭━━〔 ❌ PINTEREST DOWNLOAD FAILED 〕━━╮\n┃ No public downloadable media was found.\n┃ The Pin may be private or Pinterest may\n┃ have changed its page structure.\n╰━━━━━━━━━━━━━━━━━━━━━╯'
    }, { quoted: msg });
  }

  return sock.sendMessage(jid, {
    text: `╭━━〔 📌 PINTEREST COMPLETE 〕━━╮\n┃\n┃ Media Sent : ${sent} ✅\n┃ API Key    : Not Required 🔓\n┃ Status     : COMPLETED\n┃\n━━━━━━━━━━━━━╯`
  }, { quoted: msg });
};
