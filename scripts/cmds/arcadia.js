/**
 * arcadia.js
 * Entry point to the Arcadia game (Goat-Bot-V2 command wrapper)
 */
const path = require('path');
const CORE = require('./arcadia/core');

module.exports = {
  config: {
    name: "arcadia",
    version: "2.0",
    author: "Abdul Kaiyum",
    countDown: 1,
    role: 0,
    shortDescription: "Arcadia — full text RPG",
    longDescription: "Kingdom game: explore, fight, quests, pets, trade, bosses, PvP, economy.",
    category: "game"
  },

  onStart: async function ({ api, event, args }) {
    try {
      await CORE.handleCommand({ api, event, args });
    } catch (e) {
      console.error(e);
      api.sendMessage("⚠️ Arcadia error — check bot logs.", event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    try {
      await CORE.handleReply({ api, event, Reply });
    } catch (e) {
      console.error(e);
      api.sendMessage("⚠️ Arcadia (reply) error — check bot logs.", event.threadID);
    }
  }
};
