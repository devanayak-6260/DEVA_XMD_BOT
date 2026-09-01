const config = require('../config');
function numberOf(jid=''){ return String(jid).split('@')[0].replace(/\D/g,''); }
function senderJid(msg){ return msg?.key?.participant || msg?.key?.remoteJid || ''; }
function isOwner(msg){
  if (msg?.key?.fromMe) return true;
  const owner = String(config.ownerNumber || '').replace(/\D/g,'');
  return !!owner && numberOf(senderJid(msg)) === owner;
}
async function requireOwner(sock,msg){ if(isOwner(msg)) return true; await sock.sendMessage(msg.key.remoteJid,{text:'🚫 *Access Denied*\n_Only the bot owner can view/change settings_'},{quoted:msg}); return false; }
module.exports={numberOf,senderJid,isOwner,requireOwner};
