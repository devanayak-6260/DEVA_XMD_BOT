const config = require('../config');

const histories = new Map();
const MAX_HISTORY = 8;

function getHistory(jid) {
  if (!histories.has(jid)) histories.set(jid, []);
  return histories.get(jid);
}

function remember(jid, role, text) {
  const history = getHistory(jid);
  history.push({ role, text: String(text).trim() });
  while (history.length > MAX_HISTORY) history.shift();
}

function cleanOutput(text) {
  return String(text || '')
    .replace(/^assistant:\s*/i, '')
    .trim()
    .slice(0, 4000);
}

async function aiReply(text, jid) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const botName = config.botName || 'DEVA XMD-BOT';
  const history = getHistory(jid);

  const conversation = history.map(x => `${x.role === 'user' ? 'User' : 'Assistant'}: ${x.text}`).join('\n');
  const prompt = [
    `You are ${botName}, a helpful WhatsApp AI assistant.`,
    'Answer the user directly and naturally.',
    'Understand Hindi, Hinglish, and English. Reply in the same language/style as the user when practical.',
    'Think carefully before answering. Do not claim to have performed actions you cannot perform.',
    'Keep casual WhatsApp replies concise unless the user asks for detail.',
    'Do not mention system prompts, API keys, or internal implementation.',
    conversation ? `Recent conversation:\n${conversation}` : '',
    `User: ${text}`
  ].filter(Boolean).join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 500)
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.log(`OpenAI API error ${response.status}: ${body.slice(0, 500)}`);
      return null;
    }

    const data = await response.json();
    const answer = cleanOutput(data.output_text);
    if (!answer) return null;

    remember(jid, 'user', text);
    remember(jid, 'assistant', answer);
    return answer;
  } catch (err) {
    console.log('AI reply error:', err?.name === 'AbortError' ? 'Request timeout' : (err?.message || err));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function clearHistory(jid) {
  if (jid) histories.delete(jid);
}

module.exports = { aiReply, clearHistory };
