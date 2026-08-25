const config=require('../config');
const autoreact=require('../commands/autoreact'), clear=require('../commands/clear');
const menu=require('../commands/menu'), ping=require('../commands/ping'), status=require('../commands/status'), react=require('../commands/react'), profile=require('../commands/profile'), sticker2img=require('../commands/sticker2img'), sticker=require('../commands/sticker'), fullpp=require('../commands/fullpp'), url=require('../commands/url'), setauto=require('../commands/setauto'), owner=require('../commands/owner'), runtime=require('../commands/runtime'), group=require('../commands/group'), media=require('../commands/media');

const groupCmds=new Set(['kick','add','promote','demote','open','close','tagall','hidetag','groupinfo','admins']);
const knownFromMe=new Set([
  'menu','help','ping','status','react','profile','info','toimg','sticker2img','sticker',
  'fullpp','url','owner','runtime','on','off','autoreact','setreact','clear','resize','compress','png','jpg',
  ...groupCmds
]);

module.exports=async(sock,msg)=>{
  try{
    const body=msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption || '';
    const normalized=body.trim();
    if(!normalized)return;

    const fromMe=!!msg.key?.fromMe;
    const pref=normalized.startsWith(config.prefix);
    let text='';
    if(pref) text=normalized.slice(config.prefix.length).trim();
    else if(fromMe){
      const f=normalized.split(/\s+/)[0].toLowerCase();
      if(!knownFromMe.has(f)) return;
      text=normalized;
    } else return;

    const parts=text.split(/\s+/);
    const cmd=parts[0].toLowerCase();
    const args=parts.slice(1);

    switch(cmd){
      case 'menu':
      case 'help': return menu(sock,msg);
      case 'ping': return ping(sock,msg);
      case 'status': return status(sock,msg);
      case 'react': return react(sock,msg);
      case 'profile':
      case 'info': return profile(sock,msg);
      case 'toimg':
      case 'sticker2img': return sticker2img(sock,msg);
      case 'sticker': return sticker(sock,msg);
      case 'fullpp': return fullpp(sock,msg);
      case 'url': return url(sock,msg);
      case 'owner': return owner(sock,msg);
      case 'runtime': return runtime(sock,msg);
      case 'autoreact':
      case 'setreact': return autoreact(sock,msg,args);
      case 'clear': return clear(sock,msg);
      case 'on':
      case 'off': return setauto(sock,msg,cmd,args);
      case 'resize':
      case 'compress':
      case 'png':
      case 'jpg': return media(sock,msg,cmd);
      default:
        if(groupCmds.has(cmd)) return group(sock,msg,cmd,args);
        if(!fromMe) {
          return sock.sendMessage(
            msg.key.remoteJid,
            {text:`❌ Unknown command: ${config.prefix}${cmd}\n\nType ${config.prefix}menu`},
            {quoted:msg}
          );
        }
    }
  }catch(e){
    console.log('Command Error:',e?.stack||e);
  }
};
