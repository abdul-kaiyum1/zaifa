/**
 * quests.js
 * Simple quest system with accept/turnin flow
 */
const DB = require('./storage');
const U = require('./utils');

const QUESTS = {
  q1: { id:'q1', title: 'Goblin Menace', desc: 'Defeat 2 goblins (use explore/pve). Reward: 80 gold, 50 XP', req: { killGoblin:2 }, reward: { gold:80, xp:50 } },
  q2: { id:'q2', title: 'Gather Wood', desc: 'Collect 5 wood items. Reward: 40 gold, potion', req: { item: { wood:5 } }, reward: { gold:40, item:'potion' } }
};

function list(uid) {
  let out = "📜 Available Quests:\n";
  for (const q in QUESTS) {
    out += `• ${QUESTS[q].id} — ${QUESTS[q].title}\n  ${QUESTS[q].desc}\n`;
  }
  out += "Use `arcadia quest accept <id>` to accept.";
  return out;
}

function accept(uid, qid) {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { message: "Not found." };
  if (!QUESTS[qid]) return { message: "Quest not found." };
  if (p.quests.find(q=>q.id===qid)) return { message: "Already accepted." };
  p.quests.push({ id: qid, progress: {} });
  DB.savePlayers(players);
  return { message: `Accepted quest ${qid}: ${QUESTS[qid].title}` };
}

// turn in checks success conditions
function turnIn(uid, qid) {
  const players = DB.loadPlayers();
  const p = players[uid];
  if (!p) return { message: "Not found." };
  const aq = p.quests.find(q=>q.id===qid);
  if (!aq) return { message: "You haven't accepted this quest." };
  const quest = QUESTS[qid];
  // check simple item requirement
  if (quest.req && quest.req.item) {
    const needed = quest.req.item;
    // check inventory counts
    for (let it in needed) {
      const count = p.inventory.filter(x=>x===it).length;
      if (count < needed[it]) return { message: `You need ${needed[it]}x ${it}.` };
    }
    // remove materials
    for (let it in needed) {
      let toRemove = needed[it];
      for (let i=p.inventory.length-1;i>=0&&toRemove>0;i--) {
        if (p.inventory[i] === it) { p.inventory.splice(i,1); p.weight -= 1; toRemove--; }
      }
    }
  }

  // kill-based checks currently require external tracking (not implemented), so we'll allow turn-in if no req or item req satisfied.
  // Reward
  if (quest.reward.gold) p.gold += quest.reward.gold;
  if (quest.reward.xp) p.xp += quest.reward.xp;
  if (quest.reward.item) p.inventory.push(quest.reward.item);
  // remove quest
  p.quests = p.quests.filter(q=>q.id!==qid);
  // level check
  U.tryLevelUp(p);
  DB.savePlayers(players);
  return { message: `Quest ${quest.title} turned in. Rewards delivered.` };
}

module.exports = { list, accept, turnIn };
