// Local smart auto-reply engine. No API key is required.
function getText(msg) {
  return String(
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.documentMessage?.caption || ''
  ).trim();
}

function smartReply(text, config) {
  const t = text.toLowerCase().trim();
  const name = config.botName || 'DEVA XMD-BOT';
  if (!t) return null;

  if (/^(hi|hii|hiii|hello|hey|heyy|namaste|namaskar)\b/.test(t))
    return `Hello 👋 Kaise ho? 😊 Main ${name} hoon. Batao, kya help chahiye?`;
  if (/\b(good morning|gm)\b/.test(t)) return 'Good Morning 🌅😊 Aaj ka din achha jaye! Batao kya help chahiye?';
  if (/\b(good night|gn)\b/.test(t)) return 'Good Night 🌙✨ Achhe se rest karo. Kal phir baat karte hain 😊';
  if (/\b(thank(s| you)?|thx|dhanyawad|shukriya)\b/.test(t)) return 'You’re welcome 😊❤️';
  if (/\b(who are you|tum kaun|aap kaun|bot ka naam|name kya)\b/.test(t)) return `Main ${name} hoon 🤖⚡`; 
  if (/\b(menu|commands?)\b/.test(t)) return `Menu dekhne ke liye ${config.prefix || '.'}menu type karo 📋`;
  if (/\b(how are you|kaise ho|kya haal|haal chaal)\b/.test(t)) return 'Main bilkul theek hoon 😎⚡ Tum batao, kaise ho?';
  if (/\b(kya kar rahe ho|kya kr rahe ho|kya kar rhe ho|what are you doing)\b/.test(t)) return 'Main abhi tumse hi baat kar raha hoon 😄🤖 Batao, kya chal raha hai?';
  if (/\b(khana kha liya|khana kha liya kya|khaana kha liya|khana khaya)\b/.test(t)) return 'Haan 😄 Tumne khana kha liya? 🍽️';
  if (/\b(kahan ho|kaha ho|kahaan ho|where are you)\b/.test(t)) return 'Main yahin hoon 🤖📱 Tumse chat kar raha hoon.';
  if (/\b(help|madad|sahayata)\b/.test(t)) return `Bilkul 👍 Apni problem detail mein batao, main help karne ki koshish karta hoon. ${config.prefix || '.'}menu se commands bhi dekh sakte ho.`;
  if (/\b(bye|goodbye|see you|tc|take care)\b/.test(t)) return 'Okay 😊 Take care! Phir milte hain 👋';
  if (/[?？]$/.test(t) || /^(kya|kaise|kyun|kyu|kab|kahan|kahaan|kaun|which|what|why|how|when|where|who)\b/.test(t))
    return 'Samajh gaya 🤔 Thoda aur detail batao, taaki main sahi jawab de sakun. 😊';
  if (/\b(love|i love you|miss you|yaad)\b/.test(t)) return 'Aww 😄❤️ Main yahin hoon. Batao kya baat hai?';
  // Unknown text: do not send a generic reply. This prevents the same
  // fallback message from being sent again and again.
  return null;
}

module.exports = { getText, smartReply };
