/**
 * core.js
 * Routes commands, validates players, and delegates to modules
 */

const DB = require("./storage");
const COMBAT = require("./combat");
const ECON = require("./economy");
const QUESTS = require("./quests");
const PETS = require("./pets");
const TRADE = require("./trade");
const U = require("./utils");

const ADMIN_UIDS = []; // add your UID if needed

async function handleCommand({ api, event, args }) {
  const cmd = (args[0] || "").toLowerCase();
  const uid = event.senderID;

  const players = DB.loadPlayers();

  // HELP
  if (!cmd || cmd === "help") {
    return api.sendMessage(U.helpText(), event.threadID);
  }

  // JOIN (Interactive)
  if (cmd === "join") {
    if (players[uid]) {
      return api.sendMessage(
        "You already joined Arcadia!",
        event.threadID,
        event.messageID
      );
    }

    players[uid] = DB.createPlayer(uid);
    DB.savePlayers(players);

    return api.sendMessage(
      "🧝 Welcome, adventurer!\nWhat will be your **character name**?\n\nReply with your chosen name.",
      event.threadID,
      (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "arcadia",
          type: "setname",
          uid: uid
        });
      }
    );
  }

  // Ensure player exists for all other commands
  if (!players[uid]) {
    return api.sendMessage(
      "You haven't joined Arcadia yet.\nUse: `arcadia join`",
      event.threadID
    );
  }

  const player = players[uid];

  // PROFILE
  if (cmd === "profile") {
    return api.sendMessage(U.profileText(player), event.threadID);
  }

  // SHOP
  if (cmd === "shop") {
    return api.sendMessage(ECON.shopText(), event.threadID);
  }

  // BUY
  if (cmd === "buy") {
    const item = (args[1] || "").toLowerCase();
    const r = ECON.buy(item, uid);
    return api.sendMessage(r.message, event.threadID);
  }

  // INVENTORY
  if (cmd === "inventory") {
    return api.sendMessage(U.inventoryText(player), event.threadID);
  }

  // CRAFT
  if (cmd === "craft") {
    const item = (args[1] || "").toLowerCase();
    const r = ECON.craft(uid, item);
    return api.sendMessage(r.message, event.threadID);
  }

  // EXPLORE
  if (cmd === "explore") {
    const res = COMBAT.explore(uid);
    return api.sendMessage(res.message, event.threadID);
  }

  // PVE
  if (cmd === "pve") {
    const mode = (args[1] || "normal").toLowerCase();
    const r = await COMBAT.pve(uid, mode);
    return api.sendMessage(r.message, event.threadID);
  }

  // PVP
  if (cmd === "pvp") {
    const action = (args[1] || "").toLowerCase();

    if (action === "on") {
      player.pvp = true;
      DB.savePlayers(players);
      return api.sendMessage("PvP is now ON.", event.threadID);
    }

    if (action === "off") {
      player.pvp = false;
      DB.savePlayers(players);
      return api.sendMessage("PvP is now OFF.", event.threadID);
    }

    if (action === "challenge") {
      if (!event.mentions || !Object.keys(event.mentions).length) {
        return api.sendMessage("Tag someone to challenge.", event.threadID);
      }
      const target = Object.keys(event.mentions)[0];
      const r = COMBAT.initiatePvP(uid, target, event.messageID);

      return api.sendMessage(r.message, event.threadID, event.messageID);
    }

    return api.sendMessage(
      "Usage: arcadia pvp on/off/challenge @user",
      event.threadID
    );
  }

  // PET SYSTEM
  if (cmd === "pet") {
    const sub = (args[1] || "").toLowerCase();

    if (sub === "adopt") {
      const kind = (args[2] || "wolf").toLowerCase();
      const r = PETS.adopt(uid, kind);
      return api.sendMessage(r.message, event.threadID);
    }

    if (sub === "info") return api.sendMessage(PETS.info(uid).message, event.threadID);

    if (sub === "feed") {
      const r = PETS.feed(uid);
      return api.sendMessage(r.message, event.threadID);
    }

    return api.sendMessage(
      "Pet commands: adopt <type>, info, feed",
      event.threadID
    );
  }

  // QUESTS
  if (cmd === "quest") {
    const sub = (args[1] || "").toLowerCase();

    if (!sub || sub === "list")
      return api.sendMessage(QUESTS.list(uid), event.threadID);

    if (sub === "accept") {
      const qid = args[2];
      const r = QUESTS.accept(uid, qid);
      return api.sendMessage(r.message, event.threadID);
    }

    if (sub === "turnin") {
      const qid = args[2];
      const r = QUESTS.turnIn(uid, qid);
      return api.sendMessage(r.message, event.threadID);
    }
  }

  // TRADE SYSTEM
  if (cmd === "trade") {
    const sub = (args[1] || "").toLowerCase();

    if (sub === "offer") {
      if (!event.mentions || !Object.keys(event.mentions).length)
        return api.sendMessage("Tag trade partner.", event.threadID);

      const partner = Object.keys(event.mentions)[0];
      const item = args[2];
      const price = parseInt(args[3]) || null;

      const r = TRADE.createOffer(uid, partner, item, price, event.messageID);

      return api.sendMessage(r.message, event.threadID, event.messageID);
    }

    return api.sendMessage(
      "Trade usage: arcadia trade offer @user <item> [price]",
      event.threadID
    );
  }

  // DAILY REWARD
  if (cmd === "daily") {
    const r = ECON.claimDaily(uid);
    return api.sendMessage(r.message, event.threadID);
  }

  // LEADERBOARD
  if (cmd === "leaderboard") {
    return api.sendMessage(U.leaderboardText(), event.threadID);
  }

  // ADMIN COMMANDS
  if (cmd === "backup") {
    if (!ADMIN_UIDS.includes(uid))
      return api.sendMessage("Admin only.", event.threadID);

    DB.backup();
    return api.sendMessage("Backup saved.", event.threadID);
  }

  if (cmd === "restore") {
    if (!ADMIN_UIDS.includes(uid))
      return api.sendMessage("Admin only.", event.threadID);

    DB.restore();
    return api.sendMessage("Backup restored.", event.threadID);
  }

  return api.sendMessage("Unknown command. Use: arcadia help", event.threadID);
}

async function handleReply({ api, event, Reply }) {
  const players = DB.loadPlayers();

  // SET NAME
  if (Reply.type === "setname") {
    const p = players[Reply.uid];

    const name = event.body.trim().slice(0, 32);
    p.name = name;
    DB.savePlayers(players);

    return api.sendMessage(
      `🏰 Great! Your character name is now **${name}**.\n\nNow tell me, what will your **kingdom name** be?`,
      event.threadID,
      (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "arcadia",
          type: "setkingdom",
          uid: Reply.uid
        });
      }
    );
  }

  // SET KINGDOM
  if (Reply.type === "setkingdom") {
    const p = players[Reply.uid];

    const kingdom = event.body.trim().slice(0, 32);
    p.kingdom = kingdom;
    DB.savePlayers(players);

    return api.sendMessage(
      `👑 Welcome, **${p.name}** of the Kingdom **${p.kingdom}**!\nYour Arcadia journey begins now.\n\nUse: arcadia profile`,
      event.threadID
    );
  }

  // PVP ACCEPT
  const pvpSessions = COMBAT.loadPvp();
  if (pvpSessions[Reply.messageID]) {
    const session = pvpSessions[Reply.messageID];

    if (event.senderID !== session.target) return;

    if ((Date.now() - session.time) > 5 * 60 * 1000) {
      delete pvpSessions[Reply.messageID];
      COMBAT.savePvp(pvpSessions);
      return api.sendMessage("PvP request expired.", event.threadID);
    }

    if (event.body.toLowerCase().includes("accept")) {
      const res = await COMBAT.resolvePvP(session.challenger, session.target);
      delete pvpSessions[Reply.messageID];
      COMBAT.savePvp(pvpSessions);
      return api.sendMessage(res.message, event.threadID);
    }
  }

  // TRADE ACCEPT
  const trades = TRADE.loadTrades();
  if (trades[Reply.messageID]) {
    const t = trades[Reply.messageID];

    if (event.senderID !== t.to) return;

    if ((Date.now() - t.time) > 10 * 60 * 1000) {
      delete trades[Reply.messageID];
      TRADE.saveTrades(trades);
      return api.sendMessage("Trade expired.", event.threadID);
    }

    if (event.body.toLowerCase().includes("accept")) {
      const r = TRADE.accept(t.id, event.senderID);
      delete trades[Reply.messageID];
      TRADE.saveTrades(trades);
      return api.sendMessage(r.message, event.threadID);
    }
  }
}

module.exports = { handleCommand, handleReply };
