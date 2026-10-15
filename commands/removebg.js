"use strict";

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    else break;
  }
  return current || null;
}

function getQuotedMessage(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg?.message?.imageMessage?.contextInfo?.quotedMessage || null;
}

function getImageMessage(msg) {
  const direct = unwrapMessage(msg?.message);
  const quoted = unwrapMessage(getQuotedMessage(msg));
  return direct?.imageMessage || quoted?.imageMessage || null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function handleRemoveBgCommand({ sock, jid, quoted, msg, prefix = ".", clearActionPresence = async () => {} }) {
  try {
    const imageMessage = getImageMessage(msg);
    if (!imageMessage) {
      await sock.sendMessage(jid, {
        text: `❌ Reply to a photo with *${prefix}removebg* or send a photo with the caption *${prefix}removebg*.`
      }, { quoted });
      return;
    }

    // Basic mimetype validation before downloading/uploading to remove.bg
    const mimetype = String(imageMessage.mimetype || "").toLowerCase();
    if (!mimetype.startsWith("image/")) {
      await sock.sendMessage(jid, { text: "❌ This file does not look like an image. Please provide a valid image." }, { quoted });
      return;
    }

    const apiKey = String(process.env.REMOVE_BG_API_KEY || "").trim();
    if (!apiKey) {
      await sock.sendMessage(jid, {
        text: "⚙️ *Remove Background setup required*\n\nAdd your Remove.bg API key as the environment variable:\n*REMOVE_BG_API_KEY*\n\nThen restart the bot and use .removebg again."
      }, { quoted });
      return;
    }

    await sock.sendMessage(jid, { text: "⏳ *Removing photo background...*" }, { quoted });

    const imageStream = await downloadContentFromMessage(imageMessage, "image");
    const imageBuffer = await streamToBuffer(imageStream);

    if (!imageBuffer || !imageBuffer.length) {
      throw new Error("Could not download the image. Please try another photo.");
    }

    // Ensure global FormData/Blob support exists in the runtime
    if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
      await sock.sendMessage(jid, { text: "❌ Remove.bg requires Node 18+ (global FormData/Blob/fetch). Your runtime does not provide these globals." }, { quoted });
      return;
    }

    const form = new FormData();
    form.append("image_file", new Blob([imageBuffer], { type: imageMessage.mimetype || "image/jpeg" }), "photo.jpg");
    form.append("size", "auto");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    let response;
    try {
      response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Accept": "image/png" },
        body: form,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response || !response.ok) {
      const detail = response ? (await response.text().catch(() => "")).slice(0, 350) : "No response from service.";
      if (response && response.status === 401) throw new Error("API key is invalid or not authorized. Check REMOVE_BG_API_KEY.");
      if (response && response.status === 402) throw new Error("Remove.bg API credits are exhausted or payment is required.");
      if (response && response.status === 429) throw new Error("Remove.bg rate limit reached. Please try again later.");
      throw new Error(`Remove.bg API error. ${detail}`);
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      const text = await response.text().catch(() => "");
      throw new Error(`Remove.bg returned unexpected content-type: ${contentType}. ${String(text).slice(0, 300)}`);
    }

    const output = Buffer.from(await response.arrayBuffer());
    if (!output.length) throw new Error("The background-removal service returned an empty image.");

    await sock.sendMessage(jid, {
      image: output,
      mimetype: "image/png",
      fileName: "deva-removed-background.png",
      caption: "✅ *Background removed successfully!*"
    }, { quoted });
  } catch (e) {
    console.error("REMOVEBG ERROR:", e?.message || e);
    await sock.sendMessage(jid, {
      text: `❌ *RemoveBG failed.*\n\n${String(e?.message || "Please try another photo.").slice(0, 450)}`
    }, { quoted });
  } finally {
    await clearActionPresence(sock, jid).catch(() => {});
  }
}

module.exports = { handleRemoveBgCommand };
