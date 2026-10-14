"use strict";

// Free TTS using Google Translate's public text-to-speech endpoint.
// No API key or additional npm package is required. Availability/rate limits
// are controlled by the upstream service and may change.
const MAX_TEXT_LENGTH = 180;

async function handleTtsCommand({ sock, jid, quoted, prefixCommand, prefix = ".", clearActionPresence = async () => {} }) {
  try {
    const tail = String(prefixCommand || "").trim().replace(/^tts\b/i, "").trim();
    if (!tail) {
      await sock.sendMessage(jid, {
        text: `🔊 *DEVA XMD BOT — Free TTS*\n\nUse: ${prefix}tts <text>\nHindi: ${prefix}tts hi नमस्ते, कैसे हो?\nEnglish: ${prefix}tts en Hello, how are you?\n\nMaximum ${MAX_TEXT_LENGTH} characters per message.`
      }, { quoted });
      return;
    }

    let language = "hi";
    let spokenText = tail;
    // A supported language code is optional; otherwise the full text is spoken.
    const langMatch = tail.match(/^(hi|en|bn|ta|te|mr|gu|pa|ur|es|fr|de|ja|ko|ar)\s+([\s\S]+)$/i);
    if (langMatch) {
      language = langMatch[1].toLowerCase();
      spokenText = langMatch[2].trim();
    }

    if (!spokenText) {
      await sock.sendMessage(jid, { text: `❌ Text missing. Use: ${prefix}tts <text>` }, { quoted });
      return;
    }
    if (spokenText.length > MAX_TEXT_LENGTH) {
      await sock.sendMessage(jid, { text: `❌ Text too long. Please keep it under ${MAX_TEXT_LENGTH} characters.` }, { quoted });
      return;
    }

    const endpoint = new URL("https://translate.google.com/translate_tts");
    endpoint.searchParams.set("ie", "UTF-8");
    endpoint.searchParams.set("client", "tw-ob");
    endpoint.searchParams.set("tl", language);
    endpoint.searchParams.set("q", spokenText);

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        "Referer": "https://translate.google.com/"
      },
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) throw new Error(`TTS service returned HTTP ${response.status}`);
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length || (contentType && !contentType.includes("audio") && !contentType.includes("mpeg"))) {
      throw new Error("TTS service did not return audio");
    }

    // Google Translate returns MP3 data. Send it as a regular audio attachment;
    // WhatsApp voice-note (PTT) messages require an Opus/OGG payload, not MP3.
    await sock.sendMessage(jid, {
      audio,
      mimetype: "audio/mpeg",
      fileName: "deva-tts.mp3",
      ptt: false
    }, { quoted });
  } catch (error) {
    console.error("TTS ERROR:", error?.message || error);
    await sock.sendMessage(jid, {
      text: `❌ *TTS failed.*\n\nFree TTS service may be busy or unavailable. Please try again later.\n${String(error?.message || "").slice(0, 180)}`
    }, { quoted });
  } finally {
    await clearActionPresence(sock, jid).catch(() => {});
  }
}

module.exports = { handleTtsCommand };
