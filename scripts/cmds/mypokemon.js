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
const POKEMON_TCG_API_KEY = '4b2b15c7-27f0-4c3e-aa24-8474d551500c'; // <<<< REPLACE THIS!
const DEFAULT_XP_TO_NEXT_LEVEL = 100;
const DEFAULT_GAME_STAT = 10; 
const BASE_ENERGY_DEFAULT = 100; // Default energy if not specified

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

// Helper to parse attacks from TCG API structure (consistent with main pokemon.js)
function parseBaseAttacksFromTCG(apiAttacks) {
    if (!apiAttacks || !Array.isArray(apiAttacks) || apiAttacks.length === 0) return [];
    return apiAttacks.map(attack => {
        let damageString = String(attack.damage || "0");
        let baseDamage = parseInt(damageString.replace(/[^0-9].*$/, "")) || 0;
        // Simplified energy cost calculation for base TCG attacks if not already present
        const energyCost = attack.energyCost || Math.max(10, Math.floor(baseDamage / 4) + 5); 
        return {
            name: attack.name || "Unknown Attack",
            damage: baseDamage, 
            currentDamage: baseDamage, // Initial currentDamage is baseDamage
            baseDamage: baseDamage, 
            damageString: attack.damage || "0", 
            text: attack.text || "",
            cost: attack.cost || [], 
            effect: null, // Base TCG attacks might not have parsed game effects here
            energyCost: energyCost 
        };
    }).slice(0, 4); 
}


module.exports = {
  config: {
    name: "mypokemon",
    aliases: ["mypkmn"],
    version: "1.3.0", // Version for enhanced stats & lazy-init
    author: "Abdul Kaiyum",
    countDown: 5, role: 0,
    shortDescription: { en: "View your Pokémon collection with detailed." },
    longDescription: { en: "Displays your collected Pokémon. If game-specific stats (Level, XP, Moves etc.) are missing for an owned Pokémon, they will be initialized with defaults and saved." },
    category: "pokemon",
    guide: { en: `Usage:\n• {pn}\n• {pn} <name_or_number_from_list>`}
  },

  // Fetches canonical TCG card data - useful for image and base details
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
        const baseHp = parseInt(card.hp) || 50;
        return {
          api_id: card.id, api_name: card.name,
          api_type: card.types && card.types.length > 0 ? card.types : ["Unknown"], 
          api_hp: baseHp, 
          api_rarity: card.rarity || "N/A", api_set: card.set?.name || "N/A",
          api_tcg_attacks: parseBaseAttacksFromTCG(card.attacks),
          api_abilities: card.abilities && card.abilities.length > 0 ? card.abilities.map(a => `"${a.name}": ${a.text}`).join('\n') : "N/A",
          api_imageUrl: card.images?.large,
          api_base_energy: BASE_ENERGY_DEFAULT // Provide a default base energy from API context
        };
      } return null;
    } catch (error) { console.error(`Error fetching base card details for ${pokemonName}:`, error.message); return null; }
  },

  onStart: async function ({ api, event, args, usersData }) {
    if (!db) return api.sendMessage("⏳ Database is connecting... Please try again in a moment.", event.threadID);

    const userID = event.senderID; const threadID = event.threadID; const userName = await usersData.getName(userID);
    let userOwnedPokemons = await getUserPokemonCollectionList(userID); 

    let prefix = "!"; 
    try { if (global.utils && typeof global.utils.getPrefix === 'function') { const tp = await global.utils.getPrefix(threadID); if (tp) prefix = tp; } else if (global.config && global.config.PREFIX) { prefix = global.config.PREFIX; } else if (api && api.PREFIX) { prefix = api.PREFIX; }} catch(e){}

    if (args.length === 0) { // Display list
      if (userOwnedPokemons.length === 0) return api.sendMessage(`📂 ${userName}, your Pokémon collection is empty. Catch some Pokémon first!`, threadID);
      let msg = `🌟 ${userName}'s Pokémon Collection (${userOwnedPokemons.length} total):\n\n`;
      userOwnedPokemons.forEach((pokemon, index) => {
        const displayName = pokemon.nickname ? `${pokemon.nickname} (${pokemon.baseName || pokemon.name})` : (pokemon.baseName || pokemon.name);
        const typeDisplay = (pokemon.type && Array.isArray(pokemon.type)) ? pokemon.type.join('/') : (pokemon.type || 'N/A');
        msg += `${index + 1}. ${displayName || 'Unknown Pokémon'} - Lvl: ${pokemon.level || 1} | HP: ${pokemon.currentHP || pokemon.maxHP || pokemon.hp || '??'}/${pokemon.maxHP || pokemon.hp || '??'} | E: ${pokemon.energy || '??'}/${pokemon.maxEnergy || '??'} | Type: ${typeDisplay}\n`;
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

      selectedPokemonInstance = userOwnedPokemons.find((p, index) => {
        if ((p.nickname && p.nickname.toLowerCase() === query.toLowerCase()) || (p.baseName && p.baseName.toLowerCase() === query.toLowerCase()) || (p.name && p.name.toLowerCase() === query.toLowerCase())) {
            selectedPokemonIndex = index; return true;
        } return false;
      });

      if (!selectedPokemonInstance) return api.sendMessage(`❌ ${userName}, no Pokémon found matching "${query}". Use "${prefix}${this.config.name}" for your list.`, threadID);
      
      const baseName = selectedPokemonInstance.baseName || selectedPokemonInstance.name;
      if (!baseName) return api.sendMessage(`❌ Error: Pokémon data is corrupted (missing name).`, threadID);

      api.sendMessage(`🔍 Displaying details for your ${selectedPokemonInstance.nickname ? selectedPokemonInstance.nickname + ` (${baseName})` : baseName}...`, threadID);

      let needsUpdateInDB = false;
      const baseCardDetails = await this.getBaseCardDetailsFromAPI(baseName); // Fetch TCG details

      // Lazy Initialize missing game-specific stats
      if (selectedPokemonInstance.level === undefined) { selectedPokemonInstance.level = 1; needsUpdateInDB = true; }
      if (selectedPokemonInstance.xp === undefined) { selectedPokemonInstance.xp = 0; needsUpdateInDB = true; }
      if (selectedPokemonInstance.xpToNextLevel === undefined) { selectedPokemonInstance.xpToNextLevel = DEFAULT_XP_TO_NEXT_LEVEL; needsUpdateInDB = true; }
      
      if (selectedPokemonInstance.baseHp === undefined && baseCardDetails) { selectedPokemonInstance.baseHp = baseCardDetails.api_hp; needsUpdateInDB = true; }
      else if (selectedPokemonInstance.baseHp === undefined) { selectedPokemonInstance.baseHp = 50; needsUpdateInDB = true; }
      
      if (selectedPokemonInstance.maxHp === undefined) { selectedPokemonInstance.maxHp = selectedPokemonInstance.baseHp; needsUpdateInDB = true; }
      if (selectedPokemonInstance.currentHP === undefined) { selectedPokemonInstance.currentHP = selectedPokemonInstance.maxHp; needsUpdateInDB = true; }
      
      if (selectedPokemonInstance.type === undefined && baseCardDetails) { selectedPokemonInstance.type = baseCardDetails.api_type; needsUpdateInDB = true;}
      else if (selectedPokemonInstance.type === undefined) {selectedPokemonInstance.type = ["Unknown"]; needsUpdateInDB = true;}
      if (!Array.isArray(selectedPokemonInstance.type)) { selectedPokemonInstance.type = [String(selectedPokemonInstance.type)]; needsUpdateInDB = true; }


      if (selectedPokemonInstance.attackStat === undefined) { selectedPokemonInstance.attackStat = DEFAULT_GAME_STAT; needsUpdateInDB = true; }
      if (selectedPokemonInstance.defenseStat === undefined) { selectedPokemonInstance.defenseStat = DEFAULT_GAME_STAT; needsUpdateInDB = true; }
      if (selectedPokemonInstance.speedStat === undefined) { selectedPokemonInstance.speedStat = DEFAULT_GAME_STAT; needsUpdateInDB = true; }

      if ((!selectedPokemonInstance.attacks || !Array.isArray(selectedPokemonInstance.attacks) || selectedPokemonInstance.attacks.length === 0) && baseCardDetails && baseCardDetails.api_tcg_attacks) {
        selectedPokemonInstance.attacks = baseCardDetails.api_tcg_attacks.map(a => ({...a, currentDamage: a.damage, baseDamage: a.damage})); // Initialize current/base damage
        needsUpdateInDB = true;
      } else if (!selectedPokemonInstance.attacks || !Array.isArray(selectedPokemonInstance.attacks)) {
        selectedPokemonInstance.attacks = []; needsUpdateInDB = true;
      } else { // Ensure existing attacks have currentDamage and baseDamage
        selectedPokemonInstance.attacks = selectedPokemonInstance.attacks.map(atk => ({
            ...atk,
            baseDamage: parseInt(atk.baseDamage || atk.damage || 0),
            currentDamage: parseInt(atk.currentDamage || atk.baseDamage || atk.damage || 0),
            energyCost: parseInt(atk.energyCost || Math.max(10, Math.floor((atk.baseDamage || atk.damage || 0) / 4) + 5))
        }));
      }
      
      if (selectedPokemonInstance.baseMaxEnergy === undefined && baseCardDetails) { selectedPokemonInstance.baseMaxEnergy = baseCardDetails.api_base_energy; needsUpdateInDB = true; }
      else if (selectedPokemonInstance.baseMaxEnergy === undefined) { selectedPokemonInstance.baseMaxEnergy = BASE_ENERGY_DEFAULT; needsUpdateInDB = true; }

      if (selectedPokemonInstance.maxEnergy === undefined) { selectedPokemonInstance.maxEnergy = selectedPokemonInstance.baseMaxEnergy; needsUpdateInDB = true; }
      if (selectedPokemonInstance.energy === undefined) { selectedPokemonInstance.energy = selectedPokemonInstance.maxEnergy; needsUpdateInDB = true; }
      
      if (!selectedPokemonInstance.originalCardImageUrl && baseCardDetails) { selectedPokemonInstance.originalCardImageUrl = baseCardDetails.api_imageUrl; needsUpdateInDB = true; }
      if (!selectedPokemonInstance.baseName && baseCardDetails) { selectedPokemonInstance.baseName = baseCardDetails.api_name; needsUpdateInDB = true; }
      if (!selectedPokemonInstance.id) { selectedPokemonInstance.id = `${userID}_${baseName}_${Date.now()}`; needsUpdateInDB = true;} // Ensure an instance ID


      if (needsUpdateInDB && selectedPokemonIndex !== -1) {
          userOwnedPokemons[selectedPokemonIndex] = selectedPokemonInstance; 
          await saveUserPokemonCollectionList(userID, userOwnedPokemons);
          console.log(`MyPokemon: Updated/Initialized stats for ${baseName} for user ${userID}`);
      }

      let detailMsg = `✨ ${selectedPokemonInstance.nickname ? selectedPokemonInstance.nickname + ` (${baseName})` : baseName} - Lvl: ${selectedPokemonInstance.level} ✨\n\n`;
      detailMsg += `XP: ${selectedPokemonInstance.xp} / ${selectedPokemonInstance.xpToNextLevel}\n`;
      const typeDisplayDetail = (selectedPokemonInstance.type && Array.isArray(selectedPokemonInstance.type)) ? selectedPokemonInstance.type.join('/') : (selectedPokemonInstance.type || 'N/A');
      detailMsg += `Type: ${typeDisplayDetail}\n`;
      detailMsg += `HP: ${selectedPokemonInstance.currentHP} / ${selectedPokemonInstance.maxHp} (Base: ${selectedPokemonInstance.baseHp})\n`;
      detailMsg += `Energy: ${selectedPokemonInstance.energy} / ${selectedPokemonInstance.maxEnergy} (Base: ${selectedPokemonInstance.baseMaxEnergy})\n`;
      detailMsg += `Attack Stat: ${selectedPokemonInstance.attackStat}\n`;
      detailMsg += `Defense Stat: ${selectedPokemonInstance.defenseStat}\n`;
      detailMsg += `Speed Stat: ${selectedPokemonInstance.speedStat}\n`;

      if (selectedPokemonInstance.attacks && selectedPokemonInstance.attacks.length > 0) {
        detailMsg += `\nMoves (Learned):\n`;
        selectedPokemonInstance.attacks.forEach((move, i) => { 
            detailMsg += `  ${i + 1}. ${move.name} (Dmg: ${move.currentDamage || move.damageString || '0'}, Cost: ${move.energyCost}⚡)${move.text ? ` - ${move.text.substring(0,35)}...` : ''}\n`; 
        });
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
      let selectedPokemonInstance = userPokemonListFromReply[chosenIndex]; 
      
      if (Reply.originalMID) { api.unsendMessage(Reply.originalMID).catch(e => {}); }

      const baseNameToQuery = selectedPokemonInstance.baseName || selectedPokemonInstance.name;
      if (!baseNameToQuery) return api.sendMessage("Error: Cannot identify selected Pokémon.", threadID);
      
      // Re-run the detail display logic by simulating a call to onStart with the name
      // This ensures lazy initialization is triggered if needed for the selected Pokémon.
      // We pass the name of the Pokémon as an argument.
      return this.onStart({ api, event, args: [baseNameToQuery], usersData }); 
    }
  }
};
