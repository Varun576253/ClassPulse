const clients = new Map();

const addClient = (sessionId, res) => {
  if (!clients.has(sessionId)) clients.set(sessionId, new Set());
  clients.get(sessionId).add(res);
};

const removeClient = (sessionId, res) => {
  const set = clients.get(sessionId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(sessionId);
};

const broadcast = (sessionId, event, data) => {
  const set = clients.get(sessionId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch (_) {}
  }
};

module.exports = { addClient, removeClient, broadcast };
