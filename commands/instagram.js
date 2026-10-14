const fs = require("fs");
const path = require("path");

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || (() => {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "settings.json"), "utf8"));
    return String(raw.apify_token || "").trim();
  } catch {
    return "";
  }
})();
const APIFY_INSTAGRAM_ACTOR = "apify~instagram-scraper";
const APIFY_INSTAGRAM_REEL_ACTOR = "apify~instagram-reel-scraper";
function formatInstagramFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
function buildInstagramDownloadCaption(media) {
  const rawCaption = String(media?.caption || "").trim();
  const cleanCaption = rawCaption
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const captionText = cleanCaption || "No caption";

  return `╭─〔 *📥 INSTAGRAM* 〕─╮

     ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏᴍᴩʟᴇᴛᴇ ✅

📦 File Size   ─ ${formatInstagramFileSize(media?.buffer?.length)}
📝 Caption     ─ ${captionText.slice(0, 700)}

╭────────────────╮
 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇᴠᴀ xᴍᴅ ʙᴏᴛ ✦
╰────────────────╯`;
}

function truncateSongTitle(title, wordLimit = 35) {
  const safeTitle = String(title || "Unknown").trim();
  const words = safeTitle.split(/\s+/);
  if (words.length <= wordLimit) return safeTitle;
  return words.slice(0, wordLimit).join(" ") + " ......";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return data;
}

function extractInstagramUrl(value) {
  // WhatsApp can add line breaks, invisible characters, punctuation, or a
  // link-preview around the command text. Always extract the actual Instagram
  // URL from the whole message instead of assuming everything after the command
  // is the URL.
  const input = String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = input.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9._-]+(?:\/)?(?:\?[^\s<>]*)?(?:#[^\s<>]*)?/i);
  if (!match) return "";

  // Remove only trailing punctuation that can be attached by normal chat text;
  // keep Instagram query parameters such as ?stkn=... intact.
  return match[0].replace(/[),.!]+$/g, "");
}

function isInstagramUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    const host = String(u.hostname || "").toLowerCase();
    const validHost = host === "instagram.com" || host === "www.instagram.com";
    const validPath = /^\/(?:p|reel|tv)\/[A-Za-z0-9._-]+(?:\/)?$/i.test(u.pathname);
    return validHost && validPath;
  } catch {
    return false;
  }
}

async function apifyInstagramRun(actor, input, timeoutMs = 120000) {
  if (!APIFY_API_TOKEN) throw new Error("Apify API token is not configured.");
  const endpoint = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_API_TOKEN)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal
    });
    const raw = await response.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || `Apify HTTP ${response.status}`);
    }
    if (!Array.isArray(data) || !data.length) {
      throw new Error("Apify returned no Instagram media.");
    }
    const item = data.find(x => !x?.error) || data[0];
    if (item?.error) {
      throw new Error(item.errorDescription || item.error || "Instagram scraper error.");
    }
    return item;
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Instagram server took too long to respond. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchInstagramMediaUrl(mediaUrl, timeoutMs = 90000) {
  if (!mediaUrl) throw new Error("Instagram media URL was not returned by Apify.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(mediaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        "Referer": "https://www.instagram.com/"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Media download failed (${response.status}).`);
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error("Instagram returned an empty media file.");
    return { buffer, contentType };
  } catch (e) {
    if (e?.name === "AbortError") throw new Error("Instagram media download timed out. Please try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadInstagramMedia(instagramUrl) {
  if (!APIFY_API_TOKEN) throw new Error("Apify API token is not configured.");

  const parsed = new URL(instagramUrl);
  const isReel = /^\/reel\//i.test(parsed.pathname);
  const actor = isReel ? APIFY_INSTAGRAM_REEL_ACTOR : APIFY_INSTAGRAM_ACTOR;

  // First try the normal signed CDN video URL. This is faster and avoids waiting
  // for Apify to make a second stored copy of every video.
  let item = await apifyInstagramRun(actor, isReel
    ? { username: [instagramUrl], resultsLimit: 1, includeDownloadedVideo: false }
    : { directUrls: [instagramUrl], resultsType: "posts", resultsLimit: 1, maxRequestRetries: 3,
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } }
  );

  let mediaUrl = item.videoUrl || item.displayUrl || item.images?.[0];
  let downloadedCopy = false;

  // If Instagram did not expose a usable direct URL, ask Apify for its stored
  // copy as a fallback. This costs extra only when the fast path fails.
  if (!mediaUrl || !item.videoUrl) {
    item = await apifyInstagramRun(APIFY_INSTAGRAM_REEL_ACTOR, {
      username: [instagramUrl],
      resultsLimit: 1,
      includeDownloadedVideo: true
    });
    mediaUrl = item.downloadedVideo || item.videoUrl || item.displayUrl || item.images?.[0];
    downloadedCopy = Boolean(item.downloadedVideo);
  }

  let fetched;
  try {
    fetched = await fetchInstagramMediaUrl(mediaUrl);
  } catch (firstError) {
    // A signed Instagram CDN URL can expire/reject the bot host. For reels,
    // retry once using Apify's stored downloaded copy.
    if (isReel && !downloadedCopy) {
      const fallbackItem = await apifyInstagramRun(APIFY_INSTAGRAM_REEL_ACTOR, {
        username: [instagramUrl],
        resultsLimit: 1,
        includeDownloadedVideo: true
      });
      const fallbackUrl = fallbackItem.downloadedVideo || fallbackItem.videoUrl;
      if (!fallbackUrl || fallbackUrl === mediaUrl) throw firstError;
      fetched = await fetchInstagramMediaUrl(fallbackUrl);
      item = fallbackItem;
      mediaUrl = fallbackUrl;
      downloadedCopy = Boolean(fallbackItem.downloadedVideo);
    } else {
      throw firstError;
    }
  }

  const video = Boolean(item.videoUrl || item.downloadedVideo) || String(item.type || "").toLowerCase() === "video";
  return {
    buffer: fetched.buffer,
    isVideo: video,
    contentType: video ? "video/mp4" : fetched.contentType,
    caption: String(item.caption || "").trim(),
    owner: String(item.ownerUsername || item.username || "").trim(),
    type: String(item.type || "").trim()
  };
}



async function handleInstagramCommand({ sock, jid, quoted, text, prefix, clearActionPresence }) {
  const instagramUrl = extractInstagramUrl(text);
  if (!instagramUrl) {
    await sock.sendMessage(jid, { text: `❌ Instagram URL missing.\n\nUse:\n${prefix || ""}instagram <Instagram post/reel URL>` }, { quoted });
    await clearActionPresence(sock, jid);
    return;
  }
  if (!isInstagramUrl(instagramUrl)) {
    await sock.sendMessage(jid, { text: "❌ Invalid Instagram URL.\n\nSend a public Instagram post or reel link." }, { quoted });
    await clearActionPresence(sock, jid);
    return;
  }
  try {
    await sock.sendMessage(jid, { text: "⏳ *Downloading Instagram media...*" }, { quoted });
    const media = await downloadInstagramMedia(instagramUrl);
    const caption = buildInstagramDownloadCaption(media);
    if (media.isVideo) {
      await sock.sendMessage(jid, { video: media.buffer, mimetype: media.contentType.startsWith("video/") ? media.contentType : "video/mp4", caption }, { quoted });
    } else {
      await sock.sendMessage(jid, { image: media.buffer, mimetype: media.contentType.startsWith("image/") ? media.contentType : "image/jpeg", caption }, { quoted });
    }
  } catch (e) {
    console.error("INSTAGRAM ERROR:", e?.message || e);
    await sock.sendMessage(jid, { text: `❌ *Instagram download failed.*\n\n${e?.message || "Please try another public Instagram post/reel."}` }, { quoted });
  }
  await clearActionPresence(sock, jid);
}
module.exports = { handleInstagramCommand };
