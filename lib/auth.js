const config = require('../config');
function numberOf(jid=''){ return String(jid).split('@')[0].replace(/\D/g,''); }
function senderJid(msg){ return msg?.key?.participant || msg?.key?.remoteJid || ''; }
function isOwner(msg){
  if (msg?.key?.fromMe) return true;
  const owner = String(config.ownerNumber || '').replace(/\D/g,'');
  return !!owner && numberOf(senderJid(msg)) === owner;
}
async function isGroupAdmin(sock,msg){
  const jid=msg?.key?.remoteJid;
  if(!jid?.endsWith('@g.us')) return false;
  try { const meta=await sock.groupMetadata(jid); const who=senderJid(msg); return !!meta.participants.find(p=>p.id===who && (p.admin==='admin'||p.admin==='superadmin')); } catch { return false; }
}
async function requireOwner(sock,msg){ if(isOwner(msg)) return true; await sock.sendMessage(msg.key.remoteJid,{text:'⛔ Owner only command.'},{quoted:msg}); return false; }
async function requireAdmin(sock,msg){ if(isOwner(msg)||await isGroupAdmin(sock,msg)) return true; await sock.sendMessage(msg.key.remoteJid,{text:'⛔ Group admin only command.'},{quoted:msg}); return false; }
module.exports={numberOf,senderJid,isOwner,isGroupAdmin,requireOwner,requireAdmin};
