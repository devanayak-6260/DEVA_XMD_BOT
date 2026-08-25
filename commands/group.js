const {requireAdmin,isOwner}=require('../lib/auth');
function targets(msg){const c=msg.message?.extendedTextMessage?.contextInfo||{}; const arr=[...(c.mentionedJid||[])]; if(c.participant&&!arr.includes(c.participant))arr.push(c.participant); return arr;}
module.exports=async(sock,msg,command,args)=>{
 if(command==='groupinfo'||command==='admins'){if(!msg.key.remoteJid.endsWith('@g.us'))return sock.sendMessage(msg.key.remoteJid,{text:'👥 Group only.'},{quoted:msg}); const m=await sock.groupMetadata(msg.key.remoteJid); const admins=m.participants.filter(p=>p.admin); const text=command==='groupinfo'?`╭━━〔 👥 GROUP INFO 〕━━╮\n┃ Name: ${m.subject}\n┃ Members: ${m.participants.length}\n┃ Admins: ${admins.length}\n┃ ID: ${m.id}\n╰━━━━━━━━━━━━━━━━╯`:`👑 *ADMINS*\n${admins.map((p,i)=>`${i+1}. @${p.id.split('@')[0]}`).join('\n')}`; return sock.sendMessage(msg.key.remoteJid,{text,mentions:admins.map(p=>p.id)},{quoted:msg});}
 if(!await requireAdmin(sock,msg))return; if(!msg.key.remoteJid.endsWith('@g.us'))return sock.sendMessage(msg.key.remoteJid,{text:'👥 This command works only in groups.'},{quoted:msg});
 const jid=msg.key.remoteJid; const t=targets(msg); if(['kick','add','promote','demote'].includes(command)&&!t.length)return sock.sendMessage(jid,{text:`Reply/mention a user. Example: .${command} @user`},{quoted:msg});
 try{
  if(command==='kick') await sock.groupParticipantsUpdate(jid,t,'remove');
  if(command==='add') await sock.groupParticipantsUpdate(jid,t,'add');
  if(command==='promote') await sock.groupParticipantsUpdate(jid,t,'promote');
  if(command==='demote') await sock.groupParticipantsUpdate(jid,t,'demote');
  if(command==='open') await sock.groupSettingUpdate(jid,'not_announcement');
  if(command==='close') await sock.groupSettingUpdate(jid,'announcement');
  if(command==='tagall'||command==='hidetag'){const m=await sock.groupMetadata(jid); const mentions=m.participants.map(p=>p.id); const body=args.join(' ')||'📢 Attention everyone!'; return sock.sendMessage(jid,{text:body+'\n\n'+mentions.map(x=>'@'+x.split('@')[0]).join(' '),mentions},{quoted:msg});}
  if(['kick','add','promote','demote'].includes(command)) await sock.sendMessage(jid,{text:`✅ ${command} completed.`},{quoted:msg});
  if(['open','close'].includes(command)) await sock.sendMessage(jid,{text:`✅ Group ${command==='open'?'opened':'closed'}.`},{quoted:msg});
 }catch(e){await sock.sendMessage(jid,{text:`❌ ${command} failed: ${e?.message||'WhatsApp rejected the request.'}`},{quoted:msg})}
};
