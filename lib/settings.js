const fs = require('fs');
const path = require('path');
const config = require('../config');

const file = path.join(__dirname, '..', 'bot-settings.json');

function load() {
  try {
    if (fs.existsSync(file)) {
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      Object.assign(config, saved);
    }
  } catch (e) {
    console.log('Settings load error:', e?.message || e);
  }
}

function save() {
  try {
    const keys = [
      'autoStatusSeen', 'autoStatusLike', 'autoReact', 'alwaysOnline',
      'autoTyping', 'autoRecording', 'autoCallReject', 'antiDelete', 'autoReply', 'smartAutoReply', 'autoReplyKeywords', 'customReactEmoji'
    ];
    const data = {};
    for (const key of keys) data[key] = key === 'customReactEmoji' ? (Array.isArray(config[key]) ? config[key] : []) : key === 'autoReplyKeywords' ? (config[key] && typeof config[key] === 'object' && !Array.isArray(config[key]) ? config[key] : {}) : Boolean(config[key]);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Settings save error:', e?.message || e);
  }
}

function set(name, value) {
  config[name] = Boolean(value);
  save();
}

load();
module.exports = { set, save, load };
