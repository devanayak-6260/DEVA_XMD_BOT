const {
  getRandomEmoji
} = require("../lib/functions");


module.exports = async (sock, msg) => {

  try {

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        react: {
          text: getRandomEmoji(),
          key: msg.key
        }
      }
    );


    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: "Reaction Done ✅"
      },
      {
        quoted: msg
      }
    );


  } catch (error) {

    console.log(
      "React Command Error:",
      error.message
    );

  }

};