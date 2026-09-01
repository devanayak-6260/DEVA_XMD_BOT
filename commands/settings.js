const config = require('../config');

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(0)} MB`;
}

function getMemoryLimit() {
  // Docker/cgroup v2
  try {
    const fs = require('fs');
    const v2 = '/sys/fs/cgroup/memory.max';
    if (fs.existsSync(v2)) {
      const raw = fs.readFileSync(v2, 'utf8').trim();
      if (raw && raw !== 'max') return Number(raw);
    }
    // Docker/cgroup v1
    const v1 = '/sys/fs/cgroup/memory/memory.limit_in_bytes';
    if (fs.existsSync(v1)) {
      const raw = fs.readFileSync(v1, 'utf8').trim();
      const n = Number(raw);
      if (n > 0 && n < Number.MAX_SAFE_INTEGER) return n;
    }
  } catch (_) {}
  return null;
}

function liveStatus() {
  const mem = process.memoryUsage();
  const used = mem.rss;
  const limit = getMemoryLimit();
  const limitText = limit ? formatBytes(limit) : 'N/A';

  const features = [
    ['AUTO READ', !!config.autoRead],
    ['AUTO REACT', !!config.autoReact],
    ['STATUS LIKE', !!config.autoStatusLike],
    ['AUTO REPLY', !!config.autoReply],
    ['ALWAYS ONLINE', !!config.alwaysOnline],
    ['AUTO TYPING', !!config.autoTyping],
    ['AUTO RECORDING', !!config.autoRecording],
    ['CALL REJECT', !!config.autoCallReject]
  ];

  const active = features.filter(([, on]) => on).length;
  const inactive = features.length - active;
  const rows = features.map(([name, on]) =>
    `  ${on ? '🟢' : '🔴'}  ${name.padEnd(15, ' ')} ┃ ${on ? '✅ ON' : '❎ OFF'}`
  ).join('\n');

  return `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      👑  DEVA XMD BOT  👑     ┃
┃       FEATURE CONTROL PANEL   ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━〔 ⚡ LIVE STATUS 〕━━━┓

${rows}

┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━〔 ⚙️ BOT SETTINGS 〕━━━┓

  🎛️  MODE            ┃ ${(config.mode || 'public').toUpperCase()}
  🔑  PREFIX          ┃ ${config.prefix || '.'}
  🧠  RAM USAGE       ┃ ${formatBytes(used)}
  💾  RAM LIMIT       ┃ ${limitText}

┗━━━━━━━━━━━━━━━━━━━━━┛

        📊 ${features.length} FEATURES
        🟢 ${active} ACTIVE
        🔴 ${inactive} INACTIVE

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  ⚙️  FEATURE CONTROL          ┃
┃                              ┃
┃  🟢 ON FEATURES              ┃
┃  🔴 OFF FEATURES             ┃
┃  🔄 REFRESH STATUS           ┃
┃  ⚙️ MANAGE FEATURES          ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

        ✦ POWERED BY DEVA ✦`;
}

module.exports = async (sock, msg) => {
  return sock.sendMessage(msg.key.remoteJid, { text: liveStatus() }, { quoted: msg });
};
