// scripts/cmds/mypokemon.js

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// Define the path to the user_pokemon.json file.
// Assuming it's in the root directory of your bot for simplicity.
const USER_POKEMON_FILE = path.join(__dirname, 'user_pokemon.json');

module.exports = {
  config: {
    name: "mypokemon",
    aliases: ["mypkmn", "collection"],
    version: "1.0.0",
    author: "Abdul Kaiyum", // As per your request
    countDown: 5,
    role: 0, // Everyone can use this command
    shortDescription: {
      en: "View your Pokémon collection and details."
    },
    longDescription: {
      en: "Displays a list of your collected Pokémon cards. You can also view detailed stats for a specific Pokémon by name or by replying with its number from the list."
    },
    category: "pokemon",
    guide: {
      en: `Usage:
• {pn}             ➜ See your list of collected Pokémon.
• {pn} <name>      ➜ See details for a specific Pokémon (e.g., {pn} Charizard).`
    }
  },

  // --- Helper Functions for Data Management ---

  async getUserPokemonCollections() {
    try {
      if (!await fs.pathExists(USER_POKEMON_FILE)) {
        await fs.writeFile(USER_POKEMON_FILE, JSON.stringify({}, null, 2), "utf8");
        return {};
      }
      const data = await fs.readFile(USER_POKEMON_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading user_pokemon.json:", error);
      return {};
    }
  },

  async saveUserPokemonCollections(collections) {
    try {
      await fs.writeFile(USER_POKEMON_FILE, JSON.stringify(collections, null, 2), "utf8");
    } catch (error) {
      console.error("Error writing user_pokemon.json:", error);
    }
  },

  async getPokemonDetailsFromAPI(pokemonName) {
    try {
      const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(pokemonName)}`, {
        headers: {
          'X-Api-Key': '4b2b15c7-27f0-4c3e-aa24-8474d551500c' // <<< REPLACE WITH YOUR ACTUAL API KEY
        }
      });
      const card = response.data.data[0]; // Assuming the first result is the most relevant

      if (card) {
        return {
          id: card.id,
          name: card.name,
          type: card.types && card.types.length > 0 ? card.types.join(", ") : "N/A",
          hp: card.hp || "N/A",
          rarity: card.rarity || "N/A",
          set: card.set?.name || "N/A",
          attack: card.attacks && card.attacks.length > 0 ? `${card.attacks[0].name} (${card.attacks[0].damage || '0'})` : "N/A",
          abilities: card.abilities && card.abilities.length > 0 ? card.abilities[0].name : "N/A",
          imageUrl: card.images?.large // Use large image for better detail
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching Pokémon details for ${pokemonName}:`, error.message);
      return null;
    }
  },

  // --- Command Logic ---
  onStart: async function ({ api, event, args, usersData }) {
    const userID = event.senderID;
    const threadID = event.threadID;
    const userName = await usersData.getName(userID);

    const allCollections = await this.getUserPokemonCollections();
    const userPokemon = allCollections[userID] || [];

    if (args.length === 0) {
      // User wants to see their collection list
      if (userPokemon.length === 0) {
        return api.sendMessage(`📂 ${userName}, your Pokémon collection is currently empty. Complete challenges or open packs to get some!`, threadID);
      }

      let msg = `🌟 ${userName}'s Pokémon Collection:\n\n`;
      userPokemon.forEach((pokemon, index) => {
        msg += `${index + 1}. ${pokemon.name} (HP: ${pokemon.hp}, Type: ${pokemon.type})\n`;
      });
      msg += `\nReply with the number of a Pokémon to see its detailed stats, or type "${this.config.name} <name>" to view details directly.`;

      const replyMessage = await api.sendMessage(msg, threadID);

      // Set up onReply to handle selection from the list
      global.GoatBot.onReply.set(replyMessage.messageID, {
        commandName: this.config.name,
        senderID: userID,
        userPokemon: userPokemon, // Store the list of Pokémon for onReply
        type: "list_selection",
        originalMID: replyMessage.messageID
      });

    } else {
      // User wants to see details of a specific Pokémon by name
      const pokemonQuery = args.join(" ").trim();
      
      // First, try to find in user's owned collection
      let targetPokemonName = null;
      const foundInCollection = userPokemon.find(p => p.name.toLowerCase() === pokemonQuery.toLowerCase());
      if (foundInCollection) {
          targetPokemonName = foundInCollection.name;
      } else {
          // If not found in collection, maybe they just typed a name they want to see details for
          // (even if they don't own it) - depends on game design.
          // For now, let's assume they must own it to see details via this command.
          return api.sendMessage(`❌ ${userName}, you don't seem to own a Pokémon named "${pokemonQuery}".`, threadID);
      }

      api.sendMessage(`🔍 Fetching details for ${targetPokemonName}...`, threadID);
      const details = await this.getPokemonDetailsFromAPI(targetPokemonName);

      if (details) {
        let detailMsg = `✨ ${details.name} - Detailed Stats ✨\n\n`;
        detailMsg += `📊 HP: ${details.hp}\n`;
        detailMsg += `💧 Type: ${details.type}\n`;
        detailMsg += `⚔️ Attack: ${details.attack}\n`;
        if (details.abilities && details.abilities !== "N/A") {
          detailMsg += `💡 Ability: ${details.abilities}\n`;
        }
        detailMsg += `🌟 Rarity: ${details.rarity}\n`;
        detailMsg += `📦 Set: ${details.set}\n`;
        detailMsg += `🆔 Card ID: ${details.id}\n`;
        
        let attachment = null;
        if (details.imageUrl) {
            try {
                // Ensure global.utils.getStreamFromURL exists and is functional
                if (global.utils && typeof global.utils.getStreamFromURL === 'function') {
                    attachment = await global.utils.getStreamFromURL(details.imageUrl);
                } else {
                    console.warn("global.utils.getStreamFromURL is not defined. Cannot attach image.");
                }
            } catch (error) {
                console.error("Failed to get image stream for " + details.name + ":", error);
            }
        }
        
        if (attachment) {
            return api.sendMessage({ body: detailMsg, attachment: attachment }, threadID);
        } else {
            return api.sendMessage(detailMsg, threadID);
        }

      } else {
        return api.sendMessage(`❌ Could not retrieve detailed information for "${pokemonQuery}". Please check the name or try again later.`, threadID);
      }
    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    if (Reply.type === "list_selection") {
      const userID = event.senderID;
      const threadID = event.threadID;
      const userName = await usersData.getName(userID);
      const chosenIndex = parseInt(event.body.trim()) - 1;

      if (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex >= Reply.userPokemon.length) {
        return api.sendMessage("⚠️ Invalid number. Please reply with a number from the list.", threadID);
      }

      const chosenPokemon = Reply.userPokemon[chosenIndex];
      await api.unsendMessage(Reply.originalMID); // Clear the previous list message to avoid clutter

      api.sendMessage(`🔍 Fetching details for ${chosenPokemon.name}...`, threadID);
      const details = await this.getPokemonDetailsFromAPI(chosenPokemon.name);

      if (details) {
        let detailMsg = `✨ ${details.name} - Detailed Stats ✨\n\n`;
        detailMsg += `📊 HP: ${details.hp}\n`;
        detailMsg += `💧 Type: ${details.type}\n`;
        detailMsg += `⚔️ Attack: ${details.attack}\n`;
        if (details.abilities && details.abilities !== "N/A") {
          detailMsg += `💡 Ability: ${details.abilities}\n`;
        }
        detailMsg += `🌟 Rarity: ${details.rarity}\n`;
        detailMsg += `📦 Set: ${details.set}\n`;
        detailMsg += `🆔 Card ID: ${details.id}\n`;
        
        let attachment = null;
        if (details.imageUrl) {
            try {
                if (global.utils && typeof global.utils.getStreamFromURL === 'function') {
                    attachment = await global.utils.getStreamFromURL(details.imageUrl);
                } else {
                    console.warn("global.utils.getStreamFromURL is not defined in onReply. Cannot attach image.");
                }
            } catch (error) {
                console.error("Failed to get image stream for " + details.name + " in onReply:", error);
            }
        }
        
        if (attachment) {
            return api.sendMessage({ body: detailMsg, attachment: attachment }, threadID);
        } else {
            return api.sendMessage(detailMsg, threadID);
        }
      } else {
        return api.sendMessage(`❌ Could not retrieve detailed information for "${chosenPokemon.name}".`, threadID);
      }
    }
  }
};
