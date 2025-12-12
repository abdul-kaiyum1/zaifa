/**
 * pets.js
 * Simple pet adoption, feed and stat boosts
 */
const DB = require('./storage');
const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;

const PET_TEMPLATES = {
  wolf: { name:'Wolf', atk: 2, def:1, hungerMax: 100 },
  hawk: { name:'Hawk', atk:1, def:0, hungerMax:80 },
  bear: { name:'Bear', atk:4, def:3, hungerMax:140 }
};

function adopt(uid, kind) {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { message: "Not found." };
  if (!PET_TEMPLATES[kind]) return { message: "No such pet." };
  if (p.pet) return { message: "You already have a pet." };
  p.pet = { type: kind, hp: PET_TEMPLATES[kind].hungerMax, hunger: 100, level:1, name: PET_TEMPLATES[kind].name };
  // small bonus
  p.atk += PET_TEMPLATES[kind].atk;
  DB.savePlayers(players);
  return { message: `You adopted a ${PET_TEMPLATES[kind].name}!` };
}

function info(uid) {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { message: "Not found." };
  if (!p.pet) return { message: "No pet." };
  const pet = p.pet;
  return { message: `Pet: ${pet.name} (Type: ${pet.type})\nHunger: ${pet.hunger}\nLevel: ${pet.level}` };
}

function feed(uid) {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { message: "Not found." };
  if (!p.pet) return { message: "No pet." };
  // require food in inventory (potion/wood can't be used)
  const idx = p.inventory.indexOf('potion');
  if (idx === -1) return { message: "You have no food (potion). Buy/bring a potion to feed." };
  p.inventory.splice(idx,1);
  p.pet.hunger = Math.min(100, (p.pet.hunger || 0) + 40);
  DB.savePlayers(players);
  return { message: `You fed ${p.pet.name}. Hunger restored.` };
}

module.exports = { adopt, info, feed };
