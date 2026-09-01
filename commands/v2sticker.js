const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');

function getFfmpegPath() {
  // Prefer the server's FFmpeg. Dockerfile installs a full build with
  // libwebp_anim, which is required for animated WebP stickers.
  try {
    const p = execFileSync('sh', ['-lc', 'command -v ffmpeg'], { encoding: 'utf8' }).trim();
    if (p) return p;
  } catch (_) {}

  // Fallback for hosts that do not provide a system FFmpeg.
  try {
    const p = require('ffmpeg-static');
    if (p) return p;
  } catch (_) {}

  throw new Error('FFmpeg is not installed or available on this server.');
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function getVideoMessage(msg) {
  const direct = msg.message?.videoMessage;
  if (direct) return direct;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted?.videoMessage) return quoted.videoMessage;

  // Some WhatsApp messages wrap the quoted content one level deeper.
  const quotedViewOnce = quoted?.viewOnceMessage?.message;
  if (quotedViewOnce?.videoMessage) return quotedViewOnce.videoMessage;

  const quotedViewOnceV2 = quoted?.viewOnceMessageV2?.message;
  if (quotedViewOnceV2?.videoMessage) return quotedViewOnceV2.videoMessage;

  return null;
}

function runFfmpeg(input, output, args) {
  const ffmpegPath = getFfmpegPath();
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', input,
      ...args,
      output
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
    });
  });
}

async function makeAnimatedSticker(input, output) {
  // Keep trying smaller profiles. WhatsApp animated stickers need to be
  // compact enough to send reliably; every profile also produces real
  // animated WebP (not a single-frame WebP).
  const profiles = [
    { t: 5, size: 512, fps: 12, q: 60 },
    { t: 5, size: 480, fps: 10, q: 52 },
    { t: 4, size: 400, fps: 10, q: 45 },
    { t: 3.5, size: 360, fps: 8, q: 38 },
    { t: 3, size: 320, fps: 8, q: 32 },
    { t: 2.5, size: 256, fps: 6, q: 26 },
    { t: 2, size: 224, fps: 6, q: 22 }
  ];

  let lastError = null;
  let lastSize = 0;

  for (const profile of profiles) {
    try {
      const vf = [
        `scale=${profile.size}:${profile.size}:force_original_aspect_ratio=decrease:flags=lanczos`,
        `pad=${profile.size}:${profile.size}:(ow-iw)/2:(oh-ih)/2:color=black`,
        `fps=${profile.fps}`,
        'format=yuv420p'
      ].join(',');

      await runFfmpeg(input, output, [
        '-t', String(profile.t),
        '-vf', vf,
        '-an',
        '-c:v', 'libwebp_anim',
        '-loop', '0',
        '-preset', 'picture',
        '-q:v', String(profile.q),
        '-compression_level', '6'
      ]);

      const stat = await fs.stat(output);
      lastSize = stat.size;
      if (lastSize > 0 && lastSize <= 500 * 1024) return;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError && !lastSize) {
    throw new Error(`FFmpeg conversion failed: ${lastError.message}`);
  }
  throw new Error(`Animated sticker is too large (${Math.round(lastSize / 1024)} KB)`);
}

module.exports = async (sock, msg) => {
  const video = getVideoMessage(msg);
  if (!video) {
    return sock.sendMessage(
      msg.key.remoteJid,
      { text: '╭━━〔 🎬 VIDEO STICKER 〕━━╮\n┃ Reply to a video and send .v2sticker\n┃ Or send a video with .v2sticker as caption\n╰━━━━━━━━━━━━━━━━━╯' },
      { quoted: msg }
    );
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deva-v2sticker-'));
  const inputPath = path.join(workDir, 'input');
  const outputPath = path.join(workDir, 'sticker.webp');

  try {
    const stream = await downloadContentFromMessage(video, 'video');
    const input = await streamToBuffer(stream);
    if (!input.length) throw new Error('Downloaded video is empty.');
    await fs.writeFile(inputPath, input);

    await makeAnimatedSticker(inputPath, outputPath);
    const sticker = await fs.readFile(outputPath);

    // Do not send as a normal document/image; Baileys will mark this as a
    // sticker and WhatsApp can play the animated WebP frames.
    await sock.sendMessage(
      msg.key.remoteJid,
      { sticker, mimetype: 'image/webp' },
      { quoted: msg }
    );
  } catch (e) {
    console.log('Video to animated sticker error:', e?.stack || e?.message || e);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: '╭━━〔 ❌ VIDEO STICKER ERROR 〕━━╮\n┃ Video conversion failed.\n┃ Please make sure FFmpeg is installed.\n┃ Try a short MP4 clip (2–5 seconds).\n╰━━━━━━━━━━━━━━━━━━━━╯' },
      { quoted: msg }
    );
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};
