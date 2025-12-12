/**
 * utils.js
 * Small helpers, leveling and formatted text
 */
const DB = require('./storage');

function xpToLevel(level) {
  // quadratic curve
  return 50 * level + (level-1)*30;
}

function tryLevelUp(player) {
  while (player.xp >= xpToLevel(player.level)) {
    player.xp -= xpToLevel(player.level);
    player.level++;
    // improve stats on level
    player.maxhp += 12;
    player.hp = player.maxhp;
    player.atk += 2;
    player.def += 1;
  }
}

function profileText(p) {
  return `━━━━━━━━━━━━━━━
👑 ARCARDIA PROFILE
━━━━━━━━━━━━━━━
🏰 Kingdom:  ${p.kingdom || "Arcadia"}
🧝 Character: ${p.name || "Unnamed Hero"}

⭐ Level: ${p.level}   (${p.xp}/${xpToLevel(p.level)} XP)

❤️ HP:    ${p.hp}/${p.maxhp}
⚔️ ATK:   ${p.atk}
🛡 DEF:   ${p.def}

💰 Gold: ${p.gold}

🎒 Inventory (${p.weight}/${p.carryLimit} wt):
${p.inventory.length ? "• " + p.inventory.join("\n• ") : "empty"}

🐾 Pet: ${p.pet ? p.pet.name : "None"}
━━━━━━━━━━━━━━━`;
}


function inventoryText(p) {
  return `🎒 Inventory (${p.weight}/${p.carryLimit} wt):\n${p.inventory.length ? p.inventory.map((i,idx)=>`${idx+1}. ${i}`).join('\n') : 'Empty'}`;
}

function helpText() {
  return `🏰 Arcadia Help
Commands:
• arcadia join
• arcadia profile
• arcadia shop
• arcadia buy <item>
• arcadia inventory
• arcadia craft <item>
• arcadia explore
• arcadia pve [normal|boss]
• arcadia pvp on/off/challenge @user
• arcadia pet adopt/info/feed
• arcadia quest list | accept <id> | turnin <id>
• arcadia trade offer @user <item> [price]
• arcadia daily
• arcadia leaderboard
Admin: arcadia backup | arcadia restore
`;
}

function leaderboardText() {
  const players = DB.loadPlayers();
  const arr = Object.entries(players).map(([id,p])=>({id, gold:p.gold, level:p.level})).sort((a,b)=>b.gold-a.gold).slice(0,10);
  let t = "🏆 Leaderboard (Top Gold)\n";
  arr.forEach((u,i)=> t += `${i+1}. <@${u.id}> — ${u.gold} gold (Lv ${u.level})\n`);
  return t;
}

module.exports = { xpToLevel, tryLevelUp, profileText, inventoryText, helpText, leaderboardText };
