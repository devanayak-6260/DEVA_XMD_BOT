const config=require('../config');
const now = require('performance-now');
const fs = require('fs');
const path = require('path');
const { thumbnail: pingContactThumbnail, photoB64: pingContactPhotoB64 } = require('./cardReply');
const { createStyledSocket } = require('./premiumReply');

const apk=require('../commands/apk');
const vv=require('../commands/vv');
const instagram=require('../commands/instagram');
const pinterest=require('../commands/pinterest');
const mode=require('../commands/mode');
const song=require('../commands/song');
const autoreact=require('../commands/autoreact'), statuslike=require('../commands/statuslike'), clear=require('../commands/clear');
const menu=require('../commands/menu'), react=require('../commands/react'), sticker2img=require('../commands/sticker2img'), sticker=require('../commands/sticker'), v2sticker=require('../commands/v2sticker'), fullpp=require('../commands/fullpp'), url=require('../commands/url'), setauto=require('../commands/setauto'), owner=require('../commands/owner'), prefix=require('../commands/prefix'), settings=require('../commands/settings');


function formatUptime(seconds) {
  const total = Math.floor(Number(seconds) || 0);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts = [];
  if (d) parts.push(`${d} day${d > 1 ? 's' : ''}`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} m`);
  parts.push(`${s} s`);
  return parts.join(', ');
}

module.exports=async(sock,msg)=>{
  try{
    const body=msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption || '';
    const normalized=body.trim();
    if(!normalized)return;

    // Commands are accessible ONLY when the configured prefix is used.
    // Plain text such as "menu" or "ping" must never trigger a command.
    // HARD PREFIX GATE: every bot command must start with the configured prefix.
    // Examples with prefix '.' -> '.menu' works, 'menu' never works.
    const activePrefix = String(config.prefix || '.');
    if (!activePrefix || !normalized.startsWith(activePrefix)) return;

    const text=normalized.slice(activePrefix.length).trim();
    if(!text) return;

    const parts=text.split(/\s+/);
    const cmd=parts[0].toLowerCase();
    const args=parts.slice(1);

    // The menu keeps its original design. Every other command uses the new
    // premium reply renderer for text and media captions.
    const replySock = createStyledSocket(sock, cmd);

    // Private mode: only the owner can use bot commands.
    if (cmd === 'mode') return mode(replySock,msg,args);
    if (cmd === 'prefix') return prefix(replySock,msg,args);
    if (config.mode === 'private') {
      const { isOwner } = require('./auth');
      if (!isOwner(msg)) {
        return replySock.sendMessage(msg.key.remoteJid, {
          text: 'ACCESS DENIED\nOwner access is required in private mode.'
        }, { quoted: msg });
      }
    }

    switch(cmd){
      case 'menu': return menu(sock,msg);
      case 'ping':
      case 'latency':
      case 'speed': {
        const jid = msg.key.remoteJid;
        const senderId = (msg.key.participant || msg.key.remoteJid).split('@')[0];

        // A single message cannot contain the result of its own network send
        // before that send has completed. The old implementation started and
        // stopped the timer immediately, so it measured only local JS execution
        // and usually returned 0-1 ms. We now calculate a useful end-to-end
        // estimate from the time WhatsApp delivered the incoming command to the
        // bot, plus the actual send/relay time. No edit/protocolMessage is used,
        // which also avoids the "Waiting for this message" problem.
        const receivedAt = Number(msg.messageTimestamp || 0) * 1000;
        const sendStarted = now();
        const sendStartedWall = Date.now();
        const baseAge = receivedAt > 0 ? Math.max(0, sendStartedWall - receivedAt) : 0;
        const latency = Math.max(1, Math.round(baseAge + (now() - sendStarted)));

        return replySock.sendMessage(
          jid,
          { text: `🏓 Pong!\n⏱️ *_DEVA XMD-BOT Speed: ${latency} ms_*` },
          {
            quoted: {
              key: {
                fromMe: false,
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast'
              },
              message: {
                contactMessage: {
                  displayName: 'DEVA XMD-BOT',
                  jpegThumbnail: pingContactThumbnail,
                  vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;DEVA XMD-BOT;;;\nFN:DEVA XMD-BOT\nPHOTO;ENCODING=b;TYPE=JPEG:${pingContactPhotoB64}\nitem1.TEL;waid=${senderId}:${senderId}\nitem1.X-ABLabel:Mobile\nEND:VCARD`
                }
              }
            }
          }
        );
      }

      case 'uptime':
      case 'runtime': {
        const uptime = process.uptime();
        const formatted = formatUptime(uptime);
        const senderId = (msg.key.participant || msg.key.remoteJid).split('@')[0];

        return replySock.sendMessage(
          msg.key.remoteJid,
          { text: `*_DEVA XMD-BOT UPTIME: ${formatted}_*` },
          {
            quoted: {
              key: {
                fromMe: false,
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast'
              },
              message: {
                contactMessage: {
                  displayName: 'DEVA XMD-BOT',
                  jpegThumbnail: pingContactThumbnail,
                  vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;DEVA XMD-BOT;;;\nFN:DEVA XMD-BOT\nPHOTO;ENCODING=b;TYPE=JPEG:${pingContactPhotoB64}\nitem1.TEL;waid=${senderId}:${senderId}\nitem1.X-ABLabel:Mobile\nEND:VCARD`
                }
              }
            }
          }
        );
      }

      case 'settings': return settings(replySock,msg);
      case 'react': return react(replySock,msg);
      case 'read': {
        const { requireOwner } = require('./auth');
        if (!(await requireOwner(replySock, msg))) return;
        const action = String(args[0] || '').toLowerCase();
        if (!['on','off'].includes(action)) {
          return replySock.sendMessage(msg.key.remoteJid, { text: `╭━━〔 👁️ AUTO READ SETTINGS 〕━━╮\n┃\n┃ Status : ${config.autoRead ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n┃\n┃ Commands :\n┃ • ${config.prefix}read on\n┃ • ${config.prefix}read off\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }
        const settings = require('./settings');
        settings.set('autoRead', action === 'on');
        return replySock.sendMessage(msg.key.remoteJid, { text: `╭━━〔 👁️ AUTO READ UPDATED 〕━━╮\n┃\n┃ Status : ${action === 'on' ? 'ENABLED 🟢' : 'DISABLED 🔴'}\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯` }, { quoted: msg });
      }
      case 'toimg':
      case 'sticker2img': return sticker2img(replySock,msg);
      case 'sticker': return sticker(replySock,msg);
      case 'v2sticker': return v2sticker(replySock,msg);
      case 'fullpp': return fullpp(replySock,msg);
      case 'url': return url(replySock,msg);
      case 'vv': return vv(replySock,msg);
      case 'insta':
      case 'instagram': return instagram(replySock,msg,args);
      case 'pin':
      case 'pinterest': return pinterest(replySock,msg,args);
      case 'song': return song(replySock,msg,args);
      case 'apk':
      case 'app':
      case 'application': return apk(replySock,msg,args);
      case 'owner': return owner(replySock,msg);
      case 'autoreact': {
        // .autoreact on/off controls auto-reaction; emoji values are handled
        // by the same command for backwards compatibility.
        const action = String(args[0] || '').toLowerCase();
        if (action === 'on' || action === 'off') {
          return setauto(replySock, msg, action, ['react']);
        }
        return autoreact(replySock,msg,args);
      }
      case 'setreact': return autoreact(replySock,msg,args);
      case 'statuslike': return statuslike(replySock,msg,args);
      case 'statusseen':
      case 'online':
      case 'typing':
      case 'recording':
      case 'callreject':
      case 'antidelete': {
        const action = String(args[0] || '').toLowerCase();
        if (action === 'on' || action === 'off') {
          return setauto(replySock, msg, action, [cmd]);
        }
        return setauto(replySock, msg, 'status', [cmd]);
      }
      case 'clear': return clear(replySock,msg);
      case 'on':
      case 'off': return setauto(replySock,msg,cmd,args);
      default:
        return replySock.sendMessage(
          msg.key.remoteJid,
          {text:`╭━━━〔 ⚠️ COMMAND NOT FOUND 〕━━━╮\n✦  DEVA XMD-BOT  SYSTEM\n────────────────────────────\n❌ Command : ${config.prefix}${cmd}\n💡 Try     : ${config.prefix}menu\n────────────────────────────\n╰━━━〔 DEVA XMD-BOT 〕━━━╯`},
          {quoted:msg}
        );
    }
  }catch(e){
    console.log('Command Error:', e?.stack || e);
    try {
      const jid = msg?.key?.remoteJid;
      if (jid) {
        const replySock = createStyledSocket(sock, cmd);
        await replySock.sendMessage(
          jid,
          { text: `⚠️ Command failed\nPlease try again.\n${e?.message ? `Reason: ${e.message}` : ''}` },
          { quoted: msg }
        );
      }
    } catch (replyError) {
      console.log('Error reply failed:', replyError?.message || replyError);
    }
  }
};
