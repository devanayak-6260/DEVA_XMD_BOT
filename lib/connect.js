const commands = require('./commands');
const autoFeatures = require('./auto');
const { attach } = require('./antiDelete');
const settings = require('./settings');
const outgoingGuard = require('./outgoingGuard');

module.exports = async function connect(sock) {
  settings.load();
  outgoingGuard.install(sock);
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages || []) {
      if (!msg?.message) continue;
      await commands(sock, msg);
    }
  });
  attach(sock);
  await autoFeatures(sock);
  console.log('Bot handlers loaded ✅');
};
