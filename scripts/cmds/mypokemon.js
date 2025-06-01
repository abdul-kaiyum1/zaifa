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
const POKEMON_TCG_API_KEY = '4b2b15c7-27f0-4c3e-aa24-8474d551500c'; // <<<< CRITICAL: REPLACE THIS!!!
const DEFAULT_XP_TO_NEXT_LEVEL = 100;
const DEFAULT_GAME_STAT = 10; // Default for AttackStat, DefenseStat, SpeedStat if not found

// --- MongoDB Data Access Functions ---
async function getUserPokemonCollectionList(userID) {
    if (!db) { console.error("DB not connected in getUserPokemonCollectionList (MyPokemon)"); return []; }
    const collection = db.collection('pokemon_user_collections');
    const userPokemonsDoc = await collection.findOne({ userID: userID });
    return userPokemonsDoc ? userPokemonsDoc.pokemons || [] : [];
}

async function saveUserPokemonCollectionList(userID, pokemonsList) {
    if (!db) { console.error("DB not connected in saveUserPokemonCollectionList (MyPokemon)"); return; }
    const collection = db.collection('pokemon_user_collections');
    await collection.updateOne({ userID: userID }, { $set: { userID: userID, pokemons: pokemonsList } }, { upsert: true });
}

// Helper to parse attacks from TCG API structure
function parseBaseAttacksFromTCG(apiAttacks) {
    if (!apiAttacks || apiAttacks.length === 0) return [];
    return apiAttacks.map(attack => {
        let damageString = String(attack.damage || "0");
        let baseDamage = parseInt(damageString.replace(/[^0-9].*$/, "")) || 0;
        return {
            name: attack.name || "Unknown Attack",
            damage: baseDamage, 
            damageString: attack.damage || "0", 
            text: attack.text || "",
            cost: attack.cost || [], // Keep TCG cost for info if needed
            // effect: null // Could parse simple effects here if desired for base moves
        };
    }).slice(0, 4); 
}

module.exports = {
  config: {
    name: "mypokemon",
    aliases: ["mypkmn", "collection", "box"],
    version: "1.3.0", // Version for lazy-init of stats
    author: "Abdul Kaiyum",
    countDown: 5, role: 0,
    shortDescription: { en: "View your Pokémon collection with detailed & auto-initialized game stats." },
    longDescription: { en: "Displays your collected Pokémon. If game-specific stats (Level, XP, Moves etc.) are missing for an owned Pokémon, they will be initialized with defaults and saved." },
    category: "pokemon",
    guide: { en: `Usage:\n• {pn}\n• {pn} <name_or_number_from_list>`}
  },

  async getBaseCardDetailsFromAPI(pokemonName) {
    if (!POKEMON_TCG_API_KEY || POKEMON_TCG_API_KEY === 'YOUR_POKEMON_TCG_API_KEY') {
        console.error("MyPokemon: POKEMON_TCG_API_KEY is not set!");
        return null;
    }
    try {
      const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(pokemonName)}"`, {
        headers: { 'X-Api-Key': POKEMON_TCG_API_KEY }
      });
      if (!response.data || !response.data.data || response.data.data.length === 0) {
        console.warn(`No card data found for "${pokemonName}" from TCG API.`); return null;
      }
      const card = response.data.data.find(c => c.name.toLowerCase() === pokemonName.toLowerCase()) || response.data.data[0];
      if (card) {
        return {
          api_id: card.id, api_name: card.name,
          api_type: card.types && card.types.length > 0 ? card.types : ["Unknown"], // Return as array
          api_hp: parseInt(card.hp || "50"), // Default HP if missing
          api_rarity: card.rarity || "N/A", api_set: card.set?.name || "N/A",
          api_tcg_attacks: parseBaseAttacksFromTCG(card.attacks),
          api_abilities: card.abilities && card.abilities.length > 0 ? card.abilities.map(a => `"${a.name}": ${a.text}`).join('\n') : "N/A",
          api_imageUrl: card.images?.large
        };
      } return null;
    } catch (error) { console.error(`Error fetching base card details for ${pokemonName}:`, error.message); return null; }
  },

  onStart: async function ({ api, event, args, usersData }) {
    if (!db) return api.sendMessage("⏳ Database is connecting... Please try again in a moment.", event.threadID);

    const userID = event.senderID; const threadID = event.threadID; const userName = await usersData.getName(userID);
    let userOwnedPokemons = await getUserPokemonCollectionList(userID); // This is an array

    let prefix = "!"; 
    try { if (global.utils && typeof global.utils.getPrefix === 'function') { const tp = await global.utils.getPrefix(threadID); if (tp) prefix = tp; } else if (global.config && global.config.PREFIX) { prefix = global.config.PREFIX; } else if (api && api.PREFIX) { prefix = api.PREFIX; }} catch(e){}

    if (args.length === 0) { // Display list
      if (userOwnedPokemons.length === 0) return api.sendMessage(`📂 ${userName}, your collection is empty.`, threadID);
      let msg = `🌟 ${userName}'s Pokémon Collection (${userOwnedPokemons.length} total):\n\n`;
      userOwnedPokemons.forEach((pokemon, index) => {
        const displayName = pokemon.nickname ? `${pokemon.nickname} (${pokemon.baseName || pokemon.name})` : (pokemon.baseName || pokemon.name);
        const typeDisplay = (pokemon.type && Array.isArray(pokemon.type)) ? pokemon.type.join('/') : (pokemon.type || 'N/A');
        msg += `${index + 1}. ${displayName || 'Unknown Pokémon'} - Lvl: ${pokemon.level || 1} | HP: ${pokemon.currentHP || pokemon.maxHP || pokemon.hp || '??'}/${pokemon.maxHP || pokemon.hp || '??'} | Type: ${typeDisplay}\n`;
      });
      msg += `\nReply with Pokémon number for details, or use "${prefix}${this.config.name} <name>".`;
      api.sendMessage(msg, threadID, (err, msgInfo) => {
        if (err) return console.error("MyPokemon list send error:", err);
        global.GoatBot.onReply.set(msgInfo.messageID, { commandName: this.config.name, senderID: userID, userPokemonListFromReply: userOwnedPokemons, type: "list_selection", originalMID: msgInfo.messageID });
      });
    } else { // Display details for a specific Pokémon
      const query = args.join(" ").trim();
      let selectedPokemonInstance = null;
      let selectedPokemonIndex = -1;

      // Find by name (nickname or baseName/name)
      selectedPokemonInstance = userOwnedPokemons.find((p, index) => {
        if ((p.nickname && p.nickname.toLowerCase() === query.toLowerCase()) || (p.baseName && p.baseName.toLowerCase() === query.toLowerCase()) || (p.name && p.name.toLowerCase() === query.toLowerCase())) {
            selectedPokemonIndex = index;
            return true;
        }
        return false;
      });

      if (!selectedPokemonInstance) return api.sendMessage(`❌ ${userName}, no Pokémon found matching "${query}". Use "${prefix}${this.config.name}" for your list.`, threadID);
      
      const baseName = selectedPokemonInstance.baseName || selectedPokemonInstance.name;
      if (!baseName) return api.sendMessage(`❌ Error: Pokémon data is corrupted (missing name).`, threadID);

      api.sendMessage(`🔍 Details for your ${selectedPokemonInstance.nickname ? selectedPokemonInstance.nickname + ` (${baseName})` : baseName}...`, threadID);

      let needsUpdateInDB = false;

      // Lazy Initialize missing game-specific stats
      if (selectedPokemonInstance.level === undefined) { selectedPokemonInstance.level = 1; needsUpdateInDB = true; }
      if (selectedPokemonInstance.xp === undefined) { selectedPokemonInstance.xp = 0; needsUpdateInDB = true; }
      if (selectedPokemonInstance.xpToNextLevel === undefined) { selectedPokemonInstance.xpToNextLevel = DEFAULT_XP_TO_NEXT_LEVEL; needsUpdateInDB = true; }
      
      const baseCardDetails = await this.getBaseCardDetailsFromAPI(baseName);

      if (selectedPokemonInstance.maxHP === undefined && baseCardDetails) { selectedPokemonInstance.maxHP = baseCardDetails.api_hp; needsUpdateInDB = true; }
      else if (selectedPokemonInstance.maxHP === undefined) { selectedPokemonInstance.maxHP = 50; needsUpdateInDB = true;} // Absolute fallback

      if (selectedPokemonInstance.currentHP === undefined) { selectedPokemonInstance.currentHP = selectedPokemonInstance.maxHP; needsUpdateInDB = true; }
      
      if (selectedPokemonInstance.type === undefined && baseCardDetails) { selectedPokemonInstance.type = baseCardDetails.api_type; needsUpdateInDB = true;}
      else if (selectedPokemonInstance.type === undefined) {selectedPokemonInstance.type = ["Unknown"]; needsUpdateInDB = true;}


      if (selectedPokemonInstance.attackStat === undefined) { selectedPokemonInstance.attackStat = DEFAULT_GAME_STAT; needsUpdateInDB = true; }
      if (selectedPokemonInstance.defenseStat === undefined) { selectedPokemonInstance.defenseStat = DEFAULT_GAME_STAT; needsUpdateInDB = true; }
      if (selectedPokemonInstance.speedStat === undefined) { selectedPokemonInstance.speedStat = DEFAULT_GAME_STAT; needsUpdateInDB = true; }

      if ((!selectedPokemonInstance.learnedMoves || selectedPokemonInstance.learnedMoves.length === 0) && baseCardDetails && baseCardDetails.api_tcg_attacks) {
        selectedPokemonInstance.learnedMoves = baseCardDetails.api_tcg_attacks;
        needsUpdateInDB = true;
      } else if (!selectedPokemonInstance.learnedMoves) {
        selectedPokemonInstance.learnedMoves = [];
        needsUpdateInDB = true;
      }
      
      if (!selectedPokemonInstance.originalCardImageUrl && baseCardDetails) { selectedPokemonInstance.originalCardImageUrl = baseCardDetails.api_imageUrl; needsUpdateInDB = true; }
      if (!selectedPokemonInstance.baseName && baseCardDetails) { selectedPokemonInstance.baseName = baseCardDetails.api_name; needsUpdateInDB = true; }


      if (needsUpdateInDB && selectedPokemonIndex !== -1) {
          userOwnedPokemons[selectedPokemonIndex] = selectedPokemonInstance; // Update the instance in the array
          await saveUserPokemonCollectionList(userID, userOwnedPokemons);
          console.log(`MyPokemon: Updated/Initialized stats for ${baseName} for user ${userID}`);
      }

      // Display logic (same as your previous full code, uses selectedPokemonInstance)
      let detailMsg = `✨ ${selectedPokemonInstance.nickname ? selectedPokemonInstance.nickname + ` (${baseName})` : baseName} - Lvl: ${selectedPokemonInstance.level} ✨\n\n`;
      detailMsg += `XP: ${selectedPokemonInstance.xp} / ${selectedPokemonInstance.xpToNextLevel}\n`;
      const typeDisplayDetail = (selectedPokemonInstance.type && Array.isArray(selectedPokemonInstance.type)) ? selectedPokemonInstance.type.join('/') : (selectedPokemonInstance.type || 'N/A');
      detailMsg += `Type: ${typeDisplayDetail}\n`;
      detailMsg += `HP: ${selectedPokemonInstance.currentHP} / ${selectedPokemonInstance.maxHP}\n`;
      detailMsg += `Attack Stat: ${selectedPokemonInstance.attackStat}\n`;
      detailMsg += `Defense Stat: ${selectedPokemonInstance.defenseStat}\n`;
      detailMsg += `Speed Stat: ${selectedPokemonInstance.speedStat}\n`;
      if (selectedPokemonInstance.learnedMoves && selectedPokemonInstance.learnedMoves.length > 0) {
        detailMsg += `\nMoves (Learned):\n`;
        selectedPokemonInstance.learnedMoves.forEach((move, i) => { detailMsg += `  ${i + 1}. ${move.name} (Dmg: ${move.damageString || '0'})${move.text ? ` - ${move.text.substring(0,40)}...` : ''}\n`; });
      } else { detailMsg += `Learned Moves: N/A\n`; }
      if (selectedPokemonInstance.heldItem) detailMsg += `Held Item: ${selectedPokemonInstance.heldItem}\n`;

      if (baseCardDetails) {
        detailMsg += `\n--- Base TCG Card Info ---\n`;
        if (baseCardDetails.api_rarity !== "N/A") detailMsg += `Rarity: ${baseCardDetails.api_rarity}\n`;
        if (baseCardDetails.api_set !== "N/A") detailMsg += `Original Set: ${baseCardDetails.api_set}\n`;
        if (baseCardDetails.api_abilities !== "N/A") detailMsg += `Base Abilities (TCG):\n${baseCardDetails.api_abilities}\n`;
      }
      
      let attachment = null;
      const imageUrl = selectedPokemonInstance.originalCardImageUrl || (baseCardDetails ? baseCardDetails.api_imageUrl : null);
      if (imageUrl) {
          try { if (global.utils && typeof global.utils.getStreamFromURL === 'function') { attachment = await global.utils.getStreamFromURL(imageUrl); } else { console.warn("MyPokemon: global.utils.getStreamFromURL not defined."); }}
          catch (error) { console.error("MyPokemon: Failed to get image stream for " + baseName + ":", error); }
      }
      api.sendMessage({ body: detailMsg, attachment: attachment }, threadID);
    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    if (!db) return api.sendMessage("⏳ Database is connecting... Please try again in a moment.", event.threadID);
    if (Reply.type === "list_selection" && Reply.senderID === event.senderID) {
      const userID = event.senderID; const threadID = event.threadID;
      const chosenIndex = parseInt(event.body.trim()) - 1;
      const userPokemonListFromReply = Reply.userPokemonListFromReply; 

      if (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex >= userPokemonListFromReply.length) {
        return api.sendMessage("⚠️ Invalid number. Please reply with a number from the list.", threadID);
      }
      let selectedPokemonInstance = userPokemonListFromReply[chosenIndex]; // This is a copy from reply
      
      // It's better to re-fetch the potentially updated instance from DB or use its full data from reply
      // For simplicity, let's re-run the detail display logic, which includes lazy init if needed.
      // To do that, we effectively simulate the user typing the name.

      if (Reply.originalMID) { api.unsendMessage(Reply.originalMID).catch(e => {}); }

      const baseNameToQuery = selectedPokemonInstance.baseName || selectedPokemonInstance.name;
      if (!baseNameToQuery) return api.sendMessage("Error: Cannot identify selected Pokémon.", threadID);

      // Simulate calling onStart again with the Pokémon's name as an argument
      // This will trigger the lazy-init logic if necessary
      return this.onStart({ api, event, args: [baseNameToQuery], usersData }); 
    }
  }
};
