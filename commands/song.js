const config = require('../config');
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { thumbnail: botCardThumbnail, makeCardQuote } = require('../lib/cardReply');

let ffmpeg = null;
let ffmpegPath = null;

try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    try { execSync(`"${ffmpegStatic}" -version`, { stdio: 'ignore' }); ffmpegPath = ffmpegStatic; } catch (_) {}
  }
} catch (_) {}

try {
  ffmpeg = require('fluent-ffmpeg');
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
  else {
    try { execSync('ffmpeg -version', { stdio: 'ignore' }); ffmpegPath = 'ffmpeg'; }
    catch (_) {
      try { execSync('/usr/bin/ffmpeg -version', { stdio: 'ignore' }); ffmpegPath = '/usr/bin/ffmpeg'; }
      catch (_) {}
    }
  }
} catch (_) {}

const cleanTitle = (value, fallback = 'audio') => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'object') {
    const candidate = value.text || value.simpleText || value.title || value.runs?.map?.(r => r.text).join('');
    return String(candidate || fallback).trim() || fallback;
  }
  return String(value).trim() || fallback;
};

function pickAudioUrl(data) {
  return data?.data?.audio || data?.audio || data?.result?.audio || data?.media?.audio || data?.data?.url || null;
}

async function downloadAudioFromApis(videoUrl) {
  const encoded = encodeURIComponent(videoUrl);
  const attempts = [];

  // API 1: direct MP3 stream. If the service is unavailable, continue to the fallback.
  attempts.push(async () => {
    const url = `https://api.gifted.co.ke/api/download/dlmp3v2?apikey=gifted&url=${encoded}&quality=128&stream=true`;
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 45000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.status >= 200 && res.status < 300 && Buffer.byteLength(res.data) > 1000) {
      return { buffer: Buffer.from(res.data), mimetype: res.headers['content-type'] || 'audio/mpeg' };
    }
    throw new Error(`Gifted API HTTP ${res.status}`);
  });

  // API 2: existing Nayan endpoint, kept as a fallback.
  attempts.push(async () => {
    const url = `https://nayan-video-downloader.vercel.app/ytdown?url=${encoded}`;
    const res = await axios.get(url, {
      timeout: 30000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`Nayan API HTTP ${res.status}`);
    const link = pickAudioUrl(res.data);
    if (!link) throw new Error('Nayan API did not return an audio link');
    const audioRes = await axios.get(link, {
      responseType: 'arraybuffer',
      timeout: 45000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (audioRes.status < 200 || audioRes.status >= 300 || Buffer.byteLength(audioRes.data) <= 1000) {
      throw new Error(`Audio CDN HTTP ${audioRes.status}`);
    }
    return { buffer: Buffer.from(audioRes.data), mimetype: 'audio/mpeg' };
  });

  let lastError = null;
  for (const attempt of attempts) {
    try { return await attempt(); }
    catch (e) { lastError = e; console.error('Song provider failed:', e?.message || e); }
  }
  throw lastError || new Error('All song download providers failed');
}

module.exports = async (sock, msg, args) => {
  const from = msg.key.remoteJid;
  const query = (args || []).join(' ').trim();
  const botName = config.botName || 'DEVA XMD-BOT';

  if (!query) {
    return sock.sendMessage(
      from,
      { text: `🎵 *${botName} SONG*\n\nPlease provide a song name.\nExample: ${config.prefix}song Believer\n\n⚡ Powered by ${botName}` },
      { quoted: msg }
    );
  }

  try {
    await sock.sendMessage(from, { text: '🔎 Searching song, please wait...' }, { quoted: msg });

    const search = await yts(query);
    const video = search?.videos?.[0];
    if (!video?.videoId) throw new Error('Song not found');

    const title = cleanTitle(video.title, query);
    const videoUrl = `https://youtu.be/${video.videoId}`;

    await sock.sendMessage(from, { text: '⬇️ Downloading MP3, please wait...' }, { quoted: msg });

    const { buffer: audioBuffer, mimetype } = await downloadAudioFromApis(videoUrl);
    if (!audioBuffer || audioBuffer.length < 1000) throw new Error('Empty audio received');

    // Convert only when ffmpeg is actually available. The final WhatsApp message
    // is ALWAYS an audio message, never a document/file message.
    let finalBuffer = audioBuffer;
    let finalMime = mimetype || 'audio/mpeg';
    const tempDir = process.env.TEMP_DIR || './temp';

    if (ffmpeg && ffmpegPath) {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const inputPath = path.join(tempDir, `${stamp}.input`);
      const outputPath = path.join(tempDir, `${stamp}.mp3`);
      fs.writeFileSync(inputPath, audioBuffer);
      try {
        await new Promise((resolve, reject) => {
          let settled = false;
          const finish = err => { if (settled) return; settled = true; err ? reject(err) : resolve(); };
          ffmpeg(inputPath)
            .audioBitrate(128)
            .audioCodec('libmp3lame')
            .toFormat('mp3')
            .on('end', () => finish())
            .on('error', err => finish(err))
            .save(outputPath);
          setTimeout(() => finish(new Error('FFmpeg timeout')), 30000);
        });
        if (fs.existsSync(outputPath)) {
          finalBuffer = fs.readFileSync(outputPath);
          finalMime = 'audio/mpeg';
        }
      } catch (e) {
        console.error('Song FFmpeg conversion skipped:', e?.message || e);
      } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (_) {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
      }
    }

    await sock.sendMessage(
      from,
      {
        audio: finalBuffer,
        mimetype: finalMime,
        ptt: false,
        jpegThumbnail: botCardThumbnail,
        fileName: `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`
      },
      { quoted: makeCardQuote(msg) }
    );
  } catch (error) {
    console.error('Song command error:', error?.stack || error);
    await sock.sendMessage(
      from,
      { text: `❌ Song download failed.\n\n${error?.message || 'Service unavailable'}\n\n⚡ Powered by ${botName}` },
      { quoted: msg }
    );
  }
};
