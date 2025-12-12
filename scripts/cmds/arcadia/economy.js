/**
 * economy.js
 * Shop, crafting, drops and economy balancing
 */
const DB = require('./storage');
const U = require('./utils');

function shopText() {
  const shop = getShop();
  let txt = "🛒 Arcadia Shop\n";
  for (const it of Object.keys(shop)) {
    txt += `• ${it} — ${shop[it].price} gold (${shop[it].weight} wt)\n`;
  }
  return txt;
}

function getShop() {
  // prices scale with basic balancing
  return {
    wood: { price: 10, weight: 2 },
    sword: { price: 80, weight: 8, atk: 3 },
    iron: { price: 45, weight: 5 },
    shield: { price: 70, weight: 7, def: 3 },
    potion: { price: 30, weight: 3, heal: 30 },
    gem: { price: 150, weight: 1 }
  };
}

function buy(item, uid) {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { ok:false, message:'You are not in Arcadia.' };
  const shop = getShop();
  if (!shop[item]) return { ok:false, message:'Item not in shop.' };
  if (p.gold < shop[item].price) return { ok:false, message:'Not enough gold.' };
  // check weight
  if ((p.weight + (shop[item].weight || 1)) > p.carryLimit) return { ok:false, message:'Too heavy to carry.' };
  p.gold -= shop[item].price;
  p.inventory.push(item);
  p.weight += (shop[item].weight || 1);
  // apply stat if equip immediate small effect (optional)
  if (shop[item].atk) p.atk += shop[item].atk;
  if (shop[item].def) p.def += shop[item].def;
  DB.savePlayers(players);
  return { ok:true, message: `You bought ${item}.` };
}

function craft(uid, item) {
  // simple recipes
  const recipes = {
    'iron-sword': { need: { iron: 2, wood: 1 }, gives: { name: 'iron-sword', atk: 6, weight: 10 } }
  };
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!recipes[item]) return { ok:false, message:'No such recipe.' };
  const recipe = recipes[item];
  // check materials
  const inv = p.inventory;
  for (let mat in recipe.need) {
    const needCount = recipe.need[mat];
    const count = inv.filter(i => i === mat).length;
    if (count < needCount) return { ok:false, message:`You need ${needCount}x ${mat}.` };
  }
  // consume
  for (let mat in recipe.need) {
    let toRemove = recipe.need[mat];
    for (let i = inv.length-1; i >=0 && toRemove>0; i--) {
      if (inv[i] === mat) { inv.splice(i,1); toRemove--; p.weight -= 1; }
    }
  }
  // give
  p.inventory.push(recipe.gives.name);
  p.weight += recipe.gives.weight || 1;
  p.atk += recipe.gives.atk || 0;
  DB.savePlayers(players);
  return { ok:true, message:`Crafted ${recipe.gives.name}!` };
}

function claimDaily(uid) {
  const players = DB.loadPlayers();
  const p = players[uid];
  const now = Date.now();
  if (now - p.lastDaily < 24*3600*1000) {
    const hrs = Math.ceil((24*3600*1000 - (now - p.lastDaily)) / 3600000);
    return { ok:false, message: `Daily claimed. Come back in ${hrs}h.` };
  }
  const gold = 50 + Math.floor(Math.random()*80);
  p.gold += gold;
  p.lastDaily = now;
  DB.savePlayers(players);
  return { ok:true, message:`Daily collected: ${gold} gold.` };
}

function randomDrop(rich=false) {
  const table = rich ? ['gem','iron-sword','potion','gem','gem'] : ['potion','wood','iron','gem','sword','potion'];
  return table[Math.floor(Math.random()*table.length)];
}

module.exports = { shopText, buy, craft, claimDaily, randomDrop };
