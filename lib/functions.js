const config = require("../config");


function randomFromArray(array) {

  return array[
    Math.floor(
      Math.random() * array.length
    )
  ];

}



function getRandomEmoji() {

  const list = Array.isArray(config.customReactEmoji) && config.customReactEmoji.length ? config.customReactEmoji : config.reactEmoji;
  return randomFromArray(list);

}



function getStatusEmoji() {

  return randomFromArray(
    config.statusReaction
  );

}



async function sendReaction(sock, msg) {

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

  } catch (error) {

    console.log(
      "Reaction Error:",
      error.message
    );

  }

}



module.exports = {
  getRandomEmoji,
  getStatusEmoji,
  sendReaction
};