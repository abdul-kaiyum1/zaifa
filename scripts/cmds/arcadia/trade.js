/**
 * trade.js
 * Create trade offers and accept via reply
 */
const DB = require('./storage');

function loadTrades(){ return DB.loadTrades(); }
function saveTrades(obj){ DB.saveTrades(obj); }

function createOffer(from, to, item, price, messageID) {
  const players = DB.loadPlayers();
  if (!players[from] || !players[to]) return { message: "Both players must be in Arcadia." };
  // check item ownership
  const inv = players[from].inventory;
  if (!inv.includes(item)) return { message: "You don't own that item." };
  // create trade
  const id = 't'+Date.now();
  const trade = { id, from, to, item, price: price || null, time: Date.now() };
  const trades = loadTrades();
  trades[messageID] = trade;
  saveTrades(trades);
  return { message: `<@${from}> offers **${item}** to <@${to}>${price?(' for '+price+' gold'):''} — Reply "accept" to this message to accept (10 min).` };
}

function accept(messageId, accepter) {
  const trades = loadTrades();
  const t = Object.values(trades).find(x => x.id === messageId || x.to === accepter);
  // In our core, accept is called with known trade object and messageId key was deleted earlier; but to be safe:
  if (!t) return { message: "Trade not found or expired." };
  const players = DB.loadPlayers();
  const seller = players[t.from], buyer = players[t.to];
  if (!seller || !buyer) return { message: "Players missing." };
  // check item present with seller
  const idx = seller.inventory.indexOf(t.item);
  if (idx === -1) return { message: "Seller no longer has the item." };
  // check buyer money
  if (t.price && buyer.gold < t.price) return { message: "Buyer can't afford." };
  // finalize
  seller.inventory.splice(idx,1);
  buyer.inventory.push(t.item);
  seller.gold += t.price || 0;
  if (t.price) buyer.gold -= t.price;
  DB.savePlayers(players);
  return { message: `Trade completed: <@${t.from}> sold ${t.item} to <@${t.to}>${t.price?(' for '+t.price+' gold'):''}.` };
}

module.exports = { createOffer, accept, loadTrades, saveTrades };
