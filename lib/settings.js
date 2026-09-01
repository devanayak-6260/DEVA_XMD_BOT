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
      'autoStatusSeen', 'autoStatusLike', 'autoReact', 'alwaysOnline', 'autoRead',
      'autoTyping', 'autoRecording', 'autoCallReject', 'antiDelete', 'customReactEmoji', 'customStatusReaction', 'mode', 'prefix'
    ];
    const data = {};
    for (const key of keys) {
      if (key === 'prefix') data[key] = String(config.prefix || '.');
      else if (['customReactEmoji', 'customStatusReaction'].includes(key)) data[key] = Array.isArray(config[key]) ? config[key] : [];
      else if (key === 'mode') data[key] = config.mode === 'private' ? 'private' : 'public';
      else data[key] = Boolean(config[key]);
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Settings save error:', e?.message || e);
  }
}

function set(name, value) {
  config[name] = Boolean(value);
  save();
}

function setCustom(name, value) {
  config[name] = Array.isArray(value) ? value : [];
  save();
}

load();
module.exports = { set, setCustom, save, load };
