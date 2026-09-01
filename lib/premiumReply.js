function cleanText(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

const COMMAND_TITLES = {
  menu: 'MENU',
  ping: 'PING',
  latency: 'PING',
  speed: 'PING',
  uptime: 'UPTIME',
  runtime: 'UPTIME',
  prefix: 'PREFIX',
  song: 'SONG DOWNLOADER',
  apk: 'APK DOWNLOADER',
  instagram: 'INSTAGRAM DOWNLOADER',
  insta: 'INSTAGRAM DOWNLOADER',
  pinterest: 'PINTEREST DOWNLOADER',
  pin: 'PINTEREST DOWNLOADER',
  sticker: 'STICKER MAKER',
  toimg: 'STICKER TO IMAGE',
  sticker2img: 'STICKER TO IMAGE',
  v2sticker: 'VIDEO STICKER',
  vv: 'VIEW ONCE',
  fullpp: 'FULL PROFILE PICTURE',
  url: 'IMAGE URL',
  react: 'REACTION',
  autoreact: 'AUTO REACT',
  setreact: 'AUTO REACT',
  statuslike: 'STATUS LIKE',
  statusseen: 'STATUS SEEN',
  online: 'ONLINE',
  typing: 'TYPING',
  recording: 'RECORDING',
  callreject: 'CALL REJECT',
  antidelete: 'ANTI DELETE',
  read: 'AUTO READ',
  clear: 'CLEAR',
  settings: 'SETTINGS',
  mode: 'MODE',
  on: 'FEATURE CONTROL',
  off: 'FEATURE CONTROL',
  setauto: 'FEATURE CONTROL',
  owner: 'BOT OWNER',
  help: 'HELP',
  profile: 'PROFILE',
  info: 'BOT INFO'
};

function getHeading(text, command) {
  const cmd = String(command || '').toLowerCase();
  if (COMMAND_TITLES[cmd]) return COMMAND_TITLES[cmd];

  const body = cleanText(text);
  if (/pong|speed|latency/i.test(body)) return 'PING';
  if (/uptime|runtime/i.test(body)) return 'UPTIME';
  if (/prefix/i.test(body)) return 'PREFIX';
  if (/song|mp3|audio/i.test(body)) return 'SONG DOWNLOADER';
  if (/instagram/i.test(body)) return 'INSTAGRAM DOWNLOADER';
  if (/pinterest/i.test(body)) return 'PINTEREST DOWNLOADER';
  if (/apk/i.test(body)) return 'APK DOWNLOADER';
  if (/sticker/i.test(body)) return 'STICKER';
  if (/view once/i.test(body)) return 'VIEW ONCE';
  if (/profile picture|full pp/i.test(body)) return 'FULL PROFILE PICTURE';
  if (/image url|imgbb|url generation/i.test(body)) return 'IMAGE URL';
  if (/status like/i.test(body)) return 'STATUS LIKE';
  if (/auto react|reaction/i.test(body)) return 'AUTO REACT';
  if (/command not found|not found/i.test(body)) return 'COMMAND';
  if (/error|failed|invalid|denied|warning/i.test(body)) return 'NOTICE';
  if (/success|enabled|disabled|updated|done|complete/i.test(body)) return 'RESULT';
  return 'DEVA XMD';
}

function stripOldLayout(line) {
  let s = String(line ?? '').trim();

  // Remove common old box glyphs without deleting the actual reply text.
  s = s.replace(/^[┃│]/, '').replace(/[┃│]$/, '').trim();
  if (/^[╭╮╰╯┌┐└┘├┤┬┴┼─━═_*\.\s]+$/.test(s)) return '';
  return s;
}

function isLegacyTitle(line, heading) {
  const x = String(line ?? '')
    .replace(/[\p{So}\p{Sk}\p{P}\p{S}*_]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  if (!x) return true;
  if (/^(DEVA XMD BOT|DEVA XMD B0T|BOT RESPONSE|DEVA XMD BOT SYSTEM)$/.test(x)) return true;

  const titlePatterns = [
    /^DEVA XMD BOT (SONG|SONG DOWNLOADER)$/,
    /^SONG (DOWNLOADER|DOWNLOAD)$/,
    /^PREFIX (SETTINGS|UPDATED)$/,
    /^APK (DOWNLOADER|DOWNLOAD)$/,
    /^INSTAGRAM (DOWNLOADER|DOWNLOAD|VIP DOWNLOADER|ERROR)$/,
    /^PINTEREST (DOWNLOADER|DOWNLOAD|ERROR|COMPLETE)$/,
    /^PING$/,
    /^UPTIME$/,
    /^RUNTIME$/,
    /^STATUS LIKE( EMOJIS| ACTIVATED| SETTINGS)?$/,
    /^AUTO REACT( SETTINGS| UPDATED)?$/,
    /^REACTION$/,
    /^STICKER (MAKER|ERROR)$/,
    /^STICKER TO IMAGE$/,
    /^VIDEO STICKER( ERROR)?$/,
    /^VIEW ONCE( ERROR)?$/,
    /^FULL PP$/,
    /^PROFILE PICTURE( ERROR)?$/,
    /^IMAGE URL( READY)?$/,
    /^AUTO READ( SETTINGS| UPDATED)?$/,
    /^FEATURE (CONTROL|STATUS|UPDATED)$/,
    /^BOT OWNER$/,
    /^SETTINGS$/,
    /^MODE$/,
    /^CLEAR$/,
    /^HELP$/,
    /^BOT INFO$/,
    /^PROFILE$/,
    /^COMMAND NOT FOUND$/
  ];

  return titlePatterns.some(re => re.test(x)) || (heading && x === heading.toUpperCase());
}

function renderPremium(text, command) {
  const body = cleanText(text);
  if (!body) return body;

  // Do not wrap an already-rendered reply twice.
  if (body.includes('╭─〔 DEVA XMD BOT 〕─╮')) return body;

  const heading = getHeading(body, command);
  const sourceLines = body.split('\n').map(stripOldLayout).filter(Boolean);

  // Remove duplicated legacy headings/titles while keeping useful content.
  const lines = sourceLines.filter(line => {
    const x = line.replace(/[^\p{L}\p{N}\s]/gu, '').trim().toUpperCase();
    if (!x) return false;
    if (/^(DEVA XMD BOT|DEVA XMD B0T|BOT RESPONSE)$/.test(x)) return false;
    if (/^CODED BY\s*:?\s*DEVA/.test(x)) return false;
    if (isLegacyTitle(line, heading)) return false;
    return true;
  });

  const content = lines.length ? lines : [body];

  return [
    '╭─〔 DEVA XMD BOT 〕─╮',
    `│ ✦ ${heading}`,
    '├──────────────────────',
    ...content.map(line => `│ ${line}`),
    '╰──────────────────────╯'
  ].join('\n');
}

function createStyledSocket(sock, command) {
  return new Proxy(sock, {
    get(target, prop, receiver) {
      if (prop !== 'sendMessage') return Reflect.get(target, prop, receiver);

      return async (jid, content, options = {}) => {
        if (!content || typeof content !== 'object') {
          return target.sendMessage(jid, content, options);
        }

        const next = { ...content };

        if (typeof next.text === 'string') {
          next.text = renderPremium(next.text, command);
        }

        if (typeof next.caption === 'string') {
          next.caption = renderPremium(next.caption, command);
        }

        return target.sendMessage(jid, next, options);
      };
    }
  });
}

module.exports = { renderPremium, createStyledSocket };
