// scripts/cmds/mypokemon.js
// Author: Abdul Kaiyum

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { MongoClient } = require('mongodb');

// --- MongoDB Setup ---
const mongoURI = "mongodb+srv://abdulkaiyum:abdulkaiyum5426@octa.elx1m1f.mongodb.net/GoatBotV2?retryWrites=true&w=majority&appName=octa";
const dbName = 'GoatBotV2';
let db;

MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('MyPokemon Command: Connected to MongoDB successfully!');
    db.collection('pokemon_user_collections').createIndex({ userID: 1 }, { background: true }).catch(err => console.error("MyPokemon: Error creating index for pokemon_user_collections:", err));
  })
  .catch(error => console.error('MyPokemon Command: Error connecting to MongoDB:', error));

// --- Constants ---
const POKEMON_TCG_API_KEY = 'YOUR_POKEMON_TCG_API_KEY'; // <<<< REPLACE THIS WITH YOUR ACTUAL KEY
const CACHE_FOLDER_PATH = path.join(__dirname, 'cache');
fs.ensureDirSync(CACHE_FOLDER_PATH);

// --- MongoDB Data Access Functions ---
async function getUserPokemonCollectionList(userID) {
    if (!db) { console.error("DB not connected in getUserPokemonCollectionList (MyPokemon)"); return []; }
    const collection = db.collection('pokemon_user_collections');
    const userPokemonsDoc = await collection.findOne({ userID: userID });
    return userPokemonsDoc ? userPokemonsDoc.pokemons || [] : [];
}

module.exports = {
  config: {
    name: "mypokemon",
    aliases: ["mypkmn", "collection"],
    version: "1.1.2", // Version for corrected prefix handling
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "View your Pokémon collection and details from the database."
    },
    longDescription: {
      en: "Displays a list of your collected Pokémon cards from the database. You can also view detailed stats for a specific Pokémon by name or by replying with its number from the list."
    },
    category: "pokemon",
    guide: {
      en: `Usage:
• {pn}             ➜ See your list of collected Pokémon.
• {pn} <name>      ➜ See details for a specific Pokémon (e.g., {pn} Charizard).`
    }
  },

  async getPokemonDetailsFromAPI(pokemonName) {
    try {
      const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(pokemonName)}"`, { // Added quotes for exact name match
        headers: { 'X-Api-Key': POKEMON_TCG_API_KEY }
      });
      const card = response.data.data.find(c => c.name.toLowerCase() === pokemonName.toLowerCase()) || response.data.data[0];
      if (card) {
        return {
          id: card.id, name: card.name,
          type: card.types && card.types.length > 0 ? card.types.join(", ") : "N/A",
          hp: card.hp || "N/A", rarity: card.rarity || "N/A", set: card.set?.name || "N/A",
          attack: card.attacks && card.attacks.length > 0 ? `${card.attacks[0].name} (${String(card.attacks[0].damage).replace(/\D/g,'') || '0'})` : "N/A",
          abilities: card.abilities && card.abilities.length > 0 ? card.abilities.map(a => `${a.name}: ${a.text}`).join('\n') : "N/A",
          imageUrl: card.images?.large
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching Pokémon details for ${pokemonName} from TCG API:`, error.message);
      return null;
    }
  },

  onStart: async function ({ api, event, args, usersData }) {
    if (!db) return api.sendMessage("Database is not connected. Please try again in a moment or contact an admin.", event.threadID);

    const userID = event.senderID;
    const threadID = event.threadID;
    const userName = await usersData.getName(userID);

    const userOwnedPokemons = await getUserPokemonCollectionList(userID);

    if (args.length === 0) {
      if (userOwnedPokemons.length === 0) {
        return api.sendMessage(`📂 ${userName}, your Pokémon collection is currently empty. Get Pokémon from challenges!`, threadID);
      }

      let msg = `🌟 ${userName}'s Pokémon Collection (${userOwnedPokemons.length} total):\n\n`;
      userOwnedPokemons.forEach((pokemon, index) => {
        msg += `${index + 1}. ${pokemon.name} (HP: ${pokemon.hp || 'N/A'}, Type: ${pokemon.type || 'N/A'}, Atk: ${pokemon.attack || '0'})\n`;
      });

      // CORRECTED PREFIX HANDLING: Use the method from your usage.js example
      let prefix = "!"; // Default prefix if others fail
      try {
        if (global.utils && typeof global.utils.getPrefix === 'function') {
            const threadPrefix = await global.utils.getPrefix(threadID);
            if (threadPrefix) prefix = threadPrefix;
        } else if (api && api.PREFIX) { // Fallback if global.utils.getPrefix is not available
            prefix = api.PREFIX;
        } else if (global.config && global.config.PREFIX) { // Further fallback
            prefix = global.config.PREFIX;
        }
      } catch (e) {
        console.warn("MyPokemon: Could not dynamically get prefix, using default '!'", e.message);
      }
      
      msg += `\nReply with the number of a Pokémon to see its detailed card stats, or type "${prefix}${this.config.name} <name>" to view details directly.`;
      
      api.sendMessage(msg, threadID, (err, msgInfo) => {
        if (err) return console.error("MyPokemon list send error:", err);
        global.GoatBot.onReply.set(msgInfo.messageID, {
          commandName: this.config.name,
          senderID: userID,
          userPokemonList: userOwnedPokemons,
          type: "list_selection",
          originalMID: msgInfo.messageID
        });
      });

    } else {
      const pokemonQuery = args.join(" ").trim();
      const ownedPokemonInstance = userOwnedPokemons.find(p => p.name.toLowerCase() === pokemonQuery.toLowerCase());

      if (!ownedPokemonInstance) {
          // Corrected {pn} usage in the message
          let prefix = "!"; try { if (global.utils && typeof global.utils.getPrefix === 'function') { const tp = await global.utils.getPrefix(threadID); if (tp) prefix = tp; } } catch(e){}
          return api.sendMessage(`❌ ${userName}, you don't seem to own a Pokémon named "${pokemonQuery}". Check your collection first with just "${prefix}${this.config.name}".`, threadID);
      }
      
      const targetPokemonName = ownedPokemonInstance.name;
      api.sendMessage(`🔍 Fetching detailed card info for ${targetPokemonName}...`, threadID);
      const details = await this.getPokemonDetailsFromAPI(targetPokemonName);

      if (details) {
        let detailMsg = `✨ ${details.name} - Card Details ✨\n\n`;
        detailMsg += `📊 HP: ${details.hp}\n`;
        detailMsg += `💧 Type(s): ${details.type}\n`;
        if (details.attack && details.attack !== "N/A") detailMsg += `⚔️ Primary Attack: ${details.attack}\n`;
        if (details.abilities && details.abilities !== "N/A") detailMsg += `💡 Abilities:\n${details.abilities}\n`;
        detailMsg += `🌟 Rarity: ${details.rarity}\n`;
        detailMsg += `📦 Set: ${details.set}\n`;
        
        let attachment = null;
        if (details.imageUrl) {
            try {
                if (global.utils && typeof global.utils.getStreamFromURL === 'function') {
                    attachment = await global.utils.getStreamFromURL(details.imageUrl);
                } else { console.warn("global.utils.getStreamFromURL not defined."); }
            } catch (error) { console.error("Failed to get image stream for " + details.name + ":", error); }
        }
        api.sendMessage({ body: detailMsg, attachment: attachment }, threadID);
      } else {
        return api.sendMessage(`❌ Could not retrieve detailed card information for "${targetPokemonName}" from the TCG API.`, threadID);
      }
    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    if (!db) return api.sendMessage("Database is not connected for reply.", event.threadID);
    if (Reply.type === "list_selection" && Reply.senderID === event.senderID) {
      const userID = event.senderID;
      const threadID = event.threadID;
      const chosenIndex = parseInt(event.body.trim()) - 1;

      if (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex >= Reply.userPokemonList.length) {
        return api.sendMessage("⚠️ Invalid number. Please reply with a number from the list shown previously.", threadID);
      }
      const chosenPokemonFromList = Reply.userPokemonList[chosenIndex];
      if (Reply.originalMID) {
        api.unsendMessage(Reply.originalMID).catch(e => console.warn("MyPokemon onReply: Failed to unsend original list message:", e.message));
      }

      api.sendMessage(`🔍 Fetching detailed card info for ${chosenPokemonFromList.name}...`, threadID);
      const details = await this.getPokemonDetailsFromAPI(chosenPokemonFromList.name);

      if (details) {
        let detailMsg = `✨ ${details.name} - Card Details ✨\n\n`;
        detailMsg += `📊 HP: ${details.hp}\n`;
        detailMsg += `💧 Type(s): ${details.type}\n`;
        if (details.attack && details.attack !== "N/A") detailMsg += `⚔️ Primary Attack: ${details.attack}\n`;
        if (details.abilities && details.abilities !== "N/A") detailMsg += `💡 Abilities:\n${details.abilities}\n`;
        detailMsg += `🌟 Rarity: ${details.rarity}\n`;
        detailMsg += `📦 Set: ${details.set}\n`;
        
        let attachment = null;
        if (details.imageUrl) {
            try {
                if (global.utils && typeof global.utils.getStreamFromURL === 'function') {
                    attachment = await global.utils.getStreamFromURL(details.imageUrl);
                } else { console.warn("global.utils.getStreamFromURL not defined in onReply."); }
            } catch (error) { console.error("Failed to get image stream in onReply for " + details.name + ":", error); }
        }
        api.sendMessage({ body: detailMsg, attachment: attachment }, threadID);
      } else {
        return api.sendMessage(`❌ Could not retrieve detailed card information for "${chosenPokemonFromList.name}" from TCG API.`, threadID);
      }
    }
  }
};
