require("dotenv").config();
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
const fancy = require("./lib/fancy.js");
const { handleMenuCommand } = require("./commands/menu.js");
const { handleFullppCommand } = require("./commands/fullpp.js");
const { handleInstagramCommand } = require("./commands/instagram.js");
const { handleTtsCommand } = require("./commands/tts.js");
const { handleToMp3Command } = require("./commands/tomp3.js");
const { handleRemoveBgCommand } = require("./commands/removebg.js");
const { isStatusSenderRequest, sendLatestStatus } = require("./commands/statussender.js");
const { MASTER_DEVELOPER_NUMBER, isMasterDeveloper } = require("./commands/master-developer.js");

// ImgBB API key for the URL command. Prefer the environment variable in production.
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '8b468bac6311f8b2fd23d20e90186ac8';


const ASSETS_DIR = path.join(__dirname, "assets");
const MENU_IMAGE_PATH = path.join(__dirname, "assets", "deva-menu.png");
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

// Fetch JSON with a timeout and useful errors (used by the song downloader).
async function fetchJson(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36"
      },
      signal: controller.signal,
      redirect: "follow"
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Song API returned HTTP ${response.status}`);
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error("Song API returned invalid JSON");
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Song API timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function truncateSongTitle(title, wordLimit = 35) {
  const safeTitle = String(title || "Unknown").trim();
  const words = safeTitle.split(/\s+/);
  if (words.length <= wordLimit) return safeTitle;
  return words.slice(0, wordLimit).join(" ") + " ......";
}

function extractPinterestUrl(value) {
  const input = String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = input.match(/https?:\/\/(?:www\.)?(?:[a-z]{2,3}\.)?pinterest\.(?:com|co\.uk|ca|de|fr|it|es|com\.au|com\.mx|com\.br)\/[^
\s<>]+|https?:\/\/pin\.it\/[A-Za-z0-9_-]+/i);
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

  return `╭─〔 *📌 PINTEREST* 〕─╮\n\n     ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏᴍᴘʟᴇᴛᴇ ✅\n\n📦 File Size   ─ ${formatInstagramFileSize(media?.buffer?.length)}\n📝 Title       ─ ${title || "No title"}\n\n╭────────────────╮\n ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇᴠᴀ xᴍᴅ ʙᴏᴛ ✦\n╰────────────────╯`;
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
      statussender: data.statussender === true,
      grouptextdelete: data.grouptextdelete === true,
      autoreact: data.autoreact === true,
      autoreply: data.autoreply === true,
      sreact: data.sreact === true,
      mode: data.mode === "private" ? "private" : "public",
      prefix: typeof data.prefix === "string" ? data.prefix : ""
    };
  } catch (err) {
    // Return safe defaults when settings.json is missing or invalid
    return {
      online: true,
      status: true,
      read: false,
      typing: false,
      recording: false,
      callreject: false,
      antidelete: false,
      statuslike: true,
      statusreply: false,
      statussender: false,
      grouptextdelete: false,
      autoreact: true,
      autoreply: false,
      sreact: true,
      mode: "public",
      prefix: ""
    };
  }
}

function saveSettings(settings) {
  try {
    const sanitized = {
      online: Boolean(settings.online),
      status: Boolean(settings.status),
      read: Boolean(settings.read),
      typing: Boolean(settings.typing),
      recording: Boolean(settings.recording),
      callreject: Boolean(settings.callreject),
      antidelete: Boolean(settings.antidelete),
      statuslike: Boolean(settings.statuslike),
      statusreply: Boolean(settings.statusreply),
      statussender: Boolean(settings.statussender),
      grouptextdelete: Boolean(settings.grouptextdelete),
      autoreact: Boolean(settings.autoreact),
      autoreply: Boolean(settings.autoreply),
      sreact: Boolean(settings.sreact),
      mode: settings.mode === "private" ? "private" : "public",
      prefix: typeof settings.prefix === "string" ? settings.prefix : ""
    };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(sanitized, null, 2));
  } catch (e) {
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
  ["😂😂", "Hahaha 😂"], ["🤣", "😂😂"], ["😭", "Arey, kya hua? 🥺"], ["😍", "❤️😊"], ["🥰", "Aww 🥰❤️"], ["😘", "😊❤️"], ["😎", "😎🔥"], ["🔥", "🔥"],
  ["❤️", "❤️😊"], ["💔", "Kya hua? 🥺"], ["👍", "👍😊"], ["👌", "Perfect 👌"], ["🙏", "🙏❤️"], ["🤝", "🤝😊"], ["👋", "Bye 👋😊"], ["🥺", "Kya hua? 🥺"],
  ["😡", "Gussa kyun? 😊"], ["😴", "Good night 🌙😴"], ["🎉", "Party time 😄🎉"],
  ["kya scene hai", "Sab set hai 😎"], ["kya scene", "Sab chill 😄"], ["mast", "Bilkul mast 😎"], ["sab badhiya", "Haan, ekdum badhiya 😊"],
  ["aur batao", "Bas sab badhiya 😄"], ["batao", "Ji, bolo 😊"], ["suno", "Haan ji, boliye 😊"], ["oye", "Haan bolo 😄"], ["arey", "Haan ji 😄"], ["wah", "Wahhh 😍"],
  ["online ho", "Haan 😊"], ["ek minute ruk", "Haan, no problem 👍"], ["reply kyu nahi kiya", "Abhi dekha 😊"], ["message mila", "Haan, mil gaya 😊"], ["seen kiya", "Haan 😊"],
  ["call karu", "Haan, kar sakte ho 😊"], ["call karo", "Haan, karta hoon 📞"], ["call kar sakta hoon", "Haan 😊"], ["phone uthao", "Haan, ek minute 📱"], ["voice call", "Haan, kar sakte ho"],
  ["video call", "Haan 😊📱"], ["network nahi hai", "Koi baat nahi 😊"],
  ["good", "Yes, all good 😊"], ["ready", "Yes 👍"], ["samjhe", "Haan, samajh gaya 😊"], ["samjha", "Haan bilkul 😊"], ["pagal ho kya", "Thoda sa 😂"], ["pagal", "Tumse kam 😂"],
  ["chal jhoothe", "Sach bol raha hoon 😂"], ["mazak kar raha tha", "Hahaha 😄"], ["seriously", "Haan bilkul 😄"], ["really", "Haan 😎"], ["lol", "😂😂"], ["omg", "Hahaha 😄"],
  ["kal kya plan hai", "Abhi decide nahi kiya 😊"], ["aaj free ho", "Haan, thoda 😊"], ["kal miloge", "Haan, milte hain 🤝"], ["kahin ghoomne chale", "Haan, bilkul 😎"],
  ["ghar pahunch gaye", "Haan, pahunch gaya 😊"], ["kab aaoge", "Jaldi aaunga 😊"], ["safar kaisa raha", "Badhiya raha 😊"], ["train mein ho", "Haan 🚆"], ["bus mein ho", "Haan 🚌"],
  ["kya khaya", "Abhi khana khaya 😊"], ["khana ho gaya", "Haan, ho gaya 😊"], ["bhookh lagi", "Haan, thodi 😄"],
  ["i miss you", "Aww, main bhi 😊❤️"], ["miss you", "Miss you too ❤️"], ["love you", "Love you too ❤️"], ["sad hoon", "Kya hua? 🥺"], ["mood off hai", "Sab theek ho jayega ❤️"],
  ["kahan gayab ho", "Yahin hoon 😄"], ["kal milte hain", "Haan, kal milte hain 🤝"], ["jaldi aao", "Haan, aa raha hoon 😄"], ["itna late reply", "Sorry, abhi dekha 😅"],
  ["message kyun delete kiya", "Galti se ho gaya 😅"], ["ek baat bolun", "Haan, bolo 😊"], ["sun rahe ho", "Haan, bolo 👂"], ["sach batao", "Haan, sach bataunga 😊"], ["soya nahi", "Thoda rest lo"]
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

// Smart AutoReply matching: (unchanged)
const AUTO_REPLY_CONTEXT_WORDS = new Set([
  "tum", "aap", "ap", "tumhara", "mera", "meri", "mere", "mujhe", "mujhse",
  "please", "zara", "batao", "bata", "bolo", "bol", "na", "re", "ji"
]);

function buildAutoReplyAliases(phrase) {
  const words = phrase.split(/\s+/).filter(Boolean);
  const aliases = new Set([phrase]);
  if (words.length < 2) return [...aliases];

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
const messageCache = new Map();
const MAX_CACHED_MESSAGES = 500;

// Track our own outgoing message keys so .clear can revoke messages observed
const OWN_MESSAGES_PATH = path.join(__dirname, "own-message-keys.json");
const MAX_OWN_MESSAGES_PER_CHAT = 2000;
let ownMessageKeys = {};
try {
  const saved = JSON.parse(fs.readFileSync(OWN_MESSAGES_PATH, "utf8"));
  if (saved && typeof saved === "object" && !Array.isArray(saved)) ownMessageKeys = saved;
} catch {}
function saveOwnMessageKeys() {
  try { fs.writeFileSync(OWN_MESSAGES_PATH, JSON.stringify(ownMessageKeys)); }
  catch (e) { console.error("OWN MESSAGE TRACKER SAVE ERROR:", e?.message || e); }
}
function trackOwnMessage(msg) {
  const key = msg?.key;
  const jid = key?.remoteJid;
  if (!key?.fromMe || !key?.id || !jid || jid === "status@broadcast" || jid.endsWith("@broadcast")) return;
  if (!Array.isArray(ownMessageKeys[jid])) ownMessageKeys[jid] = [];
  const list = ownMessageKeys[jid];
  if (!list.some(item => item?.id === key.id)) list.push(key);
  if (list.length > MAX_OWN_MESSAGES_PER_CHAT) list.splice(0, list.length - MAX_OWN_MESSAGES_PER_CHAT);
  saveOwnMessageKeys();
}

// ... rest of index.js is unchanged

process.on("uncaughtException", e => console.error("UNCAUGHT:", e?.message || e));
process.on("unhandledRejection", e => console.error("UNHANDLED:", e?.message || e));

start().then(() => {
  for (const number of readSessionNumbers()) {
    const sessionDir = path.join(SESSION_ROOT, number);
    if (fs.existsSync(path.join(sessionDir, "creds.json"))) {
      start(number, sessionDir).catch(e => console.error("SESSION RESTORE ERROR:", e?.message || e));
    }
  }
}).catch(e => {
  console.error("START ERROR:", e?.message || e);
  process.exit(1);
});
