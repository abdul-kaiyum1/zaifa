/**
 * combat.js
 * Multi-stage PvE, PvP, bosses, drops
 */
const DB = require('./storage');
const U = require('./utils');
const ECON = require('./economy');

function rand(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

const pvpSessions = DB.loadPvp();

function savePvp(obj){ DB.savePvp(obj); }
function loadPvp(){ return DB.loadPvp(); }

function calcDamage(att, def) {
  const variance = rand(-2, 3);
  const raw = att - def + variance;
  return Math.max(1, raw);
}

// Explore: light random events with multi-stage chance
function explore(uid) {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { message: "Player not found." };

  const roll = rand(1, 100);
  let message = "";
  if (roll <= 30) { // loot chest
    const gold = rand(10, 80);
    p.gold += gold;
    // rare drop
    if (rand(1,100) <= 12) {
      const item = ECON.randomDrop();
      p.inventory.push(item);
      message = `🌟 You looted a chest with **${gold} gold** and found **${item}**!`;
    } else {
      message = `🪙 You found **${gold} gold** on your journey.`;
    }
  } else if (roll <= 65) { // encounter small monster => multi-stage fight
    const mob = generateMob('goblin', p.level);
    const res = multiStageFight(p, mob);
    message = res;
  } else if (roll <= 85) { // trap
    const dmg = rand(5, 25);
    p.hp = Math.max(0, p.hp - dmg);
    message = `⚠️ You were caught in a trap and lost **${dmg} HP**.`;
  } else { // peaceful find
    message = "🍃 The forest was peaceful... you rest and recover a little.";
    const heal = Math.min(p.maxhp - p.hp, rand(3, 12));
    p.hp += heal;
    if (heal > 0) message += ` (+${heal} HP)`;
  }

  DB.savePlayers(players);
  return { message };
}

// Create a mob baseline
function generateMob(type, level) {
  // simplified; scale by level
  if (type === 'goblin') {
    return { name: 'Goblin', hp: 20 + level*5, atk: 3 + level, def: 1 + Math.floor(level/2), lootChance: 40 };
  }
  if (type === 'wolf') {
    return { name: 'Wild Wolf', hp: 25 + level*6, atk: 5 + level, def: 2 + Math.floor(level/3), lootChance: 45 };
  }
  // boss fallback
  return { name: 'Brute', hp: 40 + level*10, atk: 7 + level*2, def: 3 + level, lootChance: 60 };
}

// Multi-stage fight: player vs mob with possible drop and XP/gold rewards
function multiStageFight(player, mob) {
  let log = `⚔️ Encounter: **${mob.name}** (HP ${mob.hp})\n`;
  let pHP = player.hp;
  let mHP = mob.hp;
  let stage = 1;
  while (pHP > 0 && mHP > 0 && stage <= 6) { // limit stages
    const pDmg = calcDamage(Math.floor(player.atk + player.level/2), mob.def);
    mHP -= pDmg;
    log += `• You strike for ${pDmg} → ${Math.max(mHP,0)} HP\n`;
    if (mHP <= 0) break;
    const mDmg = calcDamage(mob.atk, player.def);
    pHP -= mDmg;
    log += `• ${mob.name} hits for ${mDmg} → You ${Math.max(pHP,0)} HP\n`;
    stage++;
  }

  // result
  if (pHP > 0) {
    // rewards
    const xp = rand(8, 18);
    const gold = rand(5, 35);
    player.xp += xp;
    player.gold += gold;
    // chance drop
    let dropText = '';
    if (rand(1,100) <= mob.lootChance) {
      const item = ECON.randomDrop();
      player.inventory.push(item);
      dropText = ` Found **${item}**.`;
    }
    // small heal after fight
    player.hp = Math.min(player.maxhp, pHP + Math.floor(player.maxhp*0.1));
    // level up if XP threshold
    U.tryLevelUp(player);
    DB.savePlayers(DB.loadPlayers());
    return `🏅 Victory! You defeated **${mob.name}**.\nXP +${xp} · Gold +${gold}.${dropText}`;
  } else {
    // player lost; partial penalty
    player.hp = Math.max(1, Math.floor(player.maxhp*0.15));
    const lostGold = Math.min(player.gold, rand(5, 25));
    player.gold -= lostGold;
    DB.savePlayers(DB.loadPlayers());
    return `💀 You were defeated by **${mob.name}**. You wake with ${player.hp} HP. Lost ${lostGold} gold.`;
  }
}

// PvE command
async function pve(uid, mode='normal') {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { message: "Not registered." };

  if (mode === 'boss') {
    // small boss fight — could be solo raid attempt
    const boss = { name: 'Stone Goliath', hp: 120 + p.level*30, atk: 15 + p.level*3, def: 6 + p.level };
    // multi-stage boss -> use progressive stages
    let log = `🛡 Boss Battle: **${boss.name}**\n`;
    let pHP = p.hp, bHP = boss.hp;
    let round = 0;
    while (pHP > 0 && bHP > 0 && round < 20) {
      round++;
      const pDmg = calcDamage(Math.floor(p.atk + p.level/2 + (p.pets ? p.pets.atkBoost||0 : 0)), boss.def);
      bHP -= pDmg;
      log += `• You hit for ${pDmg} → Boss ${Math.max(bHP,0)}\n`;
      if (bHP <= 0) break;
      // boss multi-attack sometimes
      const hits = (Math.random() < 0.25) ? 2 : 1;
      for (let i=0;i<hits;i++) {
        const bDmg = calcDamage(boss.atk, p.def);
        pHP -= bDmg;
        log += `• Boss hits for ${bDmg} → You ${Math.max(pHP,0)}\n`;
        if (pHP <= 0) break;
      }
    }
    if (pHP > 0) {
      const rewardGold = 200 + rand(0, 120);
      const rewardXp = 150 + rand(0, 80);
      p.gold += rewardGold;
      p.xp += rewardXp;
      // drop chance
      if (rand(1,100) <= 50) { const item = ECON.randomDrop(true); p.inventory.push(item); log += `\nLoot: ${item}`; }
      p.hp = Math.min(p.maxhp, Math.floor(pHP + p.maxhp*0.1));
      U.tryLevelUp(p);
      DB.savePlayers(players);
      return { message: `🏆 Boss defeated!\nGold +${rewardGold}\nXP +${rewardXp}\n${log}` };
    } else {
      p.hp = Math.max(1, Math.floor(p.maxhp*0.2));
      p.gold = Math.max(0, p.gold - 80);
      DB.savePlayers(players);
      return { message: `💥 You fell in the boss fight. Wounded and retreating. ${log}` };
    }
  }

  // normal pve -> generate mob based on level
  const mobType = (Math.random() < 0.5) ? 'goblin' : 'wolf';
  const mob = generateMob(mobType, p.level);
  const res = multiStageFight(p, mob);
  DB.savePlayers(DB.loadPlayers());
  return { message: res };
}

// PvP initiation/resolution
function initiatePvP(challenger, target, messageID) {
  const players = DB.loadPlayers();
  const c = players[challenger], t = players[target];
  if (!c || !t) return { message: "Both players must be in Arcadia." };
  if (!t.pvp) return { message: "Target has PvP turned off." };
  const payload = { challenger, target, time: Date.now() };
  const pvp = loadPvp();
  pvp[messageID] = payload;
  savePvp(pvp);
  return { message: `⚔️ <@${challenger}> challenged <@${target}>! Reply "accept" to this message to fight (5 min).` };
}

async function resolvePvP(aid, bid) {
  const players = DB.loadPlayers();
  const A = players[aid], B = players[bid];
  if (!A || !B) return { message: "Player missing." };
  // simple exchange until death
  let aHP = A.hp, bHP = B.hp;
  let log = "⚔️ PvP Battle:\n";
  while (aHP > 0 && bHP > 0 && aHP < 1000 && bHP < 1000) {
    const dmgA = calcDamage(Math.floor(A.atk + A.level/2), B.def);
    bHP -= dmgA;
    log += `• <@${aid}> hits ${dmgA} → <@${bid}> ${Math.max(bHP,0)}\n`;
    if (bHP <= 0) break;
    const dmgB = calcDamage(Math.floor(B.atk + B.level/2), A.def);
    aHP -= dmgB;
    log += `• <@${bid}> hits ${dmgB} → <@${aid}> ${Math.max(aHP,0)}\n`;
  }

  let winner = aHP > 0 ? aid : bid;
  let loser = winner === aid ? bid : aid;

  const playersAfter = DB.loadPlayers();
  playersAfter[winner].gold += 50;
  playersAfter[loser].gold = Math.max(0, playersAfter[loser].gold - 30);
  playersAfter[winner].xp += 60;
  playersAfter[loser].xp += 10;
  // update hp
  playersAfter[aid].hp = Math.max(1, Math.floor(aHP));
  playersAfter[bid].hp = Math.max(1, Math.floor(bHP));

  U.tryLevelUp(playersAfter[winner]);
  DB.savePlayers(playersAfter);

  log += `\n🏆 Winner: <@${winner}> (+50 gold, +60 XP)\n`;
  return { message: log };
}

module.exports = {
  explore, pve, initiatePvP, resolvePvP,
  loadPvp, savePvp
};
