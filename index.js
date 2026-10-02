const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const now = require("performance-now");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// ImgBB API key for the URL command. Prefer the environment variable in production.
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '8b468bac6311f8b2fd23d20e90186ac8';

// Instagram downloader via Apify.
// Prefer APIFY_API_TOKEN in production; settings.json is kept as a fallback
// so the feature works immediately after deployment.
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || (() => {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "settings.json"), "utf8"));
    return String(raw.apify_token || "").trim();
  } catch {
    return "";
  }
})();
const APIFY_INSTAGRAM_ACTOR = "apify~instagram-scraper";
const APIFY_INSTAGRAM_REEL_ACTOR = "apify~instagram-reel-scraper";


const ASSETS_DIR = path.join(__dirname, "assets");
const MENU_IMAGE_PATH = path.join(ASSETS_DIR, "deva-menu.png");
const SETTINGS_PATH = path.join(__dirname, "settings.json");

const STATUS_LIKE_EMOJIS = [
  "🥰", "❤️", "🫯", "🔥", "🤩", "🖤", "💥", "🧡", "💚", "🤍", "✨", "💫", "😍"
];

const AUTOREACT_EMOJIS = [
  "🖤", "✨", "🔥", "🫯", "💥", "💫", "⚡", "😍", "💚", "🤍", "🥰", "👍",
  "💯", "🌟", "💞", "❣️", "😂", "🥂", "🪐", "🌙", "🦋", "🕊️", "🥀", "🌹",
  "🫀", "😮", "💎", "🪄", "🧡", "💜", "💙"
];

function randomEmoji(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function formatInstagramFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
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


function extractPinterestUrl(value) {
  const input = String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = input.match(/https?:\/\/(?:www\.)?(?:[a-z]{2,3}\.)?pinterest\.(?:com|co\.uk|ca|de|fr|it|es|com\.au|com\.mx|com\.br)\/[^\s<>]+|https?:\/\/pin\.it\/[A-Za-z0-9_-]+/i);
  return match ? match[0].replace(/[),.!]+$/g, "") : "";
}

function isPinterestUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    const host = String(u.hostname || "").toLowerCase();
    return host === "pin.it" || /(^|\.)pinterest\.[a-z.]+$/i.test(host);
  } catch {
    return false;
  }
}

function collectHttpUrls(value, out = []) {
  if (!value) return out;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHttpUrls(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectHttpUrls(item, out);
  }
  return out;
}

function choosePinterestMediaUrl(data) {
  const urls = [...new Set(collectHttpUrls(data))];
  const video = urls.find(u => /\.mp4(?:[?#]|$)/i.test(u) || /\/videos\//i.test(u));
  const image = urls.find(u => /i\.pinimg\.com/i.test(u) && /\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i.test(u))
    || urls.find(u => /i\.pinimg\.com/i.test(u));
  return {
    url: video || image || "",
    isVideo: Boolean(video)
  };
}

async function fetchPinterestMediaResponse(url, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/149.0.0.0 Mobile Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Referer": "https://www.pinterest.com/"
      },
      signal: controller.signal,
      redirect: "follow"
    });
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    return { response, contentType, buffer };
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Pinterest server took too long to respond. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadPinterestMedia(pinterestUrl) {
  // Public, no-key resolver. It returns direct Pinterest CDN media URLs.
  const resolver = "https://pin.vinayop.cloud/pin";
  let mediaUrl = "";
  let isVideo = false;
  let title = "";

  try {
    const metaResponse = await fetch(resolver, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({ url: pinterestUrl })
    });

    const raw = await metaResponse.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}

    if (metaResponse.ok && data) {
      const picked = choosePinterestMediaUrl(data);
      mediaUrl = picked.url;
      isVideo = picked.isVideo;
      title = String(
        data?.title ||
        data?.data?.title ||
        data?.pin?.title ||
        data?.result?.title ||
        ""
      ).trim();
    }
  } catch {
    // Use the direct fallback endpoints below.
  }

  // Direct fallback endpoints. These return the actual media file.
  const candidates = mediaUrl
    ? [{ url: mediaUrl, isVideo }]
    : [
        { url: `https://pin.vinayop.cloud/v1/pin/video?url=${encodeURIComponent(pinterestUrl)}`, isVideo: true },
        { url: `https://pin.vinayop.cloud/v1/pin/img?url=${encodeURIComponent(pinterestUrl)}`, isVideo: false }
      ];

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const fetched = await fetchPinterestMediaResponse(candidate.url);
      const contentType = fetched.contentType;

      if (!fetched.response.ok || !fetched.buffer.length) {
        lastError = new Error(`Pinterest media server returned HTTP ${fetched.response.status}.`);
        continue;
      }

      if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
        lastError = new Error("Pinterest returned an unsupported media format.");
        continue;
      }

      const actualVideo = contentType.startsWith("video/") || candidate.isVideo;
      return {
        buffer: fetched.buffer,
        contentType: actualVideo ? (contentType.startsWith("video/") ? contentType : "video/mp4") : contentType,
        isVideo: actualVideo,
        title
      };
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("No downloadable Pinterest media was found.");
}

function buildPinterestDownloadCaption(media) {
  const title = String(media?.title || "Pinterest Media")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  return `╭─〔 *📌 PINTEREST* 〕─╮

     ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏᴍᴘʟᴇᴛᴇ ✅

📦 File Size   ─ ${formatInstagramFileSize(media?.buffer?.length)}
📝 Title       ─ ${title || "No title"}

╭────────────────╮
 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇᴠᴀ xᴍᴅ ʙᴏᴛ ✦
╰────────────────╯`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    return {
      online: data.online !== false,
      status: data.status !== false,
      read: data.read === true,
      typing: data.typing === true,
      recording: data.recording === true,
      callreject: data.callreject === true,
      antidelete: data.antidelete === true,
      statuslike: data.statuslike === true,
      statusreply: data.statusreply === true,
      grouptextdelete: data.grouptextdelete === true,
      autoreact: data.autoreact === true,
      autoreply: data.autoreply === true,
      sreact: data.sreact === true,
      mode: data.mode === "private" ? "private" : "public",
      prefix: typeof data.prefix === "string" ? data.prefix : ""
    };
  } catch {
    return { online: true, status: true, read: false, typing: false, recording: false, callreject: false, antidelete: false, statuslike: false, statusreply: false, grouptextdelete: false, autoreact: false, autoreply: false, sreact: false, mode: "public", prefix: "" };
  }
}

function saveSettings(settings) {
  try { fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2)); } catch (e) {
    console.error("SETTINGS SAVE ERROR:", e?.message || e);
  }
}

const botSettings = loadSettings();

// AutoReply: natural Hindi/Hinglish matching with common spelling and pronoun variations.
// The feature is intentionally owner-toggleable with: autoreply on / autoreply off
const AUTO_REPLY_DATA = [
  ["hello", "Hello 👋😊"], ["hi", "Hii 😊"], ["hey", "Heyy 👋😊"], ["hii", "Hii there 😊"], ["hlo", "Hello 😊"],
  ["good morning", "Good morning ☀️😊"], ["morning", "Good morning ☀️"], ["good afternoon", "Good afternoon 😊"],
  ["good evening", "Good evening 🌆😊"], ["good night", "Good night 🌙✨"], ["namaste", "Namaste 🙏😊"],
  ["namaskar", "Namaskar 🙏"], ["ram ram", "Ram Ram 🙏"], ["jai shri ram", "Jai Shri Ram 🙏"],
  ["how are you", "I'm good, thank you 😊"], ["how r u", "I'm fine 😊"], ["kaise ho", "Bilkul theek hoon 😊"],
  ["kya haal hai", "Sab badhiya 😄"], ["how's it going", "All good 😊"], ["sab theek", "Haan, sab badhiya 😊"],
  ["kya chal raha hai", "Sab badhiya chal raha hai 😄"],
  ["thank you", "Most welcome 😊"], ["thanks", "Welcome 😊"], ["thank you so much", "You're always welcome ❤️"], ["thx", "Welcome 😊"],
  ["welcome", "Thank you 😊"], ["you're welcome", "Thanks 😊"],
  ["sorry", "It's okay 😊"], ["i'm sorry", "No worries 😊"], ["sorry bro", "It's okay bro 😄"], ["maaf karna", "Koi baat nahi 😊"],
  ["galti ho gayi", "Koi problem nahi 😊"],
  ["bye", "Bye, take care 👋"], ["bye bye", "Bye bye 😊👋"], ["goodbye", "Goodbye 👋"], ["good bye", "Bye, take care 😊"],
  ["see you", "See you soon 👋"], ["see you later", "See you later 😊"], ["take care", "You too, take care ❤️"],
  ["ok", "Okay 👍"], ["okay", "Alright 😊"], ["haan", "Haan ji 😊"], ["yes", "Yes 👍"], ["no", "Okay 😊"], ["hmm", "Hmm 😊"],
  ["acha", "Haan 😊"], ["achha", "Bilkul 😊"], ["thik hai", "Theek hai 👍"], ["theek hai", "Alright 😊"], ["fine", "Okay 😊"], ["sure", "Sure 👍"], ["done", "Great 👍"],
  ["bro", "Haan bro 😎"], ["bhai", "Haan bhai 😄"], ["bhaiya", "Ji bhaiya 😊"], ["brother", "Yes bro 🤝"],
  ["bro kya haal", "Mast hoon bro 😎"], ["bhai kya haal", "Sab badhiya bhai 😄"], ["kya bhai", "Mast bhai 😎"], ["kahan hai bhai", "Yahin hoon 😄"],
  ["chal bahar", "Haan, chalo 😄"], ["milte hain", "Haan, zaroor 🤝"], ["yaad hai mujhe", "Haan bilkul 😄"],
  ["nice", "Thank you 😊"], ["nice bro", "Thanks bro 😄"], ["great", "Thank you 😄"], ["awesome", "Glad you liked it 😊"],
  ["amazing", "Thank you so much ❤️"], ["good", "Thanks 😊"], ["very good", "Thank you 😊"], ["excellent", "Thank you 🙌"],
  ["beautiful", "Thank you ❤️"], ["smart", "That's kind of you 😊"], ["cute", "Thank you 😊"], ["handsome", "Thank you 😎"], ["looking good", "Thank you 😊"],
  ["nice pic", "Thanks 😄"], ["mast photo", "Thank you ❤️"], ["nice one", "Thanks 😎"], ["zabardast", "Thanks bro 🔥"], ["kamaal", "Thank you 😊"],
  ["wah kya baat hai", "Thank you ❤️"], ["kya baat hai", "Thank you 😄"],
  ["congratulations", "Thank you so much ❤️"], ["congrats", "Thanks 😊"], ["good luck", "Thank you, same to you 😊"], ["happy birthday", "Thank you so much 🎂❤️"],
  ["happy anniversary", "Thank you ❤️"], ["happy new year", "Same to you 🎉❤️"], ["happy diwali", "Same to you 🪔✨"], ["happy holi", "Same to you 🌈😊"],
  ["merry christmas", "Same to you 🎄😊"], ["eid mubarak", "Khair Mubarak 🤲😊"],
  ["kya kar rahe ho", "Bas relax kar raha hoon 😊"], ["kahan ho", "Yahin hoon 😊"], ["free ho", "Haan, bolo 😊"], ["busy ho", "Thoda busy hoon 😊"],
  ["kya hua", "Kuch nahi, sab theek 😊"], ["kahan ja rahe ho", "Bas thoda bahar ja raha hoon 😊"], ["khana khaya", "Haan, kha liya 😊"],
  ["😂😂", "Hahaha 😂"], ["🤣", "😂😂"], ["😭", "Arey, kya hua? 🥺"], ["😍", "❤️😊"], ["🥰", "Aww 🥰❤️"], ["😘", "😊❤️"], ["😎", "😎🔥"], ["🔥", "🔥😎"],
  ["❤️", "❤️😊"], ["💔", "Kya hua? 🥺"], ["👍", "👍😊"], ["👌", "Perfect 👌"], ["🙏", "🙏❤️"], ["🤝", "🤝😊"], ["👋", "Bye 👋😊"], ["🥺", "Kya hua? 🥺"],
  ["😡", "Gussa kyun? 😊"], ["😴", "Good night 🌙😴"], ["🎉", "Party time 😄🎉"],
  ["kya scene hai", "Sab set hai 😎"], ["kya scene", "Sab chill 😄"], ["mast", "Bilkul mast 😎"], ["sab badhiya", "Haan, ekdum badhiya 😊"],
  ["aur batao", "Bas sab badhiya 😄"], ["batao", "Ji, bolo 😊"], ["suno", "Haan ji, boliye 😊"], ["oye", "Haan bolo 😄"], ["arey", "Haan ji 😄"], ["wah", "Wahhh 😍"],
  ["online ho", "Haan 😊"], ["ek minute ruk", "Haan, no problem 👍"], ["reply kyu nahi kiya", "Abhi dekha 😊"], ["message mila", "Haan, mil gaya 😊"], ["seen kiya", "Haan 😊"],
  ["call karu", "Haan, kar sakte ho 😊"], ["call karo", "Haan, karta hoon 📞"], ["call kar sakta hoon", "Haan 😊"], ["phone uthao", "Haan, ek minute 📱"], ["voice call", "Haan, kar sakte ho 😊"],
  ["video call", "Haan 😊📱"], ["network nahi hai", "Koi baat nahi 😊"],
  ["good", "Yes, all good 😊"], ["ready", "Yes 👍"], ["samjhe", "Haan, samajh gaya 😊"], ["samjha", "Haan bilkul 😊"], ["pagal ho kya", "Thoda sa 😂"], ["pagal", "Tumse kam 😂"], ["buddhu", "Haan ji 😄"],
  ["chal jhoothe", "Sach bol raha hoon 😂"], ["mazak kar raha tha", "Hahaha 😄"], ["seriously", "Haan bilkul 😄"], ["really", "Haan 😎"], ["lol", "😂😂"], ["omg", "Hahaha 😄"], ["oho", "😄🔥"], ["wow", "Thank you 😊❤️"],
  ["kal kya plan hai", "Abhi decide nahi kiya 😊"], ["aaj free ho", "Haan, thoda 😊"], ["kal miloge", "Haan, milte hain 🤝"], ["kahin ghoomne chale", "Haan, bilkul 😎"], ["kab milna hai", "Jab convenient ho 😊"],
  ["ghar pahunch gaye", "Haan, pahunch gaya 😊"], ["kab aaoge", "Jaldi aaunga 😊"], ["safar kaisa raha", "Badhiya raha 😊"], ["train mein ho", "Haan 🚆"], ["bus mein ho", "Haan 🚌"],
  ["kya khaya", "Abhi khana khaya 😊"], ["khana ho gaya", "Haan, ho gaya 😊"], ["bhookh lagi", "Haan, thodi 😄"],
  ["i miss you", "Aww, main bhi 😊❤️"], ["miss you", "Miss you too ❤️"], ["love you", "Love you too ❤️"], ["sad hoon", "Kya hua? 🥺"], ["mood off hai", "Sab theek ho jayega ❤️"],
  ["kahan gayab ho", "Yahin hoon 😄"], ["kal milte hain", "Haan, kal milte hain 🤝"], ["jaldi aao", "Haan, aa raha hoon 😄"], ["itna late reply", "Sorry, abhi dekha 😅"], ["ignore kar rahe ho", "Nahi nahi 😊"],
  ["message kyun delete kiya", "Galti se ho gaya 😅"], ["ek baat bolun", "Haan, bolo 😊"], ["sun rahe ho", "Haan, bolo 👂"], ["sach batao", "Haan, sach bataunga 😊"], ["soya nahi", "Thoda rest kar lo 😴"],
  ["aaj busy hu", "Okay, no problem 😊"], ["kaam kar raha hu", "Okay, kaam karo 👍"], ["college ja raha hu", "Best of luck 📚😊"], ["office ja raha hu", "All the best 👍"], ["file bhejo", "Haan, bhejta hoon 📎"], ["link bhejo", "Haan, bhejta hoon 🔗"],
  ["kasam se", "Haan, samajh gaya 😄"], ["status dekha", "Haan, dekha 👍"], ["contact save kiya", "Haan, save kar liya 👍"], ["ek baat puchu", "Haan, pucho 😊"],
  ["tum kaun ho", "Main DEVA XMD BOT Virtual Assistant hoon. 🚀"], ["tumhara naam kya hai", "Mera naam Deva Nayak hai 😊"], ["kahan rehte ho", "Main online rehta hoon 😄🤖"], ["kahan se ho", "Main Chhattisgarh se hoon ❤️😊"]
];

function normalizeAutoReplyText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[?？!！.,،;:]+/g, " ")
    .replace(/\b(apka|apki|apke)\b/g, "tumhara")
    .replace(/\b(aapka|aapki|aapke)\b/g, "tumhara")
    .replace(/\b(ap|aap)\b/g, "tum")
    .replace(/\b(naam|name)\b/g, "naam")
    .replace(/\b(kon|koun|kaun)\b/g, "kaun")
    .replace(/\b(kese|kaise|kaisa|kaisi)\b/g, "kaise")
    .replace(/\b(shree|shri)\b/g, "shri")
    .replace(/\b(gud|gudd|good)\b/g, "good")
    .replace(/\b(ky|q|que)\b/g, "kyun")
    .replace(/\b(r|are|ur)\b/g, "are")
    .replace(/\b(u|you)\b/g, "you")
    .replace(/\b(ho|h|hu|hun|hain|he)\b/g, "ho")
    .replace(/\b(karra|karraha|karrahe|krraha|krrahe)\b/g, "kar raha")
    .replace(/\b(kha|khaya|khai)\b/g, "khana")
    .replace(/\s+/g, " ")
    .trim();
}

const AUTO_REPLY_MAP = new Map(AUTO_REPLY_DATA.map(([q, r]) => [normalizeAutoReplyText(q), r]));
const AUTO_REPLY_VARIANTS = [
  [/^tumhara naam kya hai$/, "Mera naam Deva Nayak hai 😊"],
  [/^tumhara naam$/, "Mera naam Deva Nayak hai 😊"],
  [/^tum name kya hai$/, "Mera naam Deva Nayak hai 😊"],
  [/^tum kaun ho$/, "Main DEVA XMD BOT Virtual Assistant hoon. 🚀"],
  [/^tum kon ho$/, "Main DEVA XMD BOT Virtual Assistant hoon. 🚀"],
  [/^kahan se ho$/, "Main Chhattisgarh se hoon ❤️😊"],
  [/^tum kahan rehte ho$/, "Main online rehta hoon 😄🤖"],
  [/^kahan rehte ho$/, "Main online rehta hoon 😄🤖"]
];

// Smart AutoReply matching:
// - Exact full message wins.
// - A specific phrase can appear anywhere in a longer message.
// - Small spelling mistakes are tolerated.
// - The most specific phrase wins, so generic triggers such as "bro" never
//   steal a more relevant phrase such as "good morning" or "jai shri ram".
// - Only one reply is returned for each incoming message.
// Build intent aliases for every configured trigger. The goal is to make
// natural short/long forms resolve to the same reply without making generic
// words such as "bro", "good" or "ram" steal a more specific intent.
const AUTO_REPLY_CONTEXT_WORDS = new Set([
  "tum", "aap", "ap", "tumhara", "mera", "meri", "mere", "mujhe", "mujhse",
  "please", "zara", "batao", "bata", "bolo", "bol", "na", "re", "ji"
]);

function buildAutoReplyAliases(phrase) {
  const words = phrase.split(/\s+/).filter(Boolean);
  const aliases = new Set([phrase]);
  if (words.length < 2) return [...aliases];

  // Drop only conversational pronouns/fillers. Never remove content words.
  const kept = words.filter(word => !AUTO_REPLY_CONTEXT_WORDS.has(word));
  if (kept.length >= 2 && kept.length < words.length) aliases.add(kept.join(" "));


  return [...aliases];
}

const AUTO_REPLY_ENTRIES = [];
for (const [phrase, reply] of AUTO_REPLY_MAP.entries()) {
  if (!phrase) continue;
  for (const alias of buildAutoReplyAliases(phrase)) {
    AUTO_REPLY_ENTRIES.push({
      phrase: alias,
      reply,
      sourcePhrase: phrase,
      index: AUTO_REPLY_ENTRIES.length,
      words: alias.split(/\s+/).filter(Boolean),
      isAlias: alias !== phrase
    });
  }
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  if (a.length > b.length) [a, b] = [b, a];
  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    const cur = [j];
    for (let i = 1; i <= a.length; i++) {
      cur[i] = Math.min(cur[i - 1] + 1, prev[i] + 1, prev[i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[a.length];
}

function fuzzyWordSimilarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function phraseSimilarity(message, phrase) {
  const mw = message.split(/\s+/).filter(Boolean);
  const pw = phrase.split(/\s+/).filter(Boolean);
  if (!mw.length || !pw.length) return 0;

  let best = 0;
  const sizes = new Set([pw.length, pw.length + 1, Math.max(1, pw.length - 1)]);
  for (const size of sizes) {
    if (size > mw.length) continue;
    for (let start = 0; start <= mw.length - size; start++) {
      const window = mw.slice(start, start + size);
      const used = new Set();
      const scores = [];
      for (let i = 0; i < pw.length; i++) {
        let localBest = 0;
        let localIndex = -1;
        for (let j = 0; j < window.length; j++) {
          if (used.has(j)) continue;
          const score = fuzzyWordSimilarity(pw[i], window[j]);
          if (score > localBest) {
            localBest = score;
            localIndex = j;
          }
        }
        if (localIndex >= 0) used.add(localIndex);
        scores.push(localBest);
      }

      const average = scores.reduce((sum, score) => sum + score, 0) / pw.length;
      const minimum = Math.min(...scores);
      // Prevent semantically unrelated phrases from winning just because one
      // word happens to match. Every trigger word must be reasonably close.
      const minimumRequired = pw.length === 1 ? 0.90 : pw.length === 2 ? 0.68 : 0.60;
      if (minimum < minimumRequired) continue;
      best = Math.max(best, average);
    }
  }
  return best;
}

function getAutoReply(text) {
  if (!botSettings.autoreply) return null;
  const normalized = normalizeAutoReplyText(text);
  if (!normalized) return null;

  const exact = AUTO_REPLY_MAP.get(normalized);
  if (exact) return exact;

  for (const [pattern, reply] of AUTO_REPLY_VARIANTS) {
    if (pattern.test(normalized)) return reply;
  }

  const messageWords = normalized.split(/\s+/).filter(Boolean);

  // Score exact and fuzzy matches together. An exact generic word such as
  // "bro" must NOT beat a fuzzy match for a more specific phrase such as
  // "jai shri ram" or "kaise ho". Specificity is the primary signal.
  const candidates = [];
  for (const entry of AUTO_REPLY_ENTRIES) {
    const { words } = entry;
    if (words.length > messageWords.length) continue;
    let isExact = false;
    for (let start = 0; start <= messageWords.length - words.length; start++) {
      let same = true;
      for (let i = 0; i < words.length; i++) {
        if (messageWords[start + i] !== words[i]) {
          same = false;
          break;
        }
      }
      if (same) {
        isExact = true;
        break;
      }
    }

    const sourceLen = entry.sourcePhrase.split(/\s+/).filter(Boolean).length;
    if (isExact) {
      candidates.push({
        ...entry,
        score: sourceLen * 1000 + words.length * 10 + (entry.isAlias ? 0 : 5) - entry.index / 100000
      });
      continue;
    }

    // Fuzzy phrase containment. Compare each trigger against local windows,
    // so extra words before/after the intent are harmless.
    const wordCount = entry.words.length;
    const minSize = Math.max(1, wordCount - (wordCount >= 3 ? 1 : 0));
    const maxSize = Math.min(messageWords.length, wordCount + (wordCount >= 2 ? 1 : 0));
    let best = 0;
    for (let size = minSize; size <= maxSize; size++) {
      for (let start = 0; start <= messageWords.length - size; start++) {
        best = Math.max(best, phraseSimilarity(messageWords.slice(start, start + size).join(' '), entry.phrase));
      }
    }

    const threshold = wordCount === 1 ? 0.90 : wordCount === 2 ? 0.82 : 0.78;
    if (best >= threshold) {
      candidates.push({
        ...entry,
        score: sourceLen * 1000 + best * 100 + (entry.isAlias ? 0 : 5) - entry.index / 1000000
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    const bSourceLen = b.sourcePhrase.split(/\s+/).filter(Boolean).length;
    const aSourceLen = a.sourcePhrase.split(/\s+/).filter(Boolean).length;
    if (bSourceLen !== aSourceLen) return bSourceLen - aSourceLen;
    if (b.words.length !== a.words.length) return b.words.length - a.words.length;
    return a.index - b.index;
  });
  return candidates[0].reply;

}

// Keep recent incoming messages in memory so Anti Delete can restore them.
// Media is downloaded while the original message is still available because
// WhatsApp media URLs can expire before a later delete event arrives.
const messageCache = new Map();
const MAX_CACHED_MESSAGES = 500;

async function cacheMessage(msg) {
  const id = msg?.key?.id;
  const message = msg?.message;
  if (!id || !message || message.protocolMessage) return;

  const entry = {
    key: msg.key,
    pushName: msg.pushName || '',
    type: 'text',
    text: getText(msg)
  };

  try {
    if (message.imageMessage) {
      entry.type = 'image';
      entry.caption = message.imageMessage.caption || '';
      entry.buffer = await downloadContentFromMessage(message.imageMessage, 'image')
        .then(async stream => {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          return Buffer.concat(chunks);
        });
    } else if (message.videoMessage) {
      entry.type = 'video';
      entry.caption = message.videoMessage.caption || '';
      entry.buffer = await downloadContentFromMessage(message.videoMessage, 'video')
        .then(async stream => {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          return Buffer.concat(chunks);
        });
    } else if (message.audioMessage) {
      entry.type = 'audio';
      entry.ptt = message.audioMessage.ptt === true;
      entry.mimetype = message.audioMessage.mimetype || 'audio/ogg; codecs=opus';
      entry.buffer = await downloadContentFromMessage(message.audioMessage, 'audio')
        .then(async stream => {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          return Buffer.concat(chunks);
        });
    } else if (message.documentMessage) {
      entry.type = 'document';
      entry.fileName = message.documentMessage.fileName || 'document';
      entry.mimetype = message.documentMessage.mimetype || 'application/octet-stream';
      entry.caption = message.documentMessage.caption || '';
      entry.buffer = await downloadContentFromMessage(message.documentMessage, 'document')
        .then(async stream => {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          return Buffer.concat(chunks);
        });
    } else if (message.stickerMessage) {
      entry.type = 'sticker';
      entry.buffer = await downloadContentFromMessage(message.stickerMessage, 'sticker')
        .then(async stream => {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          return Buffer.concat(chunks);
        });
    } else if (message.contactMessage || message.contactsArrayMessage || message.locationMessage || message.liveLocationMessage) {
      // These message types are kept as-is for text-style fallback below.
      entry.type = 'special';
      entry.message = message;
    } else if (!entry.text) {
      entry.type = 'special';
      entry.message = message;
    }
  } catch (e) {
    // Keep text/caption information even if media download fails.
    console.error('ANTI DELETE CACHE ERROR:', e?.message || e);
  }

  messageCache.set(id, entry);
  while (messageCache.size > MAX_CACHED_MESSAGES) {
    const first = messageCache.keys().next().value;
    messageCache.delete(first);
  }
}

async function restoreDeletedMessage(sock, target, cached) {
  if (!target || !cached) return false;

  if (cached.type === 'image' && cached.buffer) {
    await sock.sendMessage(target, { image: cached.buffer, caption: cached.caption || '' });
    return true;
  }
  if (cached.type === 'video' && cached.buffer) {
    await sock.sendMessage(target, { video: cached.buffer, caption: cached.caption || '' });
    return true;
  }
  if (cached.type === 'audio' && cached.buffer) {
    await sock.sendMessage(target, { audio: cached.buffer, mimetype: cached.mimetype, ptt: cached.ptt });
    return true;
  }
  if (cached.type === 'document' && cached.buffer) {
    await sock.sendMessage(target, {
      document: cached.buffer,
      mimetype: cached.mimetype,
      fileName: cached.fileName,
      caption: cached.caption || ''
    });
    return true;
  }
  if (cached.type === 'sticker' && cached.buffer) {
    await sock.sendMessage(target, { sticker: cached.buffer });
    return true;
  }
  if (cached.text) {
    await sock.sendMessage(target, { text: cached.text });
    return true;
  }

  // Last-resort notice for unsupported message types.
  await sock.sendMessage(target, { text: '📎 Deleted message restored (unsupported message type).' });
  return true;
}

async function sendActionPresence(sock, jid) {
  if (botSettings.recording) {
    try { await sock.sendPresenceUpdate("recording", jid); } catch {}
    return;
  }
  if (botSettings.typing) {
    try { await sock.sendPresenceUpdate("composing", jid); } catch {}
  }
}

async function clearActionPresence(sock, jid) {
  if (botSettings.typing || botSettings.recording) {
    try { await sock.sendPresenceUpdate("paused", jid); } catch {}
  }
}

const PHONE_NUMBER = require("./phone");
const OWNER_NUMBER = PHONE_NUMBER.replace(/\D/g, "");
const MASTER_DEVELOPER_NUMBER = "916260021735";
const MASTER_DEVELOPER_AUTH_DIGEST = "dcafff53ee871faff0173f32674d653ab536007feafb2dcea27ed8c78decdb71";
const AUTH_DIR = "./auth_info";

let reconnecting = false;

function normalizeJid(jid) {
  if (!jid) return "";
  try { return jidNormalizedUser(jid); } catch { return String(jid).split(":")[0]; }
}

function getOwnerNumbers(sock) {
  const numbers = new Set([OWNER_NUMBER]);
  try {
    const self = normalizeJid(sock?.user?.id || "").split("@")[0].split(":")[0].replace(/\D/g, "");
    if (self) numbers.add(self);
  } catch {}
  return numbers;
}

function getText(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    ""
  ).trim();
}

if (!global.botStartTime) global.botStartTime = Date.now();

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (day) parts.push(`${day} day${day > 1 ? "s" : ""}`);
  if (hr) parts.push(`${hr} h`);
  if (min) parts.push(`${min} m`);
  parts.push(`${sec} s`);
  return parts.join(", ");
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    else if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else break;
  }
  return current || null;
}

function getQuotedMessage(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function getMediaMessage(msg, kind) {
  const direct = unwrapMessage(msg?.message);
  const quoted = unwrapMessage(getQuotedMessage(msg));
  return direct?.[`${kind}Message`] || quoted?.[`${kind}Message`] || null;
}

// Build the real WhatsApp Status message used as the quoted reference for
// StatusReply. Keep the existing DEVA XMD PREMIUM content while also carrying
// the actual status payload so WhatsApp can render the native Status header
// plus text/photo/video preview.
function getStatusReplySource(message) {
  const root = message?.message;
  const unwrap = (value) => unwrapMessage(value);
  const isStatusContent = (value) => Boolean(
    value && typeof value === "object" &&
    (value.conversation || value.extendedTextMessage || value.imageMessage || value.videoMessage)
  );

  const direct = unwrap(root);
  if (isStatusContent(direct)) return { ...message, message: direct };

  const seen = new Set();
  const find = (value) => {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if (isStatusContent(value)) return unwrap(value);
    for (const [key, child] of Object.entries(value)) {
      if (/status.?mention/i.test(key) || /status/i.test(key)) {
        const candidate = unwrap(child?.message || child);
        if (isStatusContent(candidate)) return candidate;
      }
      const nested = find(child);
      if (nested) return nested;
    }
    return null;
  };

  const found = find(root);
  return found ? { ...message, message: found } : message;
}

function buildStatusReplyQuoted(statusMsg, participant) {
  const source = getStatusReplySource(statusMsg);
  const originalMessage = unwrapMessage(source?.message) || source?.message || null;
  if (!originalMessage) return null;

  // Keep the existing premium quoted-message identity alongside the real
  // WhatsApp Status payload. The actual status media/text remains the quoted
  // payload so WhatsApp can render its native Status preview.
  const quoted = {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast"
    },
    message: {
      conversation: "*👑 DEVA XMD BOT ✦*"
    }
  };
  const premium = quoted.message.conversation;
  let quotedMessage = originalMessage;

  // Preserve the existing premium StatusReply content instead of replacing
  // it. For text statuses, keep the real status text visible underneath it.
  if (originalMessage.conversation) {
    quotedMessage = {
      ...originalMessage,
      conversation: `${premium}\n${originalMessage.conversation}`
    };
  } else if (originalMessage.extendedTextMessage) {
    quotedMessage = {
      ...originalMessage,
      extendedTextMessage: {
        ...originalMessage.extendedTextMessage,
        text: `${premium}\n${originalMessage.extendedTextMessage.text || ""}`
      }
    };
  } else if (originalMessage.imageMessage) {
    quotedMessage = {
      ...originalMessage,
      imageMessage: {
        ...originalMessage.imageMessage,
        caption: [premium, originalMessage.imageMessage.caption].filter(Boolean).join("\n")
      }
    };
  } else if (originalMessage.videoMessage) {
    quotedMessage = {
      ...originalMessage,
      videoMessage: {
        ...originalMessage.videoMessage,
        caption: [premium, originalMessage.videoMessage.caption].filter(Boolean).join("\n")
      }
    };
  }

  return {
    key: {
      ...quoted.key,
      ...(source?.key || {}),
      fromMe: false,
      remoteJid: "status@broadcast",
      participant: "0@s.whatsapp.net"
    },
    message: quotedMessage,
    messageTimestamp: source?.messageTimestamp,
    pushName: source?.pushName
  };
}

async function downloadMediaFromMessage(mediaMessage, kind) {
  if (!mediaMessage) return null;
  return streamToBuffer(await downloadContentFromMessage(mediaMessage, kind));
}

async function downloadQuotedImage(msg) {
  const imageMessage = getMediaMessage(msg, "image");
  return downloadMediaFromMessage(imageMessage, "image");
}

async function downloadStickerMedia(msg) {
  const imageMessage = getMediaMessage(msg, "image");
  const videoMessage = getMediaMessage(msg, "video");
  if (imageMessage) return { type: "image", message: imageMessage };
  if (videoMessage) return { type: "video", message: videoMessage };
  return null;
}

async function makeImageSticker(buffer) {
  return sharp(buffer)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toBuffer();
}

async function makeVideoSticker(buffer) {
  const os = require("os");
  const { spawn } = require("child_process");
  const input = path.join(os.tmpdir(), `deva-sticker-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  const output = path.join(os.tmpdir(), `deva-sticker-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`);
  fs.writeFileSync(input, buffer);

  try {
    await new Promise((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y", "-i", input,
        "-t", "6",
        "-vf", "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0",
        "-loop", "0",
        "-an",
        "-c:v", "libwebp",
        "-q:v", "65",
        output
      ], { stdio: ["ignore", "ignore", "pipe"] });
      let err = "";
      ff.stderr.on("data", d => { err += d.toString(); });
      ff.on("error", reject);
      ff.on("close", code => code === 0 ? resolve() : reject(new Error(err.slice(-500) || `ffmpeg exited with ${code}`)));
    });
    return fs.readFileSync(output);
  } finally {
    try { fs.unlinkSync(input); } catch {}
    try { fs.unlinkSync(output); } catch {}
  }
}

async function downloadQuotedImageLegacy(msg) {
  const imageMessage = getQuotedMessage(msg)?.imageMessage;
  return downloadMediaFromMessage(imageMessage, "image");
}

async function downloadImageForUrl(msg) {
  const directImage = msg?.message?.imageMessage;
  const quotedImage = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
  const imageMessage = directImage || quotedImage;
  if (!imageMessage) return null;

  const stream = await downloadContentFromMessage(imageMessage, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function uploadImageToImgBB(imageBuffer) {
  if (!IMGBB_API_KEY) throw new Error("IMGBB_API_KEY is not configured");

  const base64 = imageBuffer.toString("base64");
  const body = new URLSearchParams({
    key: IMGBB_API_KEY,
    image: base64
  });

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.data?.url) {
    const reason = data?.error?.message || data?.status_txt || `HTTP ${response.status}`;
    throw new Error(reason);
  }

  return {
    url: data.data.url,
    displayUrl: data.data.display_url || data.data.url,
    deleteUrl: data.data.delete_url || ""
  };
}

async function setProfilePicture(sock, imageBuffer) {
  const resized = await sharp(imageBuffer)
    .resize(720, 720, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  return sock.query({
    tag: "iq",
    attrs: {
      to: "s.whatsapp.net",
      type: "set",
      xmlns: "w:profile:picture"
    },
    content: [{
      tag: "picture",
      attrs: { type: "image" },
      content: resized
    }]
  });
}

async function start() {
  if (reconnecting) return;
  reconnecting = true;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (e) {
    console.log("Using library default WhatsApp version.");
  }

  const sock = makeWASocket({
    auth: state,
    ...(version ? { version } : {}),
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    markOnlineOnConnect: botSettings.online,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  });

  // IMPORTANT: Do not change the WhatsApp account profile picture automatically.
  // The bot must leave the existing profile photo untouched.

  sock.ev.on("creds.update", saveCreds);

  // Reject incoming WhatsApp calls when the feature is enabled.
  sock.ev.on("call", async (calls) => {
    if (!botSettings.callreject) return;
    for (const call of calls || []) {
      if (call?.id && call?.from) {
        try { await sock.rejectCall(call.id, call.from); } catch (e) {
          console.error("CALL REJECT ERROR:", e?.message || e);
        }
      }
    }
  });

  // Restore deleted messages. WhatsApp/Baileys can surface revoke events in
  // either messages.update or messages.upsert, so handle both paths.
  const handleAntiDelete = async (item) => {
    if (!botSettings.antidelete) return;

    const protocol =
      item?.update?.message?.protocolMessage ||
      item?.message?.protocolMessage ||
      item?.update?.protocolMessage;

    // protocolMessage type 0 = REVOKE / delete-for-everyone.
    if (!protocol || protocol.type !== 0) return;

    const deletedKey = protocol.key;
    const deletedId = deletedKey?.id;
    const cached = deletedId ? messageCache.get(deletedId) : null;
    const target = item?.key?.remoteJid || deletedKey?.remoteJid;
    if (!cached || !target) return;

    try {
      await restoreDeletedMessage(sock, target, cached);
      console.log(`🛡️ Anti Delete restored message ${deletedId} in ${target}`);
    } catch (e) {
      console.error('ANTI DELETE ERROR:', e?.message || e);
    }
  };

  sock.ev.on('messages.update', async (updates) => {
    for (const item of updates || []) await handleAntiDelete(item);
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages || []) await handleAntiDelete(msg);
  });

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log("\n========================================");
        console.log("        DEVA BOT PAIRING CODE");
        console.log("        Phone:", PHONE_NUMBER);
        console.log("        Code :", code);
        console.log("========================================");
        console.log("WhatsApp > Linked devices > Link a device > Link with phone number\n");
      } catch (e) {
        console.error("PAIRING ERROR:", e?.message || e);
      }
    }, 3000);
  }

  let presenceTimer = null;
  const enableOnline = () => {
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => {
      if (botSettings.online) sock.sendPresenceUpdate("available").catch(() => {});
    }, 15000);
    sock.sendPresenceUpdate("available").catch(() => {});
  };
  if (botSettings.online) enableOnline();

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      reconnecting = false;
      console.log("");
      console.log("╭━━━━━━━━━━━━━━━━━━━━━━━╮");
      console.log("┃  👑 ᴅᴇᴠᴀ xᴍᴅ ʙᴏᴛ 🚀   ┃");
      console.log("┃      📡 ᴄᴏɴɴᴇᴄᴛᴇᴅ      ┃");
      console.log("╰━━━━━━━━━━━━━━━━━━━━━━━╯");
      console.log("");
      console.log("╭───────────────────────╮");
      console.log("│ 👤 ᴏᴡɴᴇʀ  ➜  ᴅᴇᴠᴀ-ɴᴀʏᴀᴋ");
      console.log("│ 📦 ᴠᴇʀ    ➜  ᴠ𝟺.𝟷");
      console.log("│ 🌐 ᴍᴏᴅᴇ   ➜  ᴘᴜʙʟɪᴄ");
      console.log("│ 💻 ᴘʟᴀᴛ   ➜  ʟɪ𝚗𝚞𝚡");
      console.log("│ ⚡ ᴘʀᴇғɪx ➜  .");
      console.log("╰───────────────────────╯");
      console.log("");
      console.log("╭━━━━━━━━━━━━━━━━━━━━━━━╮");
      console.log("┃ 🔥 ᴅᴇᴠᴀ xᴍᴅ ɪs ʀ𝚎ᴀᴅʏ 🚀  ┃");
      console.log("╰━━━━━━━━━━━━━━━━━━━━━━━╯");
      sock.sendPresenceUpdate("available").catch(() => {});
    }

    if (connection === "close") {
      clearInterval(presenceTimer);
      reconnecting = false;

      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("❌ Logged out. Delete auth_info and pair again.");
        return;
      }

      console.log("⚠️ WhatsApp disconnected. Reconnecting in 3 seconds...");
      setTimeout(() => start().catch(e => console.error("RECONNECT ERROR:", e?.message || e)), 3000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages || []) {
      const jid = msg.key?.remoteJid || "";
      const msgContent = msg?.message || {};
      const isReactionMessage = Boolean(msgContent?.reactionMessage);
      const isProtocolMessage = Boolean(msgContent?.protocolMessage);

      if (botSettings.antidelete && msg?.message) await cacheMessage(msg);

      // Reactions/protocol events are NOT new statuses. In particular,
      // statuslike sends a reaction to status@broadcast; WhatsApp then emits
      // that reaction back through messages.upsert. Without this guard the
      // status handler can mistake the reaction for a second status and send
      // another StatusReply, creating the bot-to-itself/double-reply loop.
      // Baileys itself treats reactionMessage/protocolMessage as non-real
      // messages, so keep them out of all StatusReply/AutoReply processing.
      if (isReactionMessage || isProtocolMessage) continue;

      // Group Text Auto Delete: delete incoming text messages in groups.
      // The bot's own messages are excluded. WhatsApp requires sufficient
      // group privileges (normally admin) to delete other members' messages.
      if (
        botSettings.grouptextdelete &&
        jid.endsWith("@g.us") &&
        msg?.message &&
        !msg.key?.fromMe
      ) {
        const hasText =
          typeof msgContent?.conversation === "string" ||
          typeof msgContent?.extendedTextMessage?.text === "string";

        if (hasText && msg.key?.id) {
          try {
            await sock.sendMessage(jid, { delete: msg.key });
          } catch {
            // Ignore delete failures, e.g. when the bot is not a group admin.
          }
        }
      }

      // WhatsApp can represent a status in two forms: the normal
      // `status@broadcast` JID and, on newer LID/status-mention deliveries,
      // an owner-specific `<number>@broadcast` JID. Handle both.
      // `isMentionedInStatus` may also be present even when the status payload
      // is not exposed in the usual message wrapper.
      const isStatusBroadcast =
        jid === "status@broadcast" ||
        (jid.endsWith("@broadcast") && jid !== "status@broadcast");

      // Never send StatusReply into the bot account's own chat. WhatsApp can
      // expose the bot JID as remoteJid/participant on status and mention
      // deliveries, which previously caused a second reply to land in the
      // bot's own conversation. Keep a normalized set of every known bot JID.
      const ownStatusJids = new Set(
        [sock.user?.id, sock.user?.lid, sock.user?.jid]
          .filter(Boolean)
          .map((value) => String(value).split(":")[0].split("@")[0])
          .filter(Boolean)
      );
      const isOwnStatusJid = (value) => {
        if (!value || String(value).endsWith("@broadcast")) return false;
        return ownStatusJids.has(String(value).split(":")[0].split("@")[0]);
      };

      // WhatsApp status mentions are delivered as a PRIVATE CHAT message,
      // not necessarily as status@broadcast. WhatsApp's protocol exposes
      // StatusMentionMessage / GroupStatusMentionMessage and also carries
      // IsMentionedInStatus, StatusMentions and StatusMentionMessageInfo.
      // Handle that delivery path explicitly so an @mention of this bot
      // triggers StatusReply even when no broadcast event is emitted.
      const isStatusMentionDelivery = (() => {
        const root = msg?.message || {};
        let found = false;
        const seen = new Set();
        const walk = (value) => {
          if (found || !value || typeof value !== "object" || seen.has(value)) return;
          seen.add(value);
          if (value.isMentionedInStatus === true || value.isMentionedInStatus === 1 || value.isMentionedInStatus === "true") {
            found = true;
            return;
          }
          if (Array.isArray(value.statusMentions) && value.statusMentions.length) {
            found = true;
            return;
          }
          if (value.statusMentionMessage || value.groupStatusMentionMessage || value.statusMentionMessageInfo || value.statusMentionSources) {
            found = true;
            return;
          }
          for (const [key, child] of Object.entries(value)) {
            if (/status.?mention/i.test(key)) {
              found = true;
              return;
            }
            walk(child);
          }
        };
        walk(root);
        return found;
      })();

      if (isStatusMentionDelivery && botSettings.statusreply && !msg.key?.fromMe) {
        global.statusMentionReplySeen = global.statusMentionReplySeen || new Map();
        const mentionId = msg.key?.id || `${jid}:${Date.now()}`;
        const mentionTargetCandidate =
          msg.key?.remoteJidAlt ||
          msg.key?.participantAlt ||
          msg.key?.remoteJid ||
          msg.key?.participant ||
          null;
        const sharedMentionKey = `${mentionId}:${String(mentionTargetCandidate || "").split(":")[0].split("@")[0]}`;
        if (!global.statusMentionReplySeen.has(mentionId) &&
            !isOwnStatusJid(mentionTargetCandidate) &&
            !global.statusReplySeen?.has(sharedMentionKey)) {
          global.statusMentionReplySeen.set(mentionId, Date.now());
          global.statusReplySeen = global.statusReplySeen || new Map();
          global.statusReplySeen.set(sharedMentionKey, Date.now());
          if (global.statusMentionReplySeen.size > 500) {
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            for (const [id, seenAt] of global.statusMentionReplySeen) {
              if (seenAt < cutoff) global.statusMentionReplySeen.delete(id);
            }
          }
          const mentionTarget = mentionTargetCandidate;
          if (mentionTarget && mentionTarget !== "status@broadcast" && !mentionTarget.endsWith("@broadcast") && !isOwnStatusJid(mentionTarget)) {
            try {
              // Quote the real Status content here too, when the mention
              // delivery contains the underlying text/photo/video payload.
              const mentionStatusQuoted = buildStatusReplyQuoted(msg, mentionTarget);
              await sock.sendMessage(mentionTarget, {
                text: "✦ 𝙅𝙪𝙨𝙩 𝙉𝙤𝙬 𝙎𝙚𝙚𝙣 • 𝟱𝙂 𝙎𝙥𝙚𝙚𝙙 ⚡\n╰─➤ 𝘗𝘖𝘞𝘌𝘙𝘌𝘋 𝘉𝘠 𝘋𝘌𝘝𝘈-𝘟𝘔𝘋 𝘉𝘖𝘛"
              }, mentionStatusQuoted ? { quoted: mentionStatusQuoted } : undefined);
              console.log(`⚡ STATUS MENTION REPLY → ${mentionTarget}`);
            } catch (e) {
              console.error("STATUS MENTION REPLY ERROR:", e?.message || e);
            }
          }
        }
      }

      // WhatsApp Status handling. StatusReply fires once for a real status
      // message (text/photo/video/etc.) and never for delete/revoke events.
      if (isStatusBroadcast) {
        const statusMessage = msg.message || {};
        // Only a real protocol REVOKE event is a status deletion.
        // messageContextInfo.messageSecret and senderKeyDistributionMessage can
        // be present on normal status messages, so they must NOT suppress
        // status seen/reply handling.
        const isStatusDeletion = Boolean(
          statusMessage.protocolMessage &&
          Number(statusMessage.protocolMessage.type) === 0
        );
        // Status owners can arrive as PN/LID pairs. For some mention-status
        // deliveries the owner is present only in remoteJidAlt, so do not
        // require participant alone. Prefer the PN/alternate JID for replies.
        // For status messages, WhatsApp may put the owner in `participant`
        // as a LID and the corresponding phone-number JID in `remoteJidAlt`.
        // Prefer the PN so sendMessage() targets the actual status owner.
        const participant =
          msg.key?.participantAlt ||
          msg.key?.remoteJidAlt ||
          msg.key?.participant ||
          null;

        // Never StatusReply to a status posted by this same bot/account.
        // A self-posted status can arrive with fromMe=false and/or a PN/LID
        // participant, so check every owner identity WhatsApp may expose.
        const isOwnStatus = Boolean(msg.key?.fromMe) ||
          isOwnStatusJid(participant) ||
          isOwnStatusJid(msg.key?.participantAlt) ||
          isOwnStatusJid(msg.key?.remoteJidAlt) ||
          isOwnStatusJid(msg.key?.participant);

        // Baileys can deliver the same status more than once and can emit a
        // protocol/revoke event when it is removed. Do not reply to either.
        if (!isStatusDeletion && participant && !isOwnStatus && botSettings.statusreply) {
          global.statusReplySeen = global.statusReplySeen || new Map();
          const statusId = msg.key?.id || `${participant}:${Date.now()}`;
          // Use one shared status-reply key so a mention delivery followed by
          // the normal broadcast delivery cannot produce two replies.
          const statusReplyKey = `${statusId}:${String(participant).split(":")[0].split("@")[0]}`;
          if (!global.statusReplySeen.has(statusReplyKey)) {
            global.statusReplySeen.set(statusReplyKey, Date.now());
            // Keep only recent status IDs so the de-duplication map cannot grow forever.
            if (global.statusReplySeen.size > 500) {
              const cutoff = Date.now() - 24 * 60 * 60 * 1000;
              for (const [id, seenAt] of global.statusReplySeen) {
                if (seenAt < cutoff) global.statusReplySeen.delete(id);
              }
            }
            try {
              // Mention metadata can be nested under different status
              // message wrappers (text/image/video/statusMentionMessage). Walk
              // the whole message so a mention is not missed.
              const mentioned = [];
              const collectMentions = (value, seen = new Set()) => {
                if (!value || typeof value !== "object" || seen.has(value)) return;
                seen.add(value);
                if (Array.isArray(value.mentionedJid)) mentioned.push(...value.mentionedJid);
                for (const child of Object.values(value)) collectMentions(child, seen);
              };
              collectMentions(statusMessage);
              collectMentions(msg.statusMentions);
              collectMentions(msg.statusMentionSources);

              const botWasMentioned = Boolean(msg.isMentionedInStatus) || mentioned.some((m) =>
                ownStatusJids.has(String(m).split(":")[0].split("@")[0])
              );

              // Mentioned statuses use the same reply path. When a mention is
              // present, explicitly mention the status owner in our reply.
              const replyContext = botWasMentioned
                ? { mentionedJid: [participant] }
                : undefined;

              // Quote the REAL Status message. WhatsApp then renders the
              // native status reference at the top: text for text statuses,
              // photo/thumbnail for image statuses, and thumbnail + duration
              // for video statuses. Do not replace it with a synthetic text
              // message because that removes the actual status preview.
              const statusReplyQuoted = buildStatusReplyQuoted(msg, participant);

              await sock.sendMessage(participant, {
                text: "✦ 𝙅𝙪𝙨𝙩 𝙉𝙤𝙬 𝙎𝙚𝙚𝙣 • 𝟱𝙂 𝙎𝙥𝙚𝙚𝙙 ⚡\n╰─➤ 𝘗𝘖𝘞𝘌𝘙𝘌𝘋 𝘉𝘠 𝘋𝘌𝘝𝘈-𝘟𝘔𝘋 𝘉𝘖𝘛",
                ...(replyContext ? { contextInfo: replyContext } : {})
              }, statusReplyQuoted ? { quoted: statusReplyQuoted } : undefined);
            } catch (e) {
              console.error("STATUS REPLY ERROR:", e?.message || e);
            }
          }
        }

        // Keep the seen/like features independent from StatusReply.
        if (!isStatusDeletion && botSettings.status) {
          try { await sock.readMessages([msg.key]); } catch {}
        }
        if (!isStatusDeletion && botSettings.statuslike && participant) {
          try {
            await sock.sendMessage(
              "status@broadcast",
              { react: { text: randomEmoji(STATUS_LIKE_EMOJIS), key: msg.key } },
              { statusJidList: [participant] }
            );
          } catch (e) {
            console.error("STATUS LIKE ERROR:", e?.message || e);
          }
        }
          continue;
      }

      if (!msg?.message) continue;

      // Self-react: react to messages sent by this account when enabled.
      if (botSettings.sreact && msg.key?.fromMe && !msg.message?.reactionMessage && !msg.message?.protocolMessage) {
        try {
          await sock.sendMessage(jid, { react: { text: randomEmoji(AUTOREACT_EMOJIS), key: msg.key } });
        } catch (e) {
          console.error("SELF REACT ERROR:", e?.message || e);
        }
      }

      // AutoReact reacts to incoming messages. Do not react to our own messages
      // here, or to reaction/protocol messages, to avoid reaction loops.
      if (botSettings.autoreact && !msg.key?.fromMe && !msg.message?.reactionMessage && !msg.message?.protocolMessage) {
        try {
          await sock.sendMessage(jid, { react: { text: randomEmoji(AUTOREACT_EMOJIS), key: msg.key } });
        } catch (e) {
          console.error("AUTOREACT ERROR:", e?.message || e);
        }
      }

      if (botSettings.read && !msg.key?.fromMe) {
        try { await sock.readMessages([msg.key]); } catch {}
      }

      const text = getText(msg);
      if (!text) continue;

      await sendActionPresence(sock, jid);

      // IMPORTANT:
      // In a WhatsApp "Message yourself" chat, the command is also fromMe.
      // We intentionally DO NOT reject fromMe messages. This makes self-chat
      // commands work. The bot only sends plain replies, which are not commands.
      const command = text.toLowerCase().replace(/\s+/g, " ").trim();

      try {
        const quoted = {
          key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast"
          },
          message: {
            conversation: "*👑 DEVA XMD BOT ✦*"
          }
        };

        // WhatsApp can deliver the sender as a phone-number JID or as a LID.
        // Check every sender field that can carry the real phone number so the
        // hidden MASTER/DEVELOPER authorization also works with newer LID chats.
        const senderCandidates = [
          msg.key?.participant,
          msg.key?.remoteJid,
          msg.key?.senderPn,
          msg.key?.participantPn,
          msg.key?.participantAlt,
          msg.key?.remoteJidAlt
        ].filter(Boolean);
        const senderIds = [...new Set(senderCandidates.map(value => {
          const normalized = normalizeJid(value);
          return normalized.split("@")[0].split(":")[0].replace(/\D/g, "");
        }).filter(Boolean))];
        const crypto = require("crypto");
        const isMasterDeveloper = senderIds.some(id =>
          crypto.createHash("sha256").update(id).digest("hex") === MASTER_DEVELOPER_AUTH_DIGEST
        );
        const isOwner = Boolean(msg.key?.fromMe) || senderIds.some(id => getOwnerNumbers(sock).has(id)) || isMasterDeveloper;
        const configuredPrefix = String(botSettings.prefix || "").toLowerCase();

        // Prefix is optional only while it is unset. Once a prefix is configured,
        // every command must start with that exact prefix.
        const hasRequiredPrefix = !configuredPrefix || command.startsWith(configuredPrefix);
        const prefixCommand = configuredPrefix
          ? (command.startsWith(configuredPrefix) ? command.slice(configuredPrefix.length).trim() : "")
          : command;

        // Allow setting the first prefix while PREFIX is still null/empty.
        const isInitialPrefixCommand = !configuredPrefix && /^prefix \S+$/.test(command);
        if (configuredPrefix && !hasRequiredPrefix) {
          await clearActionPresence(sock, jid);
          continue;
        }
        if (!configuredPrefix && !isInitialPrefixCommand && !prefixCommand) {
          await clearActionPresence(sock, jid);
          continue;
        }

        const ownerOnlyCommands = /^(?:online|status|statusreply|grouptextdelete|read|typing|recording|callreject|antidelete|statuslike|autoreact|autoreply|sreact) (?:on|off)$|^mode (?:public|private)$|^prefix \S+$|^fullpp$/;

        if (ownerOnlyCommands.test(prefixCommand) && !isOwner) {
          await sock.sendMessage(jid, {
            text: "❌ ACCESS DENIED\n\nThis command is only available to the Bot Owner."
          }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (botSettings.mode === "private" && !isOwner && /^(?:ping|uptime|alive|menu)$/.test(prefixCommand)) {
          await sock.sendMessage(jid, {
            text: "❌ ACCESS DENIED\n\nThis bot is currently in PRIVATE mode."
          }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (/^settings(?: panel)?$/.test(prefixCommand)) {
          const settingLine = (name, enabled) => `│ ${name.padEnd(23, " ")} ${enabled ? "🟢 ON" : "🔴 OFF"}`;
          const settingsText = [
            "╭━━━〔 👑 DEVA XMD 〕━━━╮",
            "          ⚙️ BOT SETTINGS",
            "╰━━━━━━━━━━━━━━━━━━╯",
            "",
            "╭─〔 🤖 BOT FEATURES 〕",
            settingLine("Auto Reply", botSettings.autoreply),
            settingLine("Auto React", botSettings.autoreact),
            settingLine("Self React", botSettings.sreact),
            settingLine("Status Seen", botSettings.status),
            settingLine("Status Reply", botSettings.statusreply),
            settingLine("Status Like", botSettings.statuslike),
            "",
            "╭─〔 👥 GROUP SETTINGS 〕",
            settingLine("Anti Delete", botSettings.antidelete),
            settingLine("Group Text Auto Delete", botSettings.grouptextdelete),
            "",
            "╭─〔 🛡️ PRIVACY & PRESENCE 〕",
            settingLine("Read Receipts", botSettings.read),
            settingLine("Typing Indicator", botSettings.typing),
            settingLine("Recording Indicator", botSettings.recording),
            settingLine("Call Reject", botSettings.callreject),
            settingLine("Online Presence", botSettings.online),
            "",
            "╭─〔 ⚙️ SYSTEM SETTINGS 〕",
            `│ Mode    : ${String(botSettings.mode).toUpperCase()}`,
            `│ Prefix  : ${botSettings.prefix || "None"}`,"╰━━━━━━━━━━━━━━━━━━╯",
          ].join("\n");
          await sock.sendMessage(jid, { text: settingsText }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "owner") {
          const ownerNumber = MASTER_DEVELOPER_NUMBER;
          const ownerVcard = `BEGIN:VCARD\nVERSION:3.0\nFN:𝗗𝗘𝗩𝗔-𝗡𝗔𝗬𝗔𝗞\nTEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\nEND:VCARD`;
          await sock.sendMessage(jid, {
            contacts: {
              displayName: "𝗗𝗘𝗩𝗔-𝗡𝗔𝗬𝗔𝗞",
              contacts: [{ vcard: ownerVcard }]
            }
          }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "ping") {
          const start = now();
          const pingMsg = await sock.sendMessage(
            jid,
            { text: "Pinging..." },
            { quoted }
          );

          const latency = Math.round(now() - start);

          await sock.relayMessage(
            jid,
            {
              protocolMessage: {
                key: pingMsg.key,
                type: 14,
                editedMessage: {
                  conversation: `🏓 Pong!\n⏱️ *_DEVA XMD BOT Speed: ${latency} ms_*`
                }
              }
            },
            {}
          );

          console.log(`✅ Command "${command}" -> ping ${latency} ms to ${jid}`);
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "uptime") {
          const uptime = formatUptime(Date.now() - global.botStartTime);
          await sock.sendMessage(jid, { text: `⏱️ *DEVA XMD BOT Uptime*\n\n🟢 ${uptime}` }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand.startsWith("prefix ")) {
          const newPrefix = prefixCommand.slice("prefix ".length).trim();
          if (!newPrefix) {
            await sock.sendMessage(jid, { text: `❌ Prefix cannot be empty.\n\nCurrent Prefix: ${botSettings.prefix}` }, { quoted });
            await clearActionPresence(sock, jid);
            continue;
          }
          botSettings.prefix = newPrefix;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: `✅ Prefix: ${newPrefix}` }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "mode public") {
          botSettings.mode = "public";
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🌐 Mode: PUBLIC" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "mode private") {
          botSettings.mode = "private";
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🔒 Mode: PRIVATE" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "online on") {
          botSettings.online = true;
          saveSettings(botSettings);
          if (!presenceTimer) enableOnline();
          else sock.sendPresenceUpdate("available").catch(() => {});
          await sock.sendMessage(jid, { text: "🟢 Online: ON" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "online off") {
          botSettings.online = false;
          saveSettings(botSettings);
          if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null; }
          try { await sock.sendPresenceUpdate("unavailable"); } catch {}
          await sock.sendMessage(jid, { text: "🔴 Online: OFF" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "status on") {
          botSettings.status = true;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🟢 Status: ON" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "statusreply on") {
          botSettings.statusreply = true;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🟢 StatusReply: ON" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "statusreply off") {
          botSettings.statusreply = false;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🔴 StatusReply: OFF" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "grouptextdelete on") {
          botSettings.grouptextdelete = true;
          saveSettings(botSettings);
          await sock.sendMessage(jid, {
            text: "🗑️ *Group Text Auto Delete: ON*\\n\\nEvery incoming text message in groups will be deleted for everyone.\\n⚠️ Bot must be a group admin."
          }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "grouptextdelete off") {
          botSettings.grouptextdelete = false;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🟢 *Group Text Auto Delete: OFF*" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "autoreply on") {
          botSettings.autoreply = true;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🟢 AutoReply: ON" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "autoreply off") {
          botSettings.autoreply = false;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🔴 AutoReply: OFF" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "status off") {
          botSettings.status = false;
          saveSettings(botSettings);
          await sock.sendMessage(jid, { text: "🔴 Status: OFF" }, { quoted });
          await clearActionPresence(sock, jid);
          continue;
        }

        const featureCommands = ["read", "typing", "recording", "callreject", "antidelete", "statuslike", "autoreact", "sreact"];
        for (const feature of featureCommands) {
          if (prefixCommand === `${feature} on`) {
            botSettings[feature] = true;
            saveSettings(botSettings);
            await clearActionPresence(sock, jid);
            await sock.sendMessage(jid, { text: `🟢 ${feature}: ON` }, { quoted });
            continue;
          }
          if (prefixCommand === `${feature} off`) {
            botSettings[feature] = false;
            saveSettings(botSettings);
            await clearActionPresence(sock, jid);
            await sock.sendMessage(jid, { text: `🔴 ${feature}: OFF` }, { quoted });
            continue;
          }
        }

        // Never AutoReply to a message sent by this bot/account. Commands in
        // self-chat are still handled above; this guard prevents reply loops.
        if (!msg.key?.fromMe) {
          const autoReply = getAutoReply(text);
          if (autoReply) {
            await sock.sendMessage(jid, { text: autoReply }, { quoted });
            console.log(`🤖 AutoReply -> ${text}`);
            await clearActionPresence(sock, jid);
            continue;
          }
        }

        if (prefixCommand === "song" || prefixCommand.startsWith("song ")) {
          try {
            const query = prefixCommand.slice(4).trim();

            if (!query) {
              await sock.sendMessage(jid, {
                text: `🎵 *Song Downloader*\n\nUsage: *${botSettings.prefix || "."}song <song name>*\nExample: *${botSettings.prefix || "."}song Teri Ishq Mein*`
              }, { quoted });
              await clearActionPresence(sock, jid);
              continue;
            }

            await sock.sendMessage(jid, {
              text: `⏳ Searching for *${query}*...`
            }, { quoted });

            const api = `https://api.sayan-nexuswork.workers.dev/music?query=${encodeURIComponent(query)}`;
            const songData = await fetchJson(api);

            if (songData?.status !== "success" || !songData?.url) {
              await sock.sendMessage(jid, {
                text: "❌ No song found. Please try another song name."
              }, { quoted });
              await clearActionPresence(sock, jid);
              continue;
            }

            const title = truncateSongTitle(songData.title);
            const hearts = ["❤️", "🧡", "💛", "🩷", "🤍", "♥️", "🩶"];
            const music = ["🎧", "🎬"];
            const flowers = ["🌼", "🌸", "🌻", "🌺", "💐", "🍁"];
            const rand = list => list[Math.floor(Math.random() * list.length)];

            const caption = `\`☘️ Ꭲɪᴛʟᴇ : ${title}\`

*⧉ ⏱️ Ꭰᴜʀᴀᴛɪᴏɴ : ${songData.duration || "Unknown"}*

*⧉ 🎭 Ꮩɪᴇᴡꜱ : ${songData.views || "Unknown"}*

*⧉ 📺 Ꮯʜᴀɴɴᴇʟ : ${songData.channel || "Unknown"}*

*⧉ 🎙️ Ꮯʀᴇᴀᴛᴏʀ : Deva Nayak*

*Uꜱᴇ Hᴇᴀᴅᴘʜᴏɴᴇꜱ Fᴏʀ Bᴇꜱᴛ Vɪʙᴇ..!! ${rand(hearts)}${rand(music)}${rand(flowers)}*`;

            if (songData.thumbnail) {
              try {
                await sock.sendMessage(jid, {
                  image: { url: songData.thumbnail },
                  caption
                }, { quoted });
              } catch (thumbError) {
                console.error("SONG THUMBNAIL ERROR:", thumbError?.message || thumbError);
              }
            }

            const audioResponse = await fetch(songData.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
                "Referer": "https://m.youtube.com/"
              }
            });

            if (!audioResponse.ok) throw new Error("Audio fetch failed");

            const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

            if (!audioBuffer.length) {
              throw new Error("Audio buffer is empty");
            }

            await sock.sendMessage(jid, {
              audio: audioBuffer,
              mimetype: "audio/mpeg",
              ptt: false,
              fileName: `${title.replace(/[\\/:*?"<>|]/g, "_")}-DEVA-XMD.mp3`
            }, { quoted });

          } catch (e) {
            console.error("SONG ERROR:", e?.message || e);
            await sock.sendMessage(jid, {
              text: "❌ Song download failed. The music server may be unavailable right now. Please try again later."
            }, { quoted });
          }

          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "save") {
          try {
            const quotedMessage = getQuotedMessage(msg);
            const media = unwrapMessage(quotedMessage);

            if (!quotedMessage || !media) {
              await sock.sendMessage(jid, {
                text: `❌ पहले किसी WhatsApp Status को *Reply* करो, फिर *${botSettings.prefix || "."}save* भेजो।`
              }, { quoted });
              await clearActionPresence(sock, jid);
              continue;
            }

            const statusImage = media.imageMessage;
            const statusVideo = media.videoMessage;
            const statusAudio = media.audioMessage;
            const statusText =
              media.conversation ||
              media.extendedTextMessage?.text ||
              "";

            if (statusImage) {
              const buffer = await downloadMediaFromMessage(statusImage, "image");
              await sock.sendMessage(jid, {
                image: buffer,
                caption: statusImage.caption || "𝗦𝗧𝗔𝗧𝗨𝗦 𝗦𝗔𝗩𝗘𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬 ✅ ┃  ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇᴠᴀ xᴍᴅ ʙᴏᴛ ✦"
              }, { quoted });
            } else if (statusVideo) {
              const buffer = await downloadMediaFromMessage(statusVideo, "video");
              await sock.sendMessage(jid, {
                video: buffer,
                caption: statusVideo.caption || "𝗦𝗧𝗔𝗧𝗨𝗦 𝗦𝗔𝗩𝗘𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬 ✅ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇᴠᴀ xᴍᴅ ʙᴏᴛ ✦"
              }, { quoted });
            } else if (statusAudio) {
              const buffer = await downloadMediaFromMessage(statusAudio, "audio");
              await sock.sendMessage(jid, {
                audio: buffer,
                mimetype: statusAudio.mimetype || "audio/ogg; codecs=opus",
                ptt: statusAudio.ptt === true
              }, { quoted });
            } else if (statusText) {
              await sock.sendMessage(jid, {
                text: `💾 *Saved Status*\n\n${statusText}`
              }, { quoted });
            } else {
              await sock.sendMessage(jid, {
                text: "❌ इस Status का media/text उपलब्ध नहीं है।"
              }, { quoted });
            }
          } catch (e) {
            console.error("STATUS SAVE ERROR:", e?.message || e);
            await sock.sendMessage(jid, {
              text: "❌ Status save नहीं हो पाया। Status को दोबारा reply करके .save भेजें।"
            }, { quoted });
          }
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "vv") {
          try {
            const quotedMessage = getQuotedMessage(msg);
            const media = unwrapMessage(quotedMessage);
            const imageMessage = media?.imageMessage;
            const videoMessage = media?.videoMessage;
            const audioMessage = media?.audioMessage;

            if (!quotedMessage || (!imageMessage && !videoMessage && !audioMessage)) {
              await sock.sendMessage(jid, {
                text: `❌ Reply to a *View Once* photo, video or audio with *${botSettings.prefix || "."}vv*.`
              }, { quoted });
              await clearActionPresence(sock, jid);
              continue;
            }

            if (imageMessage) {
              const buffer = await downloadMediaFromMessage(imageMessage, "image");
              await sock.sendMessage(jid, { image: buffer, caption: "👁️‍🗨️ ᴠɪᴇᴡ ᴏɴᴄᴇ ┃ ᴍᴇᴅɪᴀ sᴜᴄᴄᴇssғᴜʟʟʏ ʀᴇᴄᴏᴠᴇʀᴇᴅ ✅" }, { quoted });
            } else if (videoMessage) {
              const buffer = await downloadMediaFromMessage(videoMessage, "video");
              await sock.sendMessage(jid, { video: buffer, caption: "👁️‍🗨️ ᴠɪᴇᴡ ᴏɴᴄᴇ ┃ ᴍᴇᴅɪᴀ sᴜᴄᴄᴇssғᴜʟʟʏ ʀᴇᴄᴏᴠᴇʀᴇᴅ ✅" }, { quoted });
            } else {
              const buffer = await downloadMediaFromMessage(audioMessage, "audio");
              await sock.sendMessage(jid, { audio: buffer, mimetype: audioMessage.mimetype || "audio/ogg; codecs=opus", ptt: audioMessage.ptt === true }, { quoted });
            }
          } catch (e) {
            console.error("VV ERROR:", e?.message || e);
            await sock.sendMessage(jid, { text: "❌ Failed to retrieve the View Once media." }, { quoted });
          }
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "sticker") {
          try {
            const media = await downloadStickerMedia(msg);
            if (!media) {
              await sock.sendMessage(jid, {
                text: `❌ Send/reply to a photo or video with *${botSettings.prefix || "."}sticker* to convert it into a sticker.`
              }, { quoted });
              await clearActionPresence(sock, jid);
              continue;
            }

            await sock.sendMessage(jid, { text: "⏳ Creating premium sticker..." }, { quoted });
            const source = await downloadMediaFromMessage(media.message, media.type);
            const sticker = media.type === "image"
              ? await makeImageSticker(source)
              : await makeVideoSticker(source);

            await sock.sendMessage(jid, { sticker }, { quoted });
          } catch (e) {
            console.error("STICKER ERROR:", e?.message || e);
            await sock.sendMessage(jid, {
              text: "❌ Sticker creation failed. Please use a supported photo/video (video up to 6 seconds works best)."
            }, { quoted });
          }
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "url") {
          try {
            const imageBuffer = await downloadImageForUrl(msg);
            if (!imageBuffer) {
              await sock.sendMessage(jid, {
                text: `❌ Reply to an image with *${botSettings.prefix || "."}url* to generate a direct URL.`
              }, { quoted });
              await clearActionPresence(sock, jid);
              continue;
            }

            await sock.sendMessage(jid, { text: "⏳ Uploading image to ImgBB..." }, { quoted });
            const uploaded = await uploadImageToImgBB(imageBuffer);
            const reply = `╭━━〔 🔗 IMAGE URL 〕━━╮
┃
┃ ${uploaded.url}
┃
╰━━━━━━━━━━━━━━━━━━╯

✅ Uploaded successfully via ImgBB.`;
            await sock.sendMessage(jid, { text: reply }, { quoted });
          } catch (e) {
            console.error("URL ERROR:", e?.message || e);
            await sock.sendMessage(jid, {
              text: `❌ URL upload failed.\n\nReason: ${e?.message || "Unknown error"}`
            }, { quoted });
          }
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "fullpp") {
          try {
            const imageBuffer = await downloadQuotedImage(msg);
            if (!imageBuffer) {
              await sock.sendMessage(jid, {
                text: `❌ Reply to an image with *${botSettings.prefix || "."}fullpp* to set it as the bot profile picture.`
              }, { quoted });
              await clearActionPresence(sock, jid);
              continue;
            }

            await setProfilePicture(sock, imageBuffer);
            await sock.sendMessage(jid, {
              text: "✅ Profile picture updated successfully."
            }, { quoted });
          } catch (e) {
            console.error("FULLPP ERROR:", e?.message || e);
            await sock.sendMessage(jid, {
              text: "❌ Failed to update the profile picture."
            }, { quoted });
          }
          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "alive") {
          // Compact animated Alive response. Uptime is calculated fresh on the
          // final frame so it always reflects the bot process start time.
          const aliveFrames = [
            "🟢 𝘼𝙡𝙞𝙫𝙚",
            "🟢 𝘼𝙡𝙞𝙫𝙚\n⚡ 𝘾𝙝𝙚𝙘𝙠𝙞𝙣𝙜...",
            "🟢 𝘼𝙡𝙞𝙫𝙚\n⚡ 𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙚𝙙..."
          ];

          const aliveMsg = await sock.sendMessage(
            jid,
            { text: aliveFrames[0] },
            { quoted }
          );

          // Animate by editing the same WhatsApp message, like the ping command.
          for (let i = 1; i < aliveFrames.length; i++) {
            await delay(450);
            await sock.relayMessage(
              jid,
              {
                protocolMessage: {
                  key: aliveMsg.key,
                  type: 14,
                  editedMessage: { conversation: aliveFrames[i] }
                }
              },
              {}
            );
          }

          await delay(450);
          const uptime = formatUptime(Date.now() - global.botStartTime);
          await sock.relayMessage(
            jid,
            {
              protocolMessage: {
                key: aliveMsg.key,
                type: 14,
                editedMessage: {
                  conversation: `🟢 𝘼𝙡𝙞𝙫𝙚\n⚡ 𝙐𝙥𝙩𝙞𝙢𝙚: ${uptime}`
                }
              }
            },
            {}
          );

          await clearActionPresence(sock, jid);
          continue;
        }

        if (/^(?:instagram|insta|ig)(?:\s|$)/.test(prefixCommand)) {
          // Keep the original message for URL extraction. The command itself is
          // normalized to lowercase above, but Instagram shortcodes/parameters
          // must retain their original casing.
          const instagramUrl = extractInstagramUrl(text);

          if (!instagramUrl) {
            await sock.sendMessage(jid, {
              text: `❌ Instagram URL missing.\n\nUse:\n${botSettings.prefix || ""}instagram <Instagram post/reel URL>`
            }, { quoted });
            await clearActionPresence(sock, jid);
            continue;
          }

          if (!isInstagramUrl(instagramUrl)) {
            await sock.sendMessage(jid, {
              text: "❌ Invalid Instagram URL.\n\nSend a public Instagram post or reel link."
            }, { quoted });
            await clearActionPresence(sock, jid);
            continue;
          }

          try {
            await sock.sendMessage(jid, {
              text: "⏳ *Downloading Instagram media...*"
            }, { quoted });

            const media = await downloadInstagramMedia(instagramUrl);
            const caption = buildInstagramDownloadCaption(media);

            if (media.isVideo) {
              await sock.sendMessage(jid, {
                video: media.buffer,
                mimetype: media.contentType.startsWith("video/") ? media.contentType : "video/mp4",
                caption
              }, { quoted });
            } else {
              await sock.sendMessage(jid, {
                image: media.buffer,
                mimetype: media.contentType.startsWith("image/") ? media.contentType : "image/jpeg",
                caption
              }, { quoted });
            }
          } catch (e) {
            console.error("INSTAGRAM ERROR:", e?.message || e);
            await sock.sendMessage(jid, {
              text: `❌ *Instagram download failed.*\n\n${e?.message || "Please try another public Instagram post/reel."}`
            }, { quoted });
          }

          await clearActionPresence(sock, jid);
          continue;
        }


        if (/^(?:pinterest|pin)(?:\s|$)/.test(prefixCommand)) {
          const pinterestUrl = extractPinterestUrl(text);

          if (!pinterestUrl) {
            await sock.sendMessage(jid, {
              text: `❌ Pinterest URL missing.\n\nUse:\n${botSettings.prefix || ""}pinterest <Pinterest Pin URL>\n\nExample:\n${botSettings.prefix || ""}pinterest https://pin.it/xxxxx`
            }, { quoted });
            await clearActionPresence(sock, jid);
            continue;
          }

          if (!isPinterestUrl(pinterestUrl)) {
            await sock.sendMessage(jid, {
              text: "❌ Invalid Pinterest URL.\n\nSend a public Pinterest Pin or pin.it link."
            }, { quoted });
            await clearActionPresence(sock, jid);
            continue;
          }

          try {
            await sock.sendMessage(jid, {
              text: "⏳ *Downloading Pinterest media...*"
            }, { quoted });

            const media = await downloadPinterestMedia(pinterestUrl);
            const caption = buildPinterestDownloadCaption(media);

            if (media.isVideo) {
              await sock.sendMessage(jid, {
                video: media.buffer,
                mimetype: media.contentType.startsWith("video/") ? media.contentType : "video/mp4",
                caption
              }, { quoted });
            } else {
              await sock.sendMessage(jid, {
                image: media.buffer,
                mimetype: media.contentType.startsWith("image/") ? media.contentType : "image/jpeg",
                caption
              }, { quoted });
            }
          } catch (e) {
            console.error("PINTEREST ERROR:", e?.message || e);
            await sock.sendMessage(jid, {
              text: `❌ *Pinterest download failed.*\n\n${e?.message || "Please try another public Pinterest Pin."}`
            }, { quoted });
          }

          await clearActionPresence(sock, jid);
          continue;
        }

        if (prefixCommand === "menu") {
          const ownerName = "DEVA-NAYAK";
          const pfx = botSettings.prefix || "";
          const mode = botSettings.mode.toUpperCase();
          const caption = `╭━〔 👑 DEVA XMD BOT 〕━╮
┃ ⚡  ULTRA PRO BOT v4.1
┣━━━━━━━━━━━━━━━━━━━┫
┃ 👤 OWNER ➜ *${ownerName}*
┃https://wa.me/916260021735
┃ 💻 PLATFORM ➜ ${process.platform}
┃ 🔐 MODE ➜ ${mode}
┃ ⚡ PREFIX ➜ ${pfx}
┃ ⏱️ UPTIME ➜ ${formatUptime(Date.now() - global.botStartTime)}
╰━━━━━━━━━━━━━━━━━
┃
╭━━〔 ⚡ GENERAL 〕━━╮
┃ • ${pfx}menu
┃ • ${pfx}ping
┃ • ${pfx}alive
┃ • ${pfx}uptime
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━〔 ⚙️ BOT SETTINGS 〕━╮
┃ 
┃ • mode public/private
┃ • prefix
┃ • settings
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━〔 ✨ AUTO SYSTEM 〕━╮
┃ • ${pfx}online on/off
┃ • ${pfx}Typing on/off
┃ • ${pfx}Recording on/off
┃ • ${pfx}Callreject on/off
┃ • ${pfx}Antidelete on/off
┃ • ${pfx}Read on/off
┃ • ${pfx}StatusReply on/off
┃ • ${pfx}GroupTextDelete on/off
┃ • ${pfx}Statuslike on/off
┃ • ${pfx}Autoreact on/off
┃ • ${pfx}Sreact on/off
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━━〔 👥 GROUP 〕━━╮
┃ • ${pfx}GroupTextDelete on/off
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━━━〔 🎨 MEDIA 〕━━━╮
┃ • ${pfx}Save
┃ • ${pfx}sticker
┃ • ${pfx}vv
┃ • ${pfx}url
┃ • ${pfx}fullpp
┃ • ${pfx}sticker
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━━〔  📥 DOWNLOAD 〕━━╮
┃ • ${pfx}song
┃ • ${pfx}instagram
┃ • ${pfx}pinterest
╰━━━━━━━━━━━━━━━━━━╯
┃
╭━━〔 👑 OWNER 〕━━╮
┃ • ${pfx}owner
┃
╰━💻 CODED BY : DEVA❤️`;
          const imagePath = MENU_IMAGE_PATH;
          if (fs.existsSync(imagePath)) {
            await sock.sendMessage(jid, { image: fs.readFileSync(imagePath), caption }, { quoted });
          } else {
            await sock.sendMessage(jid, { text: caption }, { quoted });
          }
          continue;
        }
      } catch (e) {
        console.error("❌ COMMAND ERROR:", e?.message || e);
      }
    }
  });
}

process.on("uncaughtException", e => console.error("UNCAUGHT:", e?.stack || e));
process.on("unhandledRejection", e => console.error("UNHANDLED:", e?.stack || e));

start().catch(e => {
  console.error("START ERROR:", e?.stack || e);
  process.exit(1);
});
