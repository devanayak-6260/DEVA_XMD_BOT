module.exports = async (sock, msg) => {
  const jid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || msg.message?.extendedTextMessage?.contextInfo?.participant
    || msg.key?.participant
    || msg.key?.remoteJid;
  if (!jid) return;

  const number = jid.split('@')[0];
  const name = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    ? (msg.message?.extendedTextMessage?.contextInfo?.participant || '').split('@')[0]
    : (msg.pushName || 'Unknown');

  let info = null;
  try { info = await sock.onWhatsApp(jid); } catch (_) {}
  const registered = info?.[0]?.exists ? 'Yes ✅' : 'Unknown';

  const text = `╭━━━〔 👤 PROFILE / INFO 〕━━━╮
┃ Name: ${name || 'Unknown'}
┃ Number: +${number}
┃ WhatsApp: ${registered}
┃ JID: ${jid}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
};
