"use strict";

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
let ffmpegStaticPath = null;
try {
  ffmpegStaticPath = require("ffmpeg-static");
} catch (error) {
  console.error("TOMP3: ffmpeg-static package could not be loaded:", error.message);
}
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { pipeline } = require("stream/promises");

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 180000;

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 8 && current; i++) {
    if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    else break;
  }
  return current || null;
}

function getQuotedMessage(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

async function saveVideoStream(videoMessage, destination) {
  const mediaStream = await downloadContentFromMessage(videoMessage, "video");
  let bytes = 0;
  const limiter = new (require("stream").Transform)({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_VIDEO_BYTES) {
        callback(new Error("Video is larger than the 80 MB limit."));
        return;
      }
      callback(null, chunk);
    }
  });
  await pipeline(mediaStream, limiter, fs.createWriteStream(destination, { flags: "wx" }));
  if (!bytes) throw new Error("WhatsApp returned an empty video file.");
  return bytes;
}

function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Some hosts block the ffmpeg-static postinstall download. In that case,
    // try the system-installed ffmpeg from PATH before reporting failure.
    const candidates = [];
    if (ffmpegStaticPath) candidates.push(ffmpegStaticPath);
    candidates.push("ffmpeg");
    let index = 0;
    let lastStartError = null;

    const tryNextBinary = () => {
      if (index >= candidates.length) {
        const detail = lastStartError ? ` (${lastStartError.message})` : "";
        reject(new Error(
          `FFmpeg executable unavailable. Install ffmpeg-static successfully or install system FFmpeg and ensure it is in PATH${detail}.`
        ));
        return;
      }

      const binary = candidates[index++];
      const child = spawn(binary, [
        "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-i", inputPath,
        "-vn", "-map", "0:a:0?",
        "-codec:a", "libmp3lame", "-b:a", "192k",
        "-f", "mp3", outputPath
      ], { stdio: ["ignore", "ignore", "pipe"] });

      let stderr = "";
      let settled = false;
      let started = false;
      let candidateFailedToStart = false;
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        if (!settled) {
          settled = true;
          reject(new Error("Conversion timed out after 3 minutes."));
        }
      }, FFMPEG_TIMEOUT_MS);
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };

      child.once("spawn", () => { started = true; });
      child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-3000); });
      child.once("error", error => {
        clearTimeout(timer);
        lastStartError = error;
        // spawn() can emit both 'error' and 'close'. Ignore close when it never started.
        if (error.code === "ENOENT" || error.code === "EACCES") {
          candidateFailedToStart = true;
          tryNextBinary();
        } else {
          finish(new Error(`Could not start FFmpeg: ${error.message}`));
        }
      });
      child.once("close", code => {
        if (settled || candidateFailedToStart) return;
        if (code === 0) finish();
        else if (!started && index < candidates.length) tryNextBinary();
        else finish(new Error(stderr.trim() || `FFmpeg exited with code ${code}.`));
      });
    };

    tryNextBinary();
  });
}

async function handleToMp3Command({ sock, jid, msg, quoted, prefix = ".", clearActionPresence = async () => {} }) {
  let workDir;
  try {
    const quotedMessage = unwrapMessage(getQuotedMessage(msg));
    const videoMessage = quotedMessage?.videoMessage;
    if (!videoMessage) {
      await sock.sendMessage(jid, {
        text: `🎵 *VIDEO TO MP3*\n\nवीडियो पर रिप्लाई करके *${prefix}tomp3* भेजें।\n\nअधिकतम वीडियो आकार: 80 MB`
      }, { quoted });
      return;
    }

    if (videoMessage.fileLength && Number(videoMessage.fileLength) > MAX_VIDEO_BYTES) {
      await sock.sendMessage(jid, { text: "❌ Video 80 MB से बड़ा है। कृपया छोटा वीडियो भेजें।" }, { quoted });
      return;
    }

    await sock.sendMessage(jid, { text: "⏳ वीडियो डाउनलोड करके MP3 बनाया जा रहा है..." }, { quoted });
    workDir = path.join(os.tmpdir(), `deva-tomp3-${crypto.randomBytes(8).toString("hex")}`);
    fs.mkdirSync(workDir, { recursive: false });
    const inputPath = path.join(workDir, "input-video");
    const outputPath = path.join(workDir, "audio.mp3");

    await saveVideoStream(videoMessage, inputPath);
    await convertToMp3(inputPath, outputPath);
    const stats = fs.statSync(outputPath);
    if (!stats.size) throw new Error("इस वीडियो में ऑडियो ट्रैक नहीं मिला।");
    if (stats.size > MAX_AUDIO_BYTES) throw new Error("बनी हुई MP3 64 MB से बड़ी है, इसलिए WhatsApp पर भेजना संभव नहीं है।");

    const audio = fs.readFileSync(outputPath);
    await sock.sendMessage(jid, {
      audio,
      mimetype: "audio/mpeg",
      fileName: "deva-audio.mp3",
      ptt: false
    }, { quoted });
  } catch (error) {
    console.error("TOMP3 ERROR:", error?.stack || error);
    let message = String(error?.message || "Unknown error");
    if (/no such file|not found|ENOENT/i.test(message) && /ffmpeg/i.test(message)) {
      message = "इस होस्टिंग पर FFmpeg उपलब्ध नहीं है। npm install के बाद bot दोबारा शुरू करें।";
    } else if (/larger than the 80 MB/i.test(message)) {
      message = "वीडियो 80 MB से बड़ा है। कृपया छोटा वीडियो भेजें।";
    } else if (/does not contain any stream|matches no streams|does not contain any.*audio|Output file #0 does not contain any stream/i.test(message)) {
      message = "इस वीडियो में ऑडियो ट्रैक नहीं मिला।";
    }
    await sock.sendMessage(jid, { text: `❌ *MP3 conversion failed*\n\n${message.slice(0, 350)}` }, { quoted }).catch(() => {});
  } finally {
    if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
    await clearActionPresence(sock, jid).catch(() => {});
  }
}

module.exports = { handleToMp3Command };
