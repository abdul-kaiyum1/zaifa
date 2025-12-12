/**
 * storage.js
 * Persistent JSON storage for Arcadia
 */
const fs = require('fs');
const path = require('path');
const base = __dirname;
const playersFile = path.join(base, 'arcadia_players.json');
const pvpFile = path.join(base, 'arcadia_pvp.json');
const tradesFile = path.join(base, 'arcadia_trades.json');
const backupFile = path.join(base, 'arcadia_backup.json');

function ensure(file, def) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
}

ensure(playersFile, {});
ensure(pvpFile, {});
ensure(tradesFile, {});
ensure(backupFile, {});

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file)); } catch (e) { return {}; }
}
function saveJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

function createPlayer(uid) {
  return {
    id: uid,
    name: null,        // NEW
    kingdom: null,     // NEW
    level: 1,
    xp: 0,
    gold: 100,
    hp: 100,
    maxhp: 100,
    atk: 5,
    def: 2,
    inventory: [],
    weight: 0,
    carryLimit: 50,
    skills: { sword: 1 },
    pet: null,
    quests: [],
    pvp: true,
    lastDaily: 0
  };
}


function loadPlayers() { return loadJSON(playersFile); }
function savePlayers(obj) { saveJSON(playersFile, obj); }

function loadPvp() { return loadJSON(pvpFile); }
function savePvp(obj) { saveJSON(pvpFile, obj); }

function loadTrades() { return loadJSON(tradesFile); }
function saveTrades(obj) { saveJSON(tradesFile, obj); }

function backup() {
  const data = loadPlayers();
  saveJSON(backupFile, { time: Date.now(), data });
}
function restore() {
  const b = loadJSON(backupFile);
  if (b && b.data) savePlayers(b.data);
}

module.exports = {
  playersFile, pvpFile, tradesFile, backupFile,
  loadPlayers, savePlayers, createPlayer,
  loadPvp, savePvp, loadTrades, saveTrades,
  backup, restore
};
