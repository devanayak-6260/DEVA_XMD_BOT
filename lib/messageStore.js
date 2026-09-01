// Lightweight in-memory store for messages sent by this account.
// Uses a Set per chat to avoid O(n) duplicate scans.
const MAX_PER_CHAT = 500;
const chats = new Map();

function remember(msg) {
  const key = msg?.key;
  const jid = key?.remoteJid;
  if (!key?.id || !jid || jid === 'status@broadcast' || !key.fromMe) return;

  let state = chats.get(jid);
  if (!state) {
    state = { list: [], ids: new Set() };
    chats.set(jid, state);
  }

  if (state.ids.has(key.id)) return;
  const item = {
    remoteJid: jid,
    id: key.id,
    fromMe: true,
    ...(key.participant ? { participant: key.participant } : {})
  };
  state.list.push(item);
  state.ids.add(key.id);

  while (state.list.length > MAX_PER_CHAT) {
    const removed = state.list.shift();
    if (removed) state.ids.delete(removed.id);
  }
}

function get(jid) {
  return [...(chats.get(jid)?.list || [])];
}

function remove(jid, ids) {
  const state = chats.get(jid);
  if (!state) return;
  const set = new Set(ids || []);
  state.list = state.list.filter((k) => !set.has(k.id));
  for (const id of set) state.ids.delete(id);
  if (!state.list.length) chats.delete(jid);
}

module.exports = { remember, get, remove, MAX_PER_CHAT };
