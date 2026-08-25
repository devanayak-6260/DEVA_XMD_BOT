const fs=require('fs'); const path=require('path');
const file=path.join(__dirname,'..','group-settings.json'); let data={};
function load(){try{if(fs.existsSync(file)) data=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){console.log('Group settings load:',e.message)}}
function save(){try{fs.writeFileSync(file,JSON.stringify(data,null,2))}catch(e){console.log('Group settings save:',e.message)}}
function get(jid){ if(!data[jid]) data[jid]={antilink:false,antibadword:false,welcome:false,goodbye:false}; return data[jid]; }
function set(jid,key,val){get(jid)[key]=!!val;save();}
load(); module.exports={get,set};
