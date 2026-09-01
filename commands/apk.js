const config = require('../config');

let scraperPromise;
async function getScraper() {
  if (!scraperPromise) {
    scraperPromise = import('aptoide_scrapper_fixed');
  }
  return scraperPromise;
}

module.exports = async (sock, msg, args) => {
  const from = msg.key.remoteJid;
  const query = (args || []).join(' ').trim();
  const prefix = config.prefix || '.';
  const botName = config.botName || 'DEVA XMD-BOT';

  if (!query) {
    return sock.sendMessage(
      from,
      {
        text:
          `📥 *${botName} APK DOWNLOADER*\n\n` +
          `Search and download an Android APK by name.\n\n` +
          `Example: ${prefix}apk WhatsApp`
      },
      { quoted: msg }
    );
  }

  try {
    await sock.sendMessage(
      from,
      { text: `🔍 Searching APK for *${query}*...` },
      { quoted: msg }
    );

    const { search, download } = await getScraper();
    const results = await search(query);

    if (!Array.isArray(results) || results.length === 0) {
      return sock.sendMessage(
        from,
        { text: `❌ No APK found for *${query}*.` },
        { quoted: msg }
      );
    }

    const apk = results[0];
    const dlInfo = await download(apk.id);
    const downloadLink = dlInfo?.dllink;

    if (!downloadLink) {
      return sock.sendMessage(
        from,
        { text: `❌ APK download link could not be obtained for *${apk.name || query}*.` },
        { quoted: msg }
      );
    }

    const safeName = String(apk.name || query)
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim() || 'application';

    await sock.sendMessage(
      from,
      {
        document: { url: downloadLink },
        mimetype: 'application/vnd.android.package-archive',
        fileName: `${safeName}.apk`,
        caption:
          `📥 *APK DOWNLOADER*\n\n` +
          `📌 *App:* ${apk.name || query}\n` +
          `📎 *Type:* Android APK\n\n` +
          `⚡ Powered by *${botName}*`
      },
      { quoted: msg }
    );
  } catch (error) {
    console.error('APK Error:', error?.stack || error);
    await sock.sendMessage(
      from,
      {
        text:
          `❌ *APK download failed.*\n\n` +
          `Please try another app name or try again later.`
      },
      { quoted: msg }
    );
  }
};
