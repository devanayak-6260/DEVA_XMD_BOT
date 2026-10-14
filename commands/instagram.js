const INSTAGRAM_API = "https://api.sayan-nexuswork.workers.dev/insta";

function extractInstagramUrl(value) {
  const input = String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match = input.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9._-]+(?:\/)?(?:\?[^\s<>]*)?/i);
  return match ? match[0].replace(/[),.!]+$/g, "") : "";
}

function isInstagramUrl(value) {
  try {
    const u = new URL(value);
    return ["instagram.com", "www.instagram.com"].includes(u.hostname.toLowerCase()) &&
      /^\/(?:p|reel|tv)\/[A-Za-z0-9._-]+\/?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

function findMediaUrl(data) {
  const preferredKeys = [
    "url", "download_url", "downloadUrl", "video_url", "videoUrl",
    "hd", "high_quality", "highQuality", "media_url", "mediaUrl",
    "link", "src", "play", "result"
  ];
  const seen = new Set();
  function visit(value, depth = 0) {
    if (!value || depth > 5) return "";
    if (typeof value === "string") {
      if (/^https?:\/\//i.test(value) && !seen.has(value)) {
        seen.add(value);
        return value;
      }
      return "";
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item, depth + 1);
        if (found) return found;
      }
      return "";
    }
    if (typeof value === "object") {
      for (const key of preferredKeys) {
        if (value[key] != null) {
          const found = visit(value[key], depth + 1);
          if (found) return found;
        }
      }
      for (const [key, item] of Object.entries(value)) {
        if (!preferredKeys.includes(key)) {
          const found = visit(item, depth + 1);
          if (found) return found;
        }
      }
    }
    return "";
  }
  return visit(data);
}

function findText(data, keys, fallback = "") {
  for (const key of keys) {
    const value = data && data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (value && typeof value === "object") {
        const found = findText(value, keys, "");
        if (found) return found;
      }
    }
  }
  return fallback;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
        "Accept": "application/json, video/*, image/*, */*",
        ...(options.headers || {})
      },
      redirect: "follow"
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Instagram download timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadInstagramMedia(instagramUrl) {
  const apiUrl = `${INSTAGRAM_API}?url=${encodeURIComponent(instagramUrl)}`;
  const apiResponse = await fetchWithTimeout(apiUrl, { headers: { "Accept": "application/json" } }, 60000);
  const apiType = (apiResponse.headers.get("content-type") || "").toLowerCase();
  if (!apiResponse.ok) {
    const detail = (await apiResponse.text().catch(() => "")).slice(0, 180);
    throw new Error(`Instagram API returned HTTP ${apiResponse.status}${detail ? `: ${detail}` : ""}`);
  }

  let data;
  if (apiType.includes("json") || apiType.includes("text")) {
    const raw = await apiResponse.text();
    try { data = JSON.parse(raw); } catch {
      throw new Error("Instagram API returned invalid JSON.");
    }
  } else if (apiType.startsWith("video/") || apiType.startsWith("image/") || apiType.includes("octet-stream")) {
    const buffer = Buffer.from(await apiResponse.arrayBuffer());
    if (!buffer.length) throw new Error("Instagram API returned an empty media file.");
    const isVideo = apiType.startsWith("video/");
    return { buffer, isVideo, contentType: isVideo ? apiType : (apiType.startsWith("image/") ? apiType : "image/jpeg"), caption: "", owner: "" };
  } else {
    const raw = await apiResponse.text();
    try { data = JSON.parse(raw); } catch {
      throw new Error("Instagram API response format is unsupported.");
    }
  }

  if (data?.success === false || data?.status === "error" || data?.error) {
    const message = typeof data.error === "string" ? data.error : (data.message || data.error?.message);
    throw new Error(message || "Instagram API could not fetch this post.");
  }

  const mediaUrl = findMediaUrl(data);
  if (!mediaUrl) throw new Error(data?.message || "No media download link was returned by the Instagram API.");

  const mediaResponse = await fetchWithTimeout(mediaUrl, {
    headers: { "Accept": "video/*, image/*, */*" }
  }, 90000);
  if (!mediaResponse.ok) throw new Error(`Instagram media download failed (HTTP ${mediaResponse.status}).`);

  const contentType = (mediaResponse.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const buffer = Buffer.from(await mediaResponse.arrayBuffer());
  if (!buffer.length) throw new Error("Instagram returned an empty media file.");

  const isVideo = contentType.startsWith("video/") ||
    /\.mp4(?:[?#]|$)/i.test(mediaUrl) ||
    /\/reel\//i.test(new URL(instagramUrl).pathname);
  if (!contentType.startsWith("video/") && !contentType.startsWith("image/") &&
      !contentType.includes("octet-stream")) {
    throw new Error("Instagram returned an unsupported media format.");
  }

  return {
    buffer,
    isVideo,
    contentType: isVideo ? (contentType.startsWith("video/") ? contentType : "video/mp4")
      : (contentType.startsWith("image/") ? contentType : "image/jpeg"),
    caption: findText(data, ["caption", "title", "description"], ""),
    owner: findText(data, ["username", "owner", "author"], "")
  };
}

function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleInstagramCommand({ sock, jid, quoted, text, prefix, clearActionPresence }) {
  const instagramUrl = extractInstagramUrl(text);
  if (!instagramUrl) {
    await sock.sendMessage(jid, {
      text: `❌ Instagram URL missing.\n\nUse:\n${prefix || ""}instagram <Instagram post/reel URL>`
    }, { quoted });
    await clearActionPresence(sock, jid);
    return;
  }
  if (!isInstagramUrl(instagramUrl)) {
    await sock.sendMessage(jid, { text: "❌ Invalid Instagram URL. Send a public Instagram post or reel link." }, { quoted });
    await clearActionPresence(sock, jid);
    return;
  }

  try {
    await sock.sendMessage(jid, { text: "⏳ *Downloading Instagram media...*" }, { quoted });
    const media = await downloadInstagramMedia(instagramUrl);
    const captionText = String(media.caption || "").replace(/\s+/g, " ").trim().slice(0, 500);
    const messageCaption = `╭─〔 *📥 INSTAGRAM* 〕─╮\n\n✅ Download complete\n📦 Size: ${formatFileSize(media.buffer.length)}${captionText ? `\n📝 ${captionText}` : ""}\n\nᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴇᴠᴀ xᴍᴅ ʙᴏᴛ ✦`;
    if (media.isVideo) {
      await sock.sendMessage(jid, {
        video: media.buffer,
        mimetype: media.contentType || "video/mp4",
        caption: messageCaption
      }, { quoted });
    } else {
      await sock.sendMessage(jid, {
        image: media.buffer,
        mimetype: media.contentType || "image/jpeg",
        caption: messageCaption
      }, { quoted });
    }
  } catch (error) {
    console.error("INSTAGRAM ERROR:", error?.message || error);
    await sock.sendMessage(jid, {
      text: `❌ *Instagram download failed.*\n\n${error?.message || "Please try another public Instagram post/reel."}`
    }, { quoted });
  } finally {
    await clearActionPresence(sock, jid);
  }
}

module.exports = { handleInstagramCommand };
