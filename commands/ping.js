module.exports = async (sock, msg) => {
  const jid = msg.key.remoteJid;
  const start = Date.now();

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h || d) parts.push(`${h}h`);
    if (m || h || d) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const uptime = formatUptime(process.uptime());

  const loading = [
    `╭━━━〔 ⚡ PING TEST 〕━━━╮\n┃\n┃ 🔄 Initializing...\n┃ ▓▓░░░░░░░░ 20%\n┃\n╰━━━〔 DEVA XMD 〕━━━╯`,
    `╭━━━〔 ⚡ PING TEST 〕━━━╮\n┃\n┃ 🔄 Initializing...\n┃ ▓▓▓▓▓░░░░░ 50%\n┃\n╰━━━〔 DEVA XMD 〕━━━╯`,
    `╭━━━〔 ⚡ PING TEST 〕━━━╮\n┃\n┃ 🔄 Initializing...\n┃ ▓▓▓▓▓▓▓▓▓▓ 100%\n┃\n╰━━━〔 DEVA XMD 〕━━━╯`
  ];

  try {
    const sent = await sock.sendMessage(jid, { text: loading[0] }, { quoted: msg });

    for (let i = 1; i < loading.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await sock.sendMessage(jid, { text: loading[i], edit: sent.key });
    }

    const latency = Date.now() - start;
    const finalText = `╭━━━〔 ⚡ PING TEST 〕━━━╮\n┃\n┃ 🔄 Initializing...\n┃ ▓▓▓▓▓▓▓▓▓▓ 100%\n┃\n┃ ⚡ Ping     : ${latency} ms\n┃ ⏱️ Uptime   : ${uptime}\n┃ 🟢 System   : ONLINE\n┃ 🚀 Response : ULTRA FAST\n┃\n╰━━━〔 DEVA XMD 〕━━━╯`;

    await sock.sendMessage(jid, { text: finalText, edit: sent.key });
  } catch (error) {
    console.error('Ping command error:', error);
    await sock.sendMessage(jid, {
      text: `╭━━━〔 ⚡ PING TEST 〕━━━╮\n┃\n┃ ⚡ Ping     : ${Date.now() - start} ms\n┃ ⏱️ Uptime   : ${uptime}\n┃ 🟢 System   : ONLINE\n┃ 🚀 Response : ULTRA FAST\n┃\n╰━━━〔 DEVA XMD 〕━━━╯`
    }, { quoted: msg });
  }
};
