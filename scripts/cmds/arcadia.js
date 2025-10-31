/**
 * arcadia.js
 * Text-only kingdom / arcadia game command for GoatBot-style bot
 * Author: adapted for Abdul Kaiyum
 *
 * Features:
 *  - Join / create kingdom
 *  - Profile, shop, buy, craft
 *  - Explore (random events)
 *  - PvE: fight AI (turn-by-turn)
 *  - PvP opt-in + challenge + accept by reply (5-minute expiry)
 *  - Daily reward
 *  - Leaderboard, backup/restore (admin)
 *  - JSON persistence (files created alongside this file)
 *
 * Usage examples:
 *  - arcadia join
 *  - arcadia profile
 *  - arcadia shop
 *  - arcadia buy sword
 *  - arcadia craft sword
 *  - arcadia explore
 *  - arcadia pve normal
 *  - arcadia pvp on/off
 *  - arcadia challenge @user
 *  - Reply to challenge message with 'accept'
 *  - arcadia daily
 *  - arcadia leaderboard
 *  - arcadia backup  (admin)
 *  - arcadia restore (admin)
 */

const fs = require("fs-extra");
const path = require("path");

// ---------- CONFIG ----------
const DB_DIR = __dirname;
const DB_FILE = path.join(DB_DIR, "arcadia_db.json");
const PLAYERS_FILE = path.join(DB_DIR, "arcadia_players.json");
const CHALLENGES_FILE = path.join(DB_DIR, "arcadia_challenges.json");
const BACKUP_FILE = path.join(DB_DIR, "arcadia_backup.json");

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour general action cooldown (change if needed)
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours daily reward
const PVP_CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes to accept
const ADMINS = ["100057399829870"]; // put admin userIDs here

// ---------- GAME ASSETS ----------
const SHOP = {
  bread: { name: "Loaf of Bread", price: 10, type: "consumable", effect: { food: 20 } },
  water: { name: "Bottled Water", price: 5, type: "consumable", effect: { food: 10 } },
  sword: { name: "Steel Sword", price: 500, type: "weapon", attack: 12 },
  shield: { name: "Leather Shield", price: 400, type: "armor", defense: 10 },
  bow: { name: "Hunting Bow", price: 600, type: "weapon", attack: 16 },
  potion: { name: "Healing Potion", price: 300, type: "consumable", effect: { heal: 50 } },
  horse: { name: "War Horse", price: 1200, type: "unit", unitType: "cavalry", attack: 22, defense: 10 },
  rifle: { name: "Old Rifle", price: 900, type: "weapon", attack: 30 },
  gem: { name: "Gemstone", price: 800, type: "currency" },
  drone: { name: "Scout Drone", price: 1000, type: "utility", effect: { scout: true } },
  spellbook: { name: "Spellbook", price: 1500, type: "magic", attack: 45 }
};

const RECIPES = {
  sword: { requires: { metal: 2, wood: 1 }, result: { name: "Forged Sword", key: "sword", attack: 25 } },
  armor: { requires: { metal: 3, leather: 2 }, result: { name: "Reinforced Armor", key: "shield", defense: 25 } },
  potion: { requires: { herb: 2, water: 1 }, result: { name: "Healing Potion", key: "potion", effect: { heal: 80 } } }
};

const AI_DIFFICULTY = {
  easy: { mult: 0.8, name: "Easy" },
  normal: { mult: 1.0, name: "Normal" },
  hard: { mult: 1.3, name: "Hard" }
};

// ---------- DEFAULT DB ----------
const DEFAULT_DB = {
  kingdoms: {},   // kingdomId -> kingdom
  players: {},    // userId -> player object
  challenges: {}  // challengeId -> challenge object
};

// ---------- UTIL: load/save ----------
function ensureFiles() {
  if (!fs.existsSync(DB_FILE)) fs.writeJsonSync(DB_FILE, DEFAULT_DB, { spaces: 2 });
  if (!fs.existsSync(PLAYERS_FILE)) fs.writeJsonSync(PLAYERS_FILE, {}, { spaces: 2 });
  if (!fs.existsSync(CHALLENGES_FILE)) fs.writeJsonSync(CHALLENGES_FILE, {}, { spaces: 2 });
}

function loadAll() {
  ensureFiles();
  const base = fs.readJsonSync(DB_FILE);
  const players = fs.readJsonSync(PLAYERS_FILE);
  const challenges = fs.readJsonSync(CHALLENGES_FILE);
  return { base, players, challenges };
}

function saveAll(base, players, challenges) {
  fs.writeJsonSync(DB_FILE, base, { spaces: 2 });
  fs.writeJsonSync(PLAYERS_FILE, players, { spaces: 2 });
  fs.writeJsonSync(CHALLENGES_FILE, challenges, { spaces: 2 });
}

function backupAll() {
  const { base, players, challenges } = loadAll();
  const backup = { base, players, challenges, at: Date.now() };
  fs.writeJsonSync(BACKUP_FILE, backup, { spaces: 2 });
  return backup;
}

function restoreFromBackup() {
  if (!fs.existsSync(BACKUP_FILE)) throw new Error("Backup not found");
  const backup = fs.readJsonSync(BACKUP_FILE);
  saveAll(backup.base, backup.players, backup.challenges);
  return backup;
}

// ---------- HELPERS ----------
function now() { return Date.now(); }
function fmt(n) { return Number(n).toLocaleString(); }

function ensurePlayer(players, userId, name = `User_${userId}`) {
  if (!players[userId]) {
    players[userId] = {
      id: userId,
      name: name,
      gold: 500,
      resources: { wood: 5, metal: 3, food: 20, herb: 1, leather: 0 },
      inventory: {}, // itemKey -> qty
      equipped: { weapon: null, armor: null },
      troops: { soldier: 5, archer: 2, cavalry: 0 },
      kingdomId: null,
      lastDaily: 0,
      pvpEnabled: false,
      stats: { wins: 0, losses: 0, pveWins: 0, pveLosses: 0 },
      cooldownUntil: 0
    };
  }
}

// create a kingdom and link to player
function createKingdom(base, players, userId, name) {
  const kid = `k_${userId}_${Math.floor(Math.random() * 10000)}`;
  if (players[userId].kingdomId) throw new Error("You already own a kingdom.");
  const kingdom = {
    id: kid,
    name,
    owner: userId,
    resources: { gold: 1000, food: 200, metal: 10 },
    troops: { soldier: 10, archer: 5, cavalry: 0 },
    units: [],
    items: {}, // itemKey -> qty
    createdAt: now(),
    lastActive: now()
  };
  base.kingdoms[kid] = kingdom;
  players[userId].kingdomId = kid;
  return kingdom;
}

function getPlayerKingdom(base, players, userId) {
  ensurePlayer(players, userId);
  const kid = players[userId].kingdomId;
  if (!kid) return null;
  return base.kingdoms[kid] || null;
}

function addItemToKingdom(kingdom, key, qty = 1) {
  if (!kingdom.items[key]) kingdom.items[key] = 0;
  kingdom.items[key] += qty;
}

function removeItemFromKingdom(kingdom, key, qty = 1) {
  if (!kingdom.items[key]) return false;
  kingdom.items[key] = Math.max(0, kingdom.items[key] - qty);
  return true;
}

// ---------- COMBAT HELPERS ----------
function calculateAttackPower(kingdom) {
  const soldierPower = (kingdom.troops.soldier || 0) * 6;
  const archerPower = (kingdom.troops.archer || 0) * 8;
  const cavalryPower = (kingdom.troops.cavalry || 0) * 14;
  let itemAttack = 0;
  for (const [k, v] of Object.entries(kingdom.items || {})) {
    if (!SHOP[k]) continue;
    const s = SHOP[k];
    if (s.attack) itemAttack += s.attack * v;
  }
  const unitBonus = (kingdom.units || []).reduce((acc, u) => acc + (u.attack || 0), 0);
  return Math.max(10, Math.floor(soldierPower + archerPower + cavalryPower + itemAttack + unitBonus));
}

function calculateDefensePower(kingdom) {
  const base = (kingdom.troops.soldier || 0) * 4 + (kingdom.troops.archer || 0) * 5 + (kingdom.troops.cavalry || 0) * 8;
  let armor = 0;
  for (const [k, v] of Object.entries(kingdom.items || {})) {
    if (!SHOP[k]) continue;
    const s = SHOP[k];
    if (s.defense) armor += s.defense * v;
  }
  const unitBonus = (kingdom.units || []).reduce((acc, u) => acc + (u.defense || 0), 0);
  return Math.max(10, Math.floor(base + armor + unitBonus));
}

// ---------- AI GENERATOR ----------
function generateAiKingdom(difficulty = "normal") {
  const mult = AI_DIFFICULTY[difficulty]?.mult || 1;
  const troops = {
    soldier: Math.max(3, Math.floor((5 + Math.random() * 10) * mult)),
    archer: Math.max(1, Math.floor((2 + Math.random() * 6) * mult)),
    cavalry: Math.floor(Math.random() * 3 * mult)
  };
  const items = {};
  const keys = Object.keys(SHOP);
  for (let i = 0; i < 3; i++) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    items[k] = (items[k] || 0) + 1;
  }
  return {
    id: `ai_${Math.floor(Math.random() * 100000)}`,
    name: `AI-${Math.random().toString(36).slice(2, 6)}`,
    owner: "AI",
    resources: { gold: 800, food: 200, metal: 10 },
    troops,
    units: [],
    items,
    createdAt: now(),
    lastActive: now()
  };
}

// ---------- BATTLE ENGINE ----------
async function startBattle(api, threadID, state, players, base) {
  // state: { battleId, attacker:{kingdom,hp}, defender:{kingdom,hp}, turn, round, maxRounds }
  // send initial
  const header = `⚔️ BATTLE START: ${state.attacker.kingdom.name} vs ${state.defender.kingdom.name}`;
  const status = `• Attacker HP: ${state.attacker.hp}  • Defender HP: ${state.defender.hp}`;
  const power = `• Attacker AP: ${calculateAttackPower(state.attacker.kingdom)}  • Defender AP: ${calculateAttackPower(state.defender.kingdom)}`;
  const help = `Reply with 'attack', 'defend', or 'use <itemKey>' when it's your turn.`;

  const send = await new Promise((resolve) => {
    api.sendMessage(`${header}\n${status}\n${power}\n\n${help}`, threadID, (err, info) => resolve(info));
  });

  // attach reply handler in global map
  global.GoatBot.onReply.set(send.messageID, {
    commandName: "arcadia_battle",
    battleId: state.battleId,
    messageID: send.messageID,
    threadID,
    state // we keep state direct here for convenience; we will persist players/base separately
  });

  // store active battles in players object for persistence and referencing
  players._activeBattles = players._activeBattles || {};
  players._activeBattles[state.battleId] = state;

  // persist
  saveAll(base, players, fs.readJsonSync(CHALLENGES_FILE)); // challenges file currently unchanged - simple write
  return send;
}

function computeDamage(attackerKingdom, defenderKingdom, sideBuff = 1) {
  const atk = calculateAttackPower(attackerKingdom);
  const def = calculateDefensePower(defenderKingdom);
  // a bit random: base = atk - def*0.4, scaled
  let base = Math.floor((atk - def * 0.45) * (0.6 + Math.random() * 0.9));
  if (base < 3) base = Math.floor(3 + Math.random() * 5);
  return Math.floor(base * sideBuff);
}

// ---------- PVP CHALLENGE HELPERS ----------
function createChallenge(challenges, attackerId, defenderId, messageID) {
  const id = `ch_${Math.floor(Math.random() * 1000000)}`;
  const expiresAt = now() + PVP_CHALLENGE_EXPIRY_MS;
  challenges[id] = {
    id,
    attacker: attackerId,
    defender: defenderId,
    createdAt: now(),
    expiresAt,
    messageID,
    timeoutActive: true
  };
  // start auto-expiry
  setTimeout(() => {
    // reload file to ensure consistent state
    try {
      const chs = fs.readJsonSync(CHALLENGES_FILE);
      if (chs[id]) {
        delete chs[id];
        fs.writeJsonSync(CHALLENGES_FILE, chs, { spaces: 2 });
      }
    } catch (e) {
      // ignore
    }
  }, PVP_CHALLENGE_EXPIRY_MS + 1000);
  return challenges[id];
}
function removeChallenge(challenges, id) {
  if (challenges[id]) delete challenges[id];
}

// ---------- HELP TEXT ----------
function help(pfx) {
  return [
    `🏹 Arcadia — Text Kingdom RPG (text-only)`,
    `${pfx}arcadia join — create / join the game and get your kingdom`,
    `${pfx}arcadia profile — show your kingdom & stats`,
    `${pfx}arcadia shop — view shop items`,
    `${pfx}arcadia buy <itemKey> — buy an item`,
    `${pfx}arcadia craft <recipeKey> — craft item (recipes: ${Object.keys(RECIPES).join(", ")})`,
    `${pfx}arcadia explore — go explore for resources & events`,
    `${pfx}arcadia pve [easy|normal|hard] — fight AI`,
    `${pfx}arcadia pvp on|off — toggle PvP opt-in`,
    `${pfx}arcadia challenge @user — send PvP challenge`,
    `Reply to a challenge message with 'accept' to accept (5 min expiry)`,
    `${pfx}arcadia daily — claim daily reward`,
    `${pfx}arcadia leaderboard — show top players`,
    `${pfx}arcadia backup — admin backup DB`,
    `${pfx}arcadia restore — admin restore DB`,
    `Enjoy!`
  ].join("\n");
}

// ---------- COMMAND EXPORT ----------
module.exports = {
  config: {
    name: "arcadia",
    aliases: ["kingdom", "arc"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Arcadia text-based kingdom RPG" },
    longDescription: { en: "Explore, craft, fight AI or friends, and grow your kingdom." },
    category: "game",
    guide: { en: "Type {p}arcadia help to start" }
  },

  onStart: async function ({ api, event, args, usersData, commandName }) {
    ensureFiles();
    const { base, players, challenges } = loadAll();
    const userId = event.senderID;
    const prefix = global.prefix || "!";
    const sub = (args[0] || "").toLowerCase();

    // ensure player entry
    const userName = (await usersData.get(userId)).name || `User_${userId}`;
    ensurePlayer(players, userId, userName);

    try {
      if (!sub || sub === "help") {
        return api.sendMessage(help(prefix), event.threadID, event.messageID);
      }

      // JOIN / CREATE KINGDOM
      if (sub === "join") {
        if (players[userId].kingdomId) return api.sendMessage("You already have a kingdom. Use 'arcadia profile' to view it.", event.threadID, event.messageID);
        const name = args.slice(1).join(" ").trim() || `${userName}'s Realm`;
        const kingdom = createKingdom(base, players, userId, name);
        saveAll(base, players, challenges);
        return api.sendMessage(`🏰 Kingdom created: ${kingdom.name}\nYou start with ${fmt(kingdom.resources.gold)} gold, some troops, and motivation!`, event.threadID, event.messageID);
      }

      // PROFILE
      if (sub === "profile") {
        const kingdom = getPlayerKingdom(base, players, userId);
        if (!kingdom) return api.sendMessage("You don't have a kingdom yet. Create one with 'arcadia join <name>'.", event.threadID, event.messageID);
        const p = players[userId];
        const lines = [
          `🏰 Kingdom: ${kingdom.name}`,
          `👑 Owner: ${p.name}`,
          `💰 Gold: ${fmt(kingdom.resources.gold)}  |  Food: ${fmt(kingdom.resources.food)}  |  Metal: ${fmt(kingdom.resources.metal)}`,
          `⚔️ Troops: Soldiers ${kingdom.troops.soldier}, Archers ${kingdom.troops.archer}, Cavalry ${kingdom.troops.cavalry}`,
          `🎒 Items: ${Object.entries(kingdom.items).map(([k, q]) => `${k} x${q}`).join(", ") || "None"}`,
          `🧾 Inventory: ${Object.entries(p.inventory).map(([k, q]) => `${k} x${q}`).join(", ") || "None"}`,
          `📈 Stats — Wins: ${p.stats.wins} | Losses: ${p.stats.losses} | PVEs: ${p.stats.pveWins}/${p.stats.pveLosses}`,
          `⚙️ PvP Opt-In: ${p.pvpEnabled ? "Enabled" : "Disabled"}`
        ];
        return api.sendMessage(lines.join("\n"), event.threadID, event.messageID);
      }

      // SHOP
      if (sub === "shop") {
        const lines = ["🛒 Arcadia Shop:"];
        for (const [k, v] of Object.entries(SHOP)) {
          lines.push(`${k} — ${v.name} — $${fmt(v.price)} — ${v.type}${v.attack ? ` — ATK:${v.attack}` : ""}${v.defense ? ` — DEF:${v.defense}` : ""}`);
        }
        lines.push(`\nBuy with 'arcadia buy <itemKey>'`);
        return api.sendMessage(lines.join("\n"), event.threadID, event.messageID);
      }

      // BUY
      if (sub === "buy") {
        const itemKey = (args[1] || "").toLowerCase();
        if (!itemKey || !SHOP[itemKey]) return api.sendMessage("Usage: arcadia buy <itemKey>. Use 'arcadia shop' to see items.", event.threadID, event.messageID);
        const p = players[userId];
        const kingdom = getPlayerKingdom(base, players, userId);
        if (!kingdom) return api.sendMessage("Create a kingdom with 'arcadia join' first.", event.threadID, event.messageID);
        const item = SHOP[itemKey];
        if (p.gold < item.price) return api.sendMessage("You don't have enough gold.", event.threadID, event.messageID);
        p.gold -= item.price;
        addItemToKingdom(kingdom, itemKey, 1);
        kingdom.lastActive = now();
        saveAll(base, players, challenges);
        return api.sendMessage(`✅ Purchased ${item.name} for $${fmt(item.price)}. Use it in battle with 'use <itemKey>'.`, event.threadID, event.messageID);
      }

      // CRAFT
      if (sub === "craft") {
        const recipeKey = (args[1] || "").toLowerCase();
        if (!recipeKey || !RECIPES[recipeKey]) return api.sendMessage(`Usage: arcadia craft <recipeKey>. Available: ${Object.keys(RECIPES).join(", ")}`, event.threadID, event.messageID);
        const p = players[userId];
        const kingdom = getPlayerKingdom(base, players, userId);
        if (!kingdom) return api.sendMessage("Join first: 'arcadia join'", event.threadID, event.messageID);
        const recipe = RECIPES[recipeKey];
        const lacks = [];
        for (const [req, qty] of Object.entries(recipe.requires)) {
          if ((p.resources[req] || 0) < qty) lacks.push(`${req} x${qty - (p.resources[req] || 0)}`);
        }
        if (lacks.length) return api.sendMessage(`Missing resources: ${lacks.join(", ")}`, event.threadID, event.messageID);
        // consume resources
        for (const [req, qty] of Object.entries(recipe.requires)) p.resources[req] -= qty;
        // give result to kingdom items
        addItemToKingdom(kingdom, recipe.result.key, 1);
        saveAll(base, players, challenges);
        return api.sendMessage(`🛠️ Crafted ${recipe.result.name}!`, event.threadID, event.messageID);
      }

      // EXPLORE
      if (sub === "explore") {
        const p = players[userId];
        if (p.cooldownUntil && now() < p.cooldownUntil) return api.sendMessage(`You're tired. Cooldown until ${new Date(p.cooldownUntil).toLocaleString()}`, event.threadID, event.messageID);
        // possible events: resource find, enemy encounter, merchant
        const roll = Math.random();
        let resp = [];
        if (roll < 0.45) {
          // resources
          const foundWood = Math.floor(1 + Math.random() * 4);
          const foundMetal = Math.floor(Math.random() * 2);
          p.resources.wood = (p.resources.wood || 0) + foundWood;
          p.resources.metal = (p.resources.metal || 0) + foundMetal;
          resp.push(`🌲 You foraged resources: Wood x${foundWood}${foundMetal ? `, Metal x${foundMetal}` : ""}`);
        } else if (roll < 0.8) {
          // merchant
          const price = 60 + Math.floor(Math.random() * 140);
          if (p.gold >= price) {
            p.gold -= price;
            addItemToKingdom(getPlayerKingdom(base, players, userId), "potion", 1);
            resp.push(`🧑‍🌾 You met a traveling merchant and bought a potion for $${price}.`);
          } else {
            resp.push(`🧑‍🌾 You met a merchant but couldn't afford their wares. They asked $${price}.`);
          }
        } else {
          // encounter enemy -> small battle (pve easy)
          const ai = generateAiKingdom("easy");
          resp.push(`⚠️ You encountered a hostile raiding party! Starting quick skirmish...`);
          // start a quick PVE battle flow (we'll use full conduct battle via onReply flow)
          const kingdom = getPlayerKingdom(base, players, userId);
          const state = {
            battleId: `battle_${Math.floor(Math.random() * 1000000)}`,
            attacker: { kingdom: kingdom, hp: Math.max(calculateDefensePower(kingdom), 80) },
            defender: { kingdom: ai, hp: Math.max(calculateDefensePower(ai), 80) },
            turn: "attacker",
            createdAt: now(),
            round: 0,
            maxRounds: 25
          };
          const sent = await startBattle(api, event.threadID, state, players, base);
          saveAll(base, players, challenges);
          return; // battle will be handled in onReply
        }
        // set cooldown
        p.cooldownUntil = now() + COOLDOWN_MS;
        saveAll(base, players, challenges);
        return api.sendMessage(resp.join("\n"), event.threadID, event.messageID);
      }

      // PVE (full mode)
      if (sub === "pve") {
        const diff = (args[1] || "normal").toLowerCase();
        if (!AI_DIFFICULTY[diff]) return api.sendMessage("Difficulty must be: easy, normal, hard", event.threadID, event.messageID);
        const kingdom = getPlayerKingdom(base, players, userId);
        if (!kingdom) return api.sendMessage("Create a kingdom with 'arcadia join' first.", event.threadID, event.messageID);

        const ai = generateAiKingdom(diff);
        const state = {
          battleId: `battle_${Math.floor(Math.random() * 1000000)}`,
          attacker: { kingdom: kingdom, hp: Math.max(calculateDefensePower(kingdom), 100) },
          defender: { kingdom: ai, hp: Math.max(calculateDefensePower(ai), 80) },
          turn: "attacker",
          createdAt: now(),
          round: 0,
          maxRounds: 30
        };
        await startBattle(api, event.threadID, state, players, base);
        saveAll(base, players, challenges);
        return; // battle interactive handled in onReply
      }

      // PVP opt-in toggle
      if (sub === "pvp") {
        const arg = (args[1] || "").toLowerCase();
        if (!["on", "off"].includes(arg)) return api.sendMessage("Usage: arcadia pvp on|off", event.threadID, event.messageID);
        players[userId].pvpEnabled = arg === "on";
        saveAll(base, players, challenges);
        return api.sendMessage(`PvP opt-in is now ${players[userId].pvpEnabled ? "Enabled. You can be challenged." : "Disabled. You cannot be challenged."}`, event.threadID, event.messageID);
      }

      // CHALLENGE (PvP)
      if (sub === "challenge") {
        const mention = (event.mentions && Object.keys(event.mentions)[0]) || args[1];
        if (!mention) return api.sendMessage("Mention someone to challenge: arcadia challenge @user", event.threadID, event.messageID);
        const defenderId = (event.mentions && Object.keys(event.mentions)[0]) || mention;
        if (defenderId == userId) return api.sendMessage("You can't challenge yourself!", event.threadID, event.messageID);

        ensurePlayer(players, defenderId, (await usersData.get(defenderId)).name || `User_${defenderId}`);
        if (!players[defenderId].pvpEnabled) return api.sendMessage("That player has PvP disabled.", event.threadID, event.messageID);
        const challengerKingdom = getPlayerKingdom(base, players, userId);
        const defenderKingdom = getPlayerKingdom(base, players, defenderId);
        if (!challengerKingdom || !defenderKingdom) return api.sendMessage("Both players must own kingdoms to challenge.", event.threadID, event.messageID);

        const challengeMessage = `⚔️ ${players[userId].name} has challenged ${players[defenderId].name} to a duel!\nReply to this message with 'accept' to accept. (Expires in 5 minutes)`;
        const sent = await new Promise((resolve) => api.sendMessage(challengeMessage, event.threadID, (err, info) => resolve(info)));
        const ch = createChallenge(challenges, userId, defenderId, sent.messageID);
        fs.writeJsonSync(CHALLENGES_FILE, challenges, { spaces: 2 });

        // set reply handler (so defender can accept by reply)
        global.GoatBot.onReply.set(sent.messageID, {
          type: "arcadia_pvp_challenge",
          challengeId: ch.id,
          attacker: userId,
          defender: defenderId,
          messageID: sent.messageID
        });
        return;
      }

      // ACCEPT (by command or reply)
      if (sub === "accept") {
        const inReplyTo = event.messageReply && event.messageReply.messageID;
        let challenge = null;
        if (inReplyTo) {
          challenge = Object.values(challenges).find(c => c.messageID == inReplyTo);
        }
        const cid = args[1] || (challenge && challenge.id);
        if (!cid) return api.sendMessage("Reply to a challenge message with 'accept' or use 'arcadia accept <challengeId>'", event.threadID, event.messageID);
        if (!challenges[cid]) return api.sendMessage("Challenge not found or expired.", event.threadID, event.messageID);
        const ch = challenges[cid];
        if (ch.defender != userId) return api.sendMessage("You're not the defender for this challenge.", event.threadID, event.messageID);

        // create battle
        const challengerKingdom = getPlayerKingdom(base, players, ch.attacker);
        const defenderKingdom = getPlayerKingdom(base, players, ch.defender);
        if (!challengerKingdom || !defenderKingdom) { removeChallenge(challenges, cid); fs.writeJsonSync(CHALLENGES_FILE, challenges, { spaces: 2 }); return api.sendMessage("One of the kingdoms is missing.", event.threadID, event.messageID); }

        // remove challenge
        removeChallenge(challenges, cid);
        fs.writeJsonSync(CHALLENGES_FILE, challenges, { spaces: 2 });

        const state = {
          battleId: `battle_${Math.floor(Math.random() * 1000000)}`,
          attacker: { kingdom: challengerKingdom, hp: Math.max(calculateDefensePower(challengerKingdom), 100) },
          defender: { kingdom: defenderKingdom, hp: Math.max(calculateDefensePower(defenderKingdom), 100) },
          turn: "attacker",
          createdAt: now(),
          round: 0,
          maxRounds: 30
        };
        await startBattle(api, event.threadID, state, players, base);
        saveAll(base, players, challenges);
        return;
      }

      // CANCELCHALLENGE
      if (sub === "cancelchallenge") {
        const cid = args[1];
        if (!cid) return api.sendMessage("Usage: arcadia cancelchallenge <challengeId>", event.threadID, event.messageID);
        if (!challenges[cid]) return api.sendMessage("Challenge not found.", event.threadID, event.messageID);
        const ch = challenges[cid];
        if (ch.attacker !== userId) return api.sendMessage("Only the attacker can cancel their challenge.", event.threadID, event.messageID);
        removeChallenge(challenges, cid);
        fs.writeJsonSync(CHALLENGES_FILE, challenges, { spaces: 2 });
        return api.sendMessage("Challenge cancelled.", event.threadID, event.messageID);
      }

      // DAILY
      if (sub === "daily") {
        const p = players[userId];
        if (now() - p.lastDaily < DAILY_COOLDOWN_MS) {
          const remain = Math.ceil((p.lastDaily + DAILY_COOLDOWN_MS - now()) / (60 * 1000));
          return api.sendMessage(`Daily reward already claimed. Try again in ${remain} minutes.`, event.threadID, event.messageID);
        }
        const gold = 200 + Math.floor(Math.random() * 150);
        p.gold += gold;
        p.lastDaily = now();
        // random small item
        const giftKeys = Object.keys(SHOP);
        const gift = giftKeys[Math.floor(Math.random() * giftKeys.length)];
        const kingdom = getPlayerKingdom(base, players, userId);
        if (kingdom) addItemToKingdom(kingdom, gift, 1);
        saveAll(base, players, challenges);
        return api.sendMessage(`🎁 Daily reward: $${fmt(gold)} and a ${gift}!`, event.threadID, event.messageID);
      }

      // LEADERBOARD
      if (sub === "leaderboard") {
        const list = Object.values(players).map(p => ({ name: p.name, gold: p.gold || 0, wins: (p.stats && p.stats.wins) || 0 }));
        list.sort((a, b) => (b.gold - a.gold));
        const top = list.slice(0, 10);
        const lines = top.map((t, i) => `${i + 1}. ${t.name} — $${fmt(t.gold)} — Wins: ${t.wins}`);
        return api.sendMessage(`🏆 Arcadia Leaderboard:\n${lines.join("\n")}`, event.threadID, event.messageID);
      }

      // BACKUP (admin)
      if (sub === "backup") {
        if (!ADMINS.includes(userId)) return api.sendMessage("You don't have permission.", event.threadID, event.messageID);
        const backup = backupAll();
        return api.sendMessage(`✅ Backup saved at ${new Date(backup.at).toLocaleString()}`, event.threadID, event.messageID);
      }

      // RESTORE (admin)
      if (sub === "restore") {
        if (!ADMINS.includes(userId)) return api.sendMessage("You don't have permission.", event.threadID, event.messageID);
        try {
          const backup = restoreFromBackup();
          return api.sendMessage(`✅ Restore completed from backup at ${new Date(backup.at).toLocaleString()}`, event.threadID, event.messageID);
        } catch (e) {
          return api.sendMessage(`Restore failed: ${e.message}`, event.threadID, event.messageID);
        }
      }

      return api.sendMessage("Unknown subcommand. Use 'arcadia help' to see commands.", event.threadID, event.messageID);
    } catch (err) {
      console.error("Arcadia error:", err);
      return api.sendMessage("An internal error occurred: " + (err.message || err), event.threadID, event.messageID);
    } finally {
      // persist
      saveAll(base, players, challenges);
    }
  },

  // onReply handles PvP accept flow and battle interactions
  onReply: async function ({ api, event, Reply, usersData }) {
    ensureFiles();
    const { base, players, challenges } = loadAll();
    try {
      if (!Reply) return;
      // PVP challenge accept by reply
      if (Reply.type === "arcadia_pvp_challenge") {
        const text = (event.body || "").trim().toLowerCase();
        if (text !== "accept") return api.sendMessage("Reply with 'accept' to accept the challenge.", event.threadID, event.messageID);
        const ch = challenges[Reply.challengeId];
        if (!ch) return api.sendMessage("Challenge expired or not found.", event.threadID, event.messageID);
        if (ch.defender !== event.senderID) return api.sendMessage("Only the defender can accept.", event.threadID, event.messageID);

        // remove
        removeChallenge(challenges, ch.id);
        fs.writeJsonSync(CHALLENGES_FILE, challenges, { spaces: 2 });

        const challengerKingdom = getPlayerKingdom(base, players, ch.attacker);
        const defenderKingdom = getPlayerKingdom(base, players, ch.defender);
        if (!challengerKingdom || !defenderKingdom) return api.sendMessage("One of the kingdoms is missing.", event.threadID, event.messageID);

        const state = {
          battleId: `battle_${Math.floor(Math.random() * 1000000)}`,
          attacker: { kingdom: challengerKingdom, hp: Math.max(calculateDefensePower(challengerKingdom), 100) },
          defender: { kingdom: defenderKingdom, hp: Math.max(calculateDefensePower(defenderKingdom), 100) },
          turn: "attacker",
          createdAt: now(),
          round: 0,
          maxRounds: 30
        };
        await startBattle(api, event.threadID, state, players, base);
        saveAll(base, players, challenges);
        return;
      }

      // Battle flow (we store state in Reply.state)
      if (Reply.commandName === "arcadia_battle" || Reply.commandName === "kingdom_battle" || Reply.type === "battle") {
        const state = Reply.state || Reply.stateRef || (Reply && Reply.stateRef && Reply.stateRef.state) || Reply.state;
        if (!state) {
          return api.sendMessage("Battle state missing. The battle cannot continue.", event.threadID, event.messageID);
        }
        const text = (event.body || "").trim().toLowerCase();

        // determine expected player
        const currentSide = state.turn; // 'attacker' or 'defender'
        const expectedOwner = state[currentSide].kingdom.owner;
        if (event.senderID != expectedOwner && expectedOwner !== "AI") {
          return api.sendMessage("It's not your turn.", event.threadID, event.messageID);
        }

        // AI automated action when it's AI turn
        async function aiAction(sideKey) {
          const choices = ["attack", "defend", "use"];
          const pick = choices[Math.floor(Math.random() * choices.length)];
          if (pick === "attack") {
            const attacker = state[sideKey];
            const defender = sideKey === "attacker" ? state.defender : state.attacker;
            const dmg = computeDamage(attacker.kingdom, defender.kingdom);
            defender.hp -= dmg;
            await api.sendMessage(`🤖 ${attacker.kingdom.name} (AI) attacked and dealt ${dmg} damage!`, event.threadID);
            return;
          } else if (pick === "defend") {
            state[sideKey]._defendBuff = 0.6; // reduce next incoming
            await api.sendMessage(`🤖 ${state[sideKey].kingdom.name} (AI) braces for defense.`, event.threadID);
            return;
          } else {
            // try use healing if AI has potion, else attack
            const items = state[sideKey].kingdom.items || {};
            if (items.potion && items.potion > 0) {
              state[sideKey].hp += SHOP.potion.effect.heal;
              state[sideKey].kingdom.items.potion -= 1;
              await api.sendMessage(`🤖 ${state[sideKey].kingdom.name} used a potion and healed ${SHOP.potion.effect.heal} HP.`, event.threadID);
              return;
            } else {
              const attacker = state[sideKey];
              const defender = sideKey === "attacker" ? state.defender : state.attacker;
              const dmg = computeDamage(attacker.kingdom, defender.kingdom);
              defender.hp -= dmg;
              await api.sendMessage(`🤖 ${attacker.kingdom.name} (AI) attacked and dealt ${dmg} damage!`, event.threadID);
            }
          }
        }

        // perform player action
        if (text === "attack") {
          const attacker = state.turn === "attacker" ? state.attacker : state.defender;
          const defender = state.turn === "attacker" ? state.defender : state.attacker;
          const baseDmg = computeDamage(attacker.kingdom, defender.kingdom, attacker._defendBuff ? 0.9 : 1);
          // apply target defense buff if any
          const targetBuff = defender._defendBuff || 1;
          const dmg = Math.max(3, Math.floor(baseDmg * targetBuff));
          defender.hp -= dmg;
          await api.sendMessage(`🗡️ ${attacker.kingdom.name} attacked and dealt ${dmg} damage!`, event.threadID, event.messageID);

        } else if (text === "defend") {
          const side = state.turn === "attacker" ? state.attacker : state.defender;
          side._defendBuff = 0.6; // reduce next incoming damage
          await api.sendMessage(`🛡️ ${side.kingdom.name} takes a defensive stance. Next incoming damage reduced.`, event.threadID, event.messageID);

        } else if (text.startsWith("use ")) {
          const itemKey = text.split(" ")[1];
          const side = state.turn === "attacker" ? state.attacker : state.defender;
          const kingdom = side.kingdom;
          if (!kingdom.items || !kingdom.items[itemKey] || kingdom.items[itemKey] <= 0) return api.sendMessage("You don't have that item.", event.threadID, event.messageID);
          const item = SHOP[itemKey];
          if (!item) return api.sendMessage("Unknown item.", event.threadID, event.messageID);
          // apply item effects
          if (item.effect && item.effect.heal) {
            side.hp += item.effect.heal;
            kingdom.items[itemKey] -= 1;
            await api.sendMessage(`✨ ${kingdom.name} used ${item.name} and recovered ${item.effect.heal} HP.`, event.threadID, event.messageID);
          } else if (item.attack) {
            const target = state.turn === "attacker" ? state.defender : state.attacker;
            const dmg = item.attack + Math.floor(Math.random() * 10);
            target.hp -= dmg;
            kingdom.items[itemKey] -= 1;
            await api.sendMessage(`💥 ${kingdom.name} used ${item.name} and dealt ${dmg} damage!`, event.threadID, event.messageID);
          } else {
            await api.sendMessage(`Used ${item.name} (no special effect).`, event.threadID, event.messageID);
          }
        } else {
          return api.sendMessage("Unknown action. Reply with 'attack', 'defend', or 'use <itemKey>'.", event.threadID, event.messageID);
        }

        // check for victory
        if (state.attacker.hp <= 0 || state.defender.hp <= 0) {
          const winner = state.attacker.hp > state.defender.hp ? state.attacker.kingdom : state.defender.kingdom;
          const loser = winner === state.attacker.kingdom ? state.defender.kingdom : state.attacker.kingdom;
          const winnerPID = players[winner.owner];
          const loserPID = players[loser.owner];
          // if loser is AI, simpler reward
          const reward = Math.max(50, Math.floor((loser.resources && loser.resources.gold ? loser.resources.gold : 200) * 0.05));
          if (winnerPID) winnerPID.gold = (winnerPID.gold || 0) + reward;
          if (loser.resources) loser.resources.gold = Math.max(0, (loser.resources.gold || 0) - reward);
          if (winnerPID) winnerPID.stats.wins = (winnerPID.stats.wins || 0) + 1;
          if (loserPID) loserPID.stats.losses = (loserPID.stats.losses || 0) + 1;
          // cleanup active battles map
          if (players._activeBattles) {
            delete players._activeBattles[state.battleId];
          }
          saveAll(base, players, challenges);
          return api.sendMessage(`🏁 Battle Over! Winner: ${winner.name}\nReward: $${fmt(reward)}`, event.threadID, event.messageID);
        }

        // next turn
        state.turn = state.turn === "attacker" ? "defender" : "attacker";
        state.round = (state.round || 0) + 1;
        // if next is AI, perform AI action automatically
        const nextSide = state.turn;
        const nextOwner = state[nextSide].kingdom.owner;
        if (nextOwner === "AI") {
          await aiAction(nextSide);
          // check for victory again after AI action
          if (state.attacker.hp <= 0 || state.defender.hp <= 0) {
            const winner = state.attacker.hp > state.defender.hp ? state.attacker.kingdom : state.defender.kingdom;
            const reward = 80;
            // only give reward if real player is winner
            const winnerPID = players[winner.owner];
            if (winnerPID) winnerPID.gold = (winnerPID.gold || 0) + reward;
            if (players._activeBattles) delete players._activeBattles[state.battleId];
            saveAll(base, players, challenges);
            return api.sendMessage(`🏁 Battle Over! Winner: ${winner.name}\nReward: $${fmt(reward)}`, event.threadID, event.messageID);
          }
          // switch back to player turn and ask for action
          state.turn = state.turn === "attacker" ? "defender" : "attacker";
        }

        // persist state in players._activeBattles
        players._activeBattles = players._activeBattles || {};
        players._activeBattles[state.battleId] = state;
        saveAll(base, players, challenges);

        // inform next player
        const nextPrompt = `Round ${state.round} • Next: ${state.turn === "attacker" ? state.attacker.kingdom.name : state.defender.kingdom.name}\nReply with 'attack', 'defend', or 'use <itemKey>'`;
        return api.sendMessage(nextPrompt, event.threadID, event.messageID);
      }
    } catch (err) {
      console.error("Arcadia onReply error:", err);
      return api.sendMessage("An internal error occurred while processing your reply.", event.threadID, event.messageID);
    } finally {
      // persist again
      const { base: b2, players: p2, challenges: c2 } = loadAll();
      saveAll(b2, p2, c2);
    }
  }
};
