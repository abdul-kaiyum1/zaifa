// scripts/cmds/pokemon.js
// Author: Abdul Kaiyum

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require('canvas');
const { MongoClient } = require('mongodb');

// --- MongoDB Setup ---
const mongoURI = "mongodb+srv://abdulkaiyum:abdulkaiyum5426@octa.elx1m1f.mongodb.net/GoatBotV2?retryWrites=true&w=majority&appName=octa"; // Your MongoDB URI
const dbName = 'GoatBotV2'; // Your Database Name
let db; // Database connection variable

MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('Pokémon Command: Connected to MongoDB successfully!');
    // Optional: Create indexes for better query performance
    db.collection('pokemon_game_states').createIndex({ userID: 1 }, { background: true }).catch(err => console.error("Error creating index for pokemon_game_states:", err));
    db.collection('pokemon_user_collections').createIndex({ userID: 1 }, { background: true }).catch(err => console.error("Error creating index for pokemon_user_collections:", err));
  })
  .catch(error => console.error('Pokémon Command: Error connecting to MongoDB:', error));

// --- Constants ---
const ONE_HOUR_MS = 60 * 60 * 1000;
const CHALLENGE_TIMEOUT_MS = 60 * 1000; // 1 minute for challenge timeout
const POKEMON_TCG_API_KEY = '4b2b15c7-27f0-4c3e-aa24-8474d551500c'; // <<<< REPLACE THIS WITH YOUR ACTUAL KEY
const NAME_OBSCURE_AREA = { x: 0.1, y: 0.04, width: 0.8, height: 0.08, color: 'black' }; // Adjust as needed
const CACHE_FOLDER_PATH = path.join(__dirname, 'cache'); // For temporary images
fs.ensureDirSync(CACHE_FOLDER_PATH); // Create cache directory if it doesn't exist

// --- Helper Functions ---
async function obscurePokemonName(imageUrl, obscureAreaConfig) {
    try {
        const image = await loadImage(imageUrl); // loadImage from 'canvas' can fetch URLs
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const rectX = obscureAreaConfig.x * image.width;
        const rectY = obscureAreaConfig.y * image.height;
        const rectWidth = obscureAreaConfig.width * image.width;
        const rectHeight = obscureAreaConfig.height * image.height;
        ctx.fillStyle = obscureAreaConfig.color || 'black';
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error(`Error obscuring Pokémon name with canvas (URL: ${imageUrl}):`, error.message);
        return null;
    }
}

// --- MongoDB Data Access Functions ---
async function getGameStateForUser(userID) {
    if (!db) { console.error("DB not connected in getGameStateForUser"); return null; }
    const collection = db.collection('pokemon_game_states');
    let userState = await collection.findOne({ userID: userID });
    const defaultState = { userID: userID, coins: 100, currentChallenge: null, currentBattle: null, pendingPvpChallenge: null, lastChallengeTime: null };
    if (!userState) { return defaultState; } // Return default if no state found
    return { ...defaultState, ...userState }; // Merge to ensure all fields are present
}

async function saveGameStateForUser(userID, userState) {
    if (!db) { console.error("DB not connected in saveGameStateForUser"); return; }
    const collection = db.collection('pokemon_game_states');
    // Ensure all default fields are present before saving
    const defaultStateFields = { coins: 0, currentChallenge: null, currentBattle: null, pendingPvpChallenge: null, lastChallengeTime: null };
    const stateToSave = { ...defaultStateFields, ...userState, userID: userID };
    await collection.updateOne({ userID: userID }, { $set: stateToSave }, { upsert: true });
}

async function getUserPokemonCollectionList(userID) {
    if (!db) { console.error("DB not connected in getUserPokemonCollectionList"); return []; }
    const collection = db.collection('pokemon_user_collections');
    const userPokemonsDoc = await collection.findOne({ userID: userID });
    return userPokemonsDoc ? userPokemonsDoc.pokemons || [] : [];
}

async function saveUserPokemonCollectionList(userID, pokemonsList) {
    if (!db) { console.error("DB not connected in saveUserPokemonCollectionList"); return; }
    const collection = db.collection('pokemon_user_collections');
    await collection.updateOne({ userID: userID }, { $set: { userID: userID, pokemons: pokemonsList } }, { upsert: true });
}

module.exports = {
  config: {
    name: "pokemon",
    aliases: ["pkmn", "game"],
    version: "1.2.3", // Incremented for cancel challenge feature
    author: "Abdul Kaiyum",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Pokémon game with challenge timeout, cancellation, and MongoDB." },
    longDescription: { en: "Pokémon TCG game. Data in MongoDB. Challenges hide names, timeout after 1 min, or can be cancelled." },
    category: "pokemon",
    guide: {
      en: `Usage:
• {pn} challenge     ➜ Start a daily Pokémon identification challenge.
• {pn} battle ai     ➜ Start a battle against an AI opponent.
• {pn} battle pvp <@user> ➜ Challenge another player to a battle.
• {pn} status        ➜ Check your current game status (coins, active challenges/battles).
• {pn} leaderboard   ➜ See the top players by coins.`
    }
  },

  async getPokemonDetailsFromAPI(pokemonName) {
    try {
      const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(pokemonName)}`, {
        headers: { 'X-Api-Key': POKEMON_TCG_API_KEY }
      });
      const cards = response.data.data.filter(card => card.images && card.images.large);
      return cards.length > 0 ? cards[0] : null;
    } catch (error) { console.error(`Error fetching Pokémon details for ${pokemonName}:`, error.message); return null; }
  },

  async getRandomPokemonForChallenge() {
    try {
      const types = ["fire", "water", "grass", "lightning", "fighting", "psychic", "darkness", "metal", "fairy", "dragon", "colorless"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=types:${randomType} supertype:pokemon`, {
        headers: { 'X-Api-Key': POKEMON_TCG_API_KEY },
        params: { pageSize: 50 }
      });
      const playableCards = response.data.data.filter(card =>
        card.supertype === "Pokémon" && card.images && card.images.large &&
        card.hp && !isNaN(parseInt(card.hp)) && card.attacks && card.attacks.length > 0
      );
      if (playableCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * playableCards.length);
        const randomCard = playableCards[randomIndex];
        let imageBuffer = null;
        if (randomCard.images.large) {
            imageBuffer = await obscurePokemonName(randomCard.images.large, NAME_OBSCURE_AREA);
        }
        return {
          name: randomCard.name, imageUrl: randomCard.images.large, imageBuffer: imageBuffer,
          hp: randomCard.hp, type: randomCard.types && randomCard.types.length > 0 ? randomCard.types[0] : "Colorless",
          attack: randomCard.attacks && randomCard.attacks.length > 0 ? (String(randomCard.attacks[0].damage).replace(/\D/g,'') || '0') : '0'
        };
      }
      console.warn("No playable cards found for challenge."); return null;
    } catch (error) { console.error("Error fetching random Pokémon for challenge:", error.message); return null; }
  },

  getTypeAdvantage(attackingType, defendingType) {
    const advantages = {"Fire":{"weakTo":["Water"],"strongAgainst":["Grass","Metal"]},"Water":{"weakTo":["Lightning","Grass"],"strongAgainst":["Fire","Fighting"]},"Grass":{"weakTo":["Fire","Psychic"],"strongAgainst":["Water","Fighting"]},"Lightning":{"weakTo":["Fighting"],"strongAgainst":["Water","Colorless"]},"Fighting":{"weakTo":["Psychic","Fairy"],"strongAgainst":["Darkness","Metal","Colorless"]},"Psychic":{"weakTo":["Darkness","Psychic"],"strongAgainst":["Fighting","Grass"]},"Darkness":{"weakTo":["Fighting","Fairy"],"strongAgainst":["Psychic"]},"Colorless":{"weakTo":["Fighting","Lightning"],"strongAgainst":[]},"Metal":{"weakTo":["Fire","Fighting"],"strongAgainst":["Fairy","Water"]},"Fairy":{"weakTo":["Metal","Darkness"],"strongAgainst":["Fighting","Dragon","Darkness"]},"Dragon":{"weakTo":["Fairy","Dragon"],"strongAgainst":["Dragon"]}};
    const attackerInfo=advantages[attackingType];const defenderInfo=advantages[defendingType];
    if(attackerInfo&&attackerInfo.strongAgainst&&attackerInfo.strongAgainst.includes(defendingType))return 2;
    if(defenderInfo&&defenderInfo.weakTo&&defenderInfo.weakTo.includes(attackingType))return 2;
    if(attackerInfo&&attackerInfo.weakTo&&attackerInfo.weakTo.includes(defendingType))return 0.5;
    return 1;
  },

  onStart: async function ({ api, event, args, usersData }) {
    if (!db) return api.sendMessage("Database is not connected. Please try again in a moment or contact an admin.", event.threadID);

    const userID = event.senderID; const threadID = event.threadID; const userName = await usersData.getName(userID);
    let userState = await getGameStateForUser(userID);
    if (!userState) return api.sendMessage("Error: Could not load your game data. Please try again later.", threadID);

    // Check for active challenge or battle *before* processing new commands, unless it's "cancel challenge"
    const command = args[0]?.toLowerCase();
    const subCommand = args[1]?.toLowerCase();

    if (command === "cancel" && subCommand === "challenge") {
        if (userState.currentChallenge) {
            if (userState.currentChallenge.timeoutID) {
                clearTimeout(parseInt(userState.currentChallenge.timeoutID)); // Clear the scheduled timeout
            }
            if (userState.currentChallenge.messageID) {
                api.unsendMessage(userState.currentChallenge.messageID).catch(e => console.warn("Cancel Challenge: Error un-sending original challenge message:", e.message));
            }
            userState.currentChallenge = null;
            await saveGameStateForUser(userID, userState);
            return api.sendMessage("✅ Your active Pokémon challenge has been cancelled.", threadID);
        } else {
            return api.sendMessage("You don't have an active Pokémon challenge to cancel.", threadID);
        }
    }

    if (userState.currentChallenge) { return api.sendMessage(`You have an active Pokémon identification challenge! Reply to its image or use "{pn} cancel challenge".`, threadID); }
    if (userState.currentBattle) { 
        let battleMsg = `⚔️ You are currently in a battle against ${userState.currentBattle.opponentName || (userState.currentBattle.player1ID === userID ? await usersData.getName(userState.currentBattle.player2ID) : await usersData.getName(userState.currentBattle.player1ID))}!\n\n`;
        let cPName, cPHP, cPMaxHP;
        if (userState.currentBattle.type === "ai") { cPName = userState.currentBattle.playerActivePokemonName; cPHP = userState.currentBattle.playerActivePokemonHP; cPMaxHP = userState.currentBattle.playerActivePokemonMaxHp; battleMsg += `Your Pokémon: ${cPName} (HP: ${cPHP}/${cPMaxHP})\n`; battleMsg += `Opponent: ${userState.currentBattle.opponentName} (HP: ${userState.currentBattle.opponentHP})\n\n`; battleMsg += `It's your turn! Reply with "attack".`;
        } else { const isP1 = userState.currentBattle.player1ID === userID; cPName = isP1 ? userState.currentBattle.player1ActivePokemonName : userState.currentBattle.player2ActivePokemonName; cPHP = isP1 ? userState.currentBattle.player1ActivePokemonHP : userState.currentBattle.player2ActivePokemonHP; cPMaxHP = isP1 ? userState.currentBattle.player1ActivePokemonMaxHp : userState.currentBattle.player2ActivePokemonMaxHp; const oPName = isP1 ? userState.currentBattle.player2ActivePokemonName : userState.currentBattle.player1ActivePokemonName; const oPHP = isP1 ? userState.currentBattle.player2ActivePokemonHP : userState.currentBattle.player1ActivePokemonHP; const oPMaxHP = isP1 ? userState.currentBattle.player2ActivePokemonMaxHp : userState.currentBattle.player1ActivePokemonMaxHp; const oActualName = isP1 ? await usersData.getName(userState.currentBattle.player2ID) : await usersData.getName(userState.currentBattle.player1ID); battleMsg += `Your Pokémon: ${cPName} (HP: ${cPHP}/${cPMaxHP})\n`; battleMsg += `${oActualName}'s Pokémon: ${oPName} (HP: ${oPHP}/${oPMaxHP})\n\n`; const turnUN = await usersData.getName(userState.currentBattle.currentTurn); battleMsg += `It's ${userState.currentBattle.currentTurn === userID ? 'your' : turnUN + "'s"} turn!\n`; if (userState.currentBattle.currentTurn === userID) battleMsg += `Reply with "attack".`;}
        return api.sendMessage(battleMsg, threadID);
    }
    if (userState.pendingPvpChallenge && userState.pendingPvpChallenge.challengerID === userID) { const cUserName = await usersData.getName(userState.pendingPvpChallenge.challengedUserID); return api.sendMessage(`Pending PvP challenge to ${cUserName}. Waiting for response.`, threadID); }
    if (db) { const incomingChallenge = await db.collection('pokemon_game_states').findOne({ "pendingPvpChallenge.challengedUserID": userID, "pendingPvpChallenge.challengerID": { $ne: userID} }); if (incomingChallenge && incomingChallenge.pendingPvpChallenge) { const challengerName = await usersData.getName(incomingChallenge.pendingPvpChallenge.challengerID); return api.sendMessage(`Incoming PvP challenge from ${challengerName}! Reply to their message.`, threadID);}}
    
    switch (command) {
      case "challenge": // This will only be reached if not "cancel challenge" and no other active states
        if (userState.lastChallengeTime && (Date.now() - userState.lastChallengeTime < ONE_HOUR_MS)) {
          const timeLeftMs = ONE_HOUR_MS - (Date.now() - userState.lastChallengeTime);
          return api.sendMessage(`New challenge available in ~${Math.ceil(timeLeftMs / 60000)} min.`, threadID);
        }
        api.sendMessage("Generating Pokémon challenge (name hidden, 1 min to reply)...", threadID);
        const challengePokemon = await this.getRandomPokemonForChallenge();
        if (challengePokemon) {
          userState.currentChallenge = { name: challengePokemon.name, hp: challengePokemon.hp, type: challengePokemon.type, attack: challengePokemon.attack, originalImageUrl: challengePokemon.imageUrl, messageID: null, timeoutID: null };
          await saveGameStateForUser(userID, userState); 
          let attachment = null; let messageBody = `❓ Daily Challenge! Name this Pokémon! (Name area hidden)`;
          let tempImagePath = null;

          if (challengePokemon.imageBuffer) {
            try { tempImagePath = path.join(CACHE_FOLDER_PATH, `challenge_${userID}_${Date.now()}.png`); fs.writeFileSync(tempImagePath, challengePokemon.imageBuffer); attachment = fs.createReadStream(tempImagePath);
            } catch (writeError) { console.error("Error writing image buffer to temp file:", writeError); attachment = null; tempImagePath = null; if (challengePokemon.imageUrl) { messageBody = `❓ Daily Challenge! Name this Pokémon! (Processing error, using original).`; try { if (global.utils && typeof global.utils.getStreamFromURL === 'function') { attachment = await global.utils.getStreamFromURL(challengePokemon.imageUrl); } else { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }} catch (e) { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }}}
          } else if (challengePokemon.imageUrl) { messageBody = `❓ Daily Challenge! Name this Pokémon! (Could not hide name).`; try { if (global.utils && typeof global.utils.getStreamFromURL === 'function') { attachment = await global.utils.getStreamFromURL(challengePokemon.imageUrl); } else { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }} catch (e) { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }}
          
          if (attachment) {
            api.sendMessage({ body: messageBody, attachment: attachment }, threadID, async (err, msgInfo) => {
                if (tempImagePath) { fs.unlink(tempImagePath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting temp challenge image:", unlinkErr); }); }
                if (err) { console.error("Error sending challenge message:", err); userState.currentChallenge = null; await saveGameStateForUser(userID, userState); return; }
                let currentState = await getGameStateForUser(userID);
                if (currentState && currentState.currentChallenge && currentState.currentChallenge.name === challengePokemon.name && !currentState.currentChallenge.messageID) { // Ensure this specific challenge is still active and messageID not set
                    currentState.currentChallenge.messageID = msgInfo.messageID;
                    const challengeTimeoutID = setTimeout(async () => {
                        let timedOutState = await getGameStateForUser(userID);
                        if (timedOutState && timedOutState.currentChallenge && timedOutState.currentChallenge.messageID === msgInfo.messageID) {
                            api.unsendMessage(msgInfo.messageID).catch(unsendErr => console.error("Failed to unsend timed-out challenge:", unsendErr));
                            api.sendMessage(`⏰ Time's up for Pokémon challenge! Removed. Try again.`, threadID);
                            timedOutState.currentChallenge = null;
                            await saveGameStateForUser(userID, timedOutState);
                        }
                    }, CHALLENGE_TIMEOUT_MS);
                    currentState.currentChallenge.timeoutID = challengeTimeoutID.toString();
                    await saveGameStateForUser(userID, currentState);
                    global.GoatBot.onReply.set(msgInfo.messageID, { commandName: this.config.name, senderID: userID, challengeData: currentState.currentChallenge, type: "challenge_answer", originalMID: msgInfo.messageID });
                }
            });
          } else { 
            userState.currentChallenge = null; await saveGameStateForUser(userID, userState); 
            messageBody = `❓ Identify: ${challengePokemon.name}. (Image failed). Reply name!`; if(challengePokemon.imageUrl) messageBody += `\nOriginal: ${challengePokemon.imageUrl}`; 
            const rMNA = await api.sendMessage(messageBody, threadID); global.GoatBot.onReply.set(rMNA.messageID, { commandName: this.config.name, senderID: userID, challengeData: userState.currentChallenge, type: "challenge_answer", originalMID: rMNA.messageID });
          }
        } else { api.sendMessage("❌ Challenge generation failed.", threadID); }
        break;
      case "battle":
        let userPokemonsBattle = await getUserPokemonCollectionList(userID);
        if (userPokemonsBattle.length === 0) return api.sendMessage(`You need Pokémon to battle!`, threadID);
        const activePokemonBattle = { ...userPokemonsBattle[0], hp:parseInt(userPokemonsBattle[0].hp),maxHp:parseInt(userPokemonsBattle[0].maxHp),attack:parseInt(String(userPokemonsBattle[0].attack).replace(/\D/g,'')||'0')};
        if (!subCommand) return api.sendMessage(`Specify battle: ai or pvp @user.`, threadID);
        if (subCommand === "ai") {
            const opponentAI = await this.getRandomPokemonForChallenge();
            if (!opponentAI || !opponentAI.hp || !opponentAI.attack) return api.sendMessage("❌ AI setup failed.", threadID);
            userState.currentBattle = { type: "ai", opponentName: opponentAI.name, opponentHP: parseInt(opponentAI.hp), opponentMaxHp: parseInt(opponentAI.hp), opponentType: opponentAI.type, opponentAttack: parseInt(String(opponentAI.attack).replace(/\D/g,'')||'0'), playerActivePokemonName: activePokemonBattle.name, playerActivePokemonHP: activePokemonBattle.hp, playerActivePokemonMaxHp: activePokemonBattle.maxHp, playerActivePokemonType: activePokemonBattle.type, playerActivePokemonAttack: activePokemonBattle.attack, playerPokemonIndex: 0, currentTurn: userID };
            await saveGameStateForUser(userID, userState);
            let msgAI = `⚔️ ${userName} vs ${userState.currentBattle.opponentName} (AI)!\n\nYour ${activePokemonBattle.name} (HP ${activePokemonBattle.hp}/${activePokemonBattle.maxHp})\nAI's ${opponentAI.name} (HP ${opponentAI.hp}/${opponentAI.hp})\n\nYour turn! Reply "attack".`;
            const rMAI = await api.sendMessage(msgAI, threadID); global.GoatBot.onReply.set(rMAI.messageID, { commandName: this.config.name, senderID: userID, type: "battle_move", originalMID: rMAI.messageID });
        } else if (subCommand === "pvp") {
            const mentionsPvP = Object.keys(event.mentions); if (mentionsPvP.length === 0) return api.sendMessage(`Tag player for PvP.`, threadID);
            const challengedIDPvP = mentionsPvP[0]; if (challengedIDPvP === userID) return api.sendMessage("Cannot challenge self.", threadID);
            const challengedNamePvP = await usersData.getName(challengedIDPvP);
            let challengedStatePvP = await getGameStateForUser(challengedIDPvP);
            if (challengedStatePvP.currentBattle || challengedStatePvP.currentChallenge || challengedStatePvP.pendingPvpChallenge) return api.sendMessage(`${challengedNamePvP} is busy.`, threadID);
            let challengedPokemonsPvP = await getUserPokemonCollectionList(challengedIDPvP);
            if (challengedPokemonsPvP.length === 0) return api.sendMessage(`${challengedNamePvP} has no Pokémon.`, threadID);
            userState.pendingPvpChallenge = { challengerID: userID, challengedUserID: challengedIDPvP, threadID: threadID, challengerPokemon: activePokemonBattle };
            await saveGameStateForUser(userID, userState);
            const cMsgPvP = `🔔 ${userName} challenges you (${challengedNamePvP}) to PvP! Reply "accept" or "decline".`;
            try { const sMPvP = await api.sendMessage(cMsgPvP, challengedIDPvP); global.GoatBot.onReply.set(sMPvP.messageID, { commandName: this.config.name, senderID: challengedIDPvP, type: "pvp_challenge_response", challengerID: userID, originalMID: sMPvP.messageID }); api.sendMessage(`Challenge sent to ${challengedNamePvP}.`, threadID);}
            catch (e) { const fMPvP = await api.sendMessage(`🔔 @${challengedNamePvP}, ${userName} challenges you! Reply "accept"/"decline".`, threadID, { mentions: [{ tag: `@${challengedNamePvP}`, id: challengedIDPvP }]}); global.GoatBot.onReply.set(fMPvP.messageID, { commandName: this.config.name, senderID: challengedIDPvP, type: "pvp_challenge_response", challengerID: userID, originalMID: fMPvP.messageID });}
        } else { api.sendMessage("Invalid battle type.", threadID); }
        break;
      case "status":
        let sMsgStatus = `🌟 ${userName}'s Status 🌟\n\n💰 Coins: ${userState.coins}\n`;
        if(userState.lastChallengeTime){const tsStatus=Date.now()-userState.lastChallengeTime;if(tsStatus<ONE_HOUR_MS){sMsgStatus+=`⏳ Next Challenge: ~${Math.ceil((ONE_HOUR_MS-tsStatus)/60000)} min\n`;}else{sMsgStatus+=`✅ Challenge Available!\n`;}}else{sMsgStatus+=`✅ Challenge Available!\n`;}
        if(userState.currentChallenge)sMsgStatus+=`❓ Active Challenge: ${userState.currentChallenge.name} (Reply to image or use "{pn} cancel challenge")\n`;
        if(userState.currentBattle){const oDStatus=userState.currentBattle.type==="ai"?userState.currentBattle.opponentName:await usersData.getName(userState.currentBattle.player1ID===userID?userState.currentBattle.player2ID:userState.currentBattle.player1ID);const pNStatus=userState.currentBattle.type==="ai"?userState.currentBattle.playerActivePokemonName:(userState.currentBattle.player1ID===userID?userState.currentBattle.player1ActivePokemonName:userState.currentBattle.player2ActivePokemonName);const pHStatus=userState.currentBattle.type==="ai"?userState.currentBattle.playerActivePokemonHP:(userState.currentBattle.player1ID===userID?userState.currentBattle.player1ActivePokemonHP:userState.currentBattle.player2ActivePokemonHP);const pMHStatus=userState.currentBattle.type==="ai"?userState.currentBattle.playerActivePokemonMaxHp:(userState.currentBattle.player1ID===userID?userState.currentBattle.player1ActivePokemonMaxHp:userState.currentBattle.player2ActivePokemonMaxHp);sMsgStatus+=`⚔️ Battle (${userState.currentBattle.type.toUpperCase()}): Vs ${oDStatus} (Your ${pNStatus} HP: ${pHStatus}/${pMHStatus})\n`;}else{sMsgStatus+=`✅ No active battle.\n`;}
        if(userState.pendingPvpChallenge&&userState.pendingPvpChallenge.challengerID===userID){sMsgStatus+=`⏳ Pending PvP Sent: To ${await usersData.getName(userState.pendingPvpChallenge.challengedUserID)}\n`;}
        else{ if (db) {const incomingStatus = await db.collection('pokemon_game_states').findOne({ "pendingPvpChallenge.challengedUserID": userID, "pendingPvpChallenge.challengerID": { $ne: userID} }); if (incomingStatus && incomingStatus.pendingPvpChallenge) { sMsgStatus+= `📩 Incoming PvP: From ${await usersData.getName(incomingStatus.pendingPvpChallenge.challengerID)}!\n`; } else if (!(userState.pendingPvpChallenge && userState.pendingPvpChallenge.challengerID === userID)) {sMsgStatus+=`✅ No pending PvP.\n`;}}}
        api.sendMessage(sMsgStatus,threadID);
        break;
      case "leaderboard":
        if (!db) return api.sendMessage("DB not connected.", threadID);
        const playersLB = await db.collection('pokemon_game_states').find({coins: {$exists: true, $type: "number" }}).sort({coins:-1}).limit(10).toArray();
        let lbMsgLB="🏆 Top Trainers 🏆\n\n";
        if(playersLB.length===0){lbMsgLB+="No players yet!";}
        else{for(let i=0;i<playersLB.length;i++){try{lbMsgLB+=`${i+1}. ${await usersData.getName(playersLB[i].userID) || `User ${playersLB[i].userID.slice(0,6)}`}: ${playersLB[i].coins||0} Coins\n`;}catch(e){lbMsgLB+=`${i+1}. User ${playersLB[i].userID.slice(0,6)}: ${playersLB[i].coins||0} Coins\n`;}}}
        api.sendMessage(lbMsgLB,threadID);
        break;
      default:
        api.sendMessage(this.config.guide.en.replace(/{pn}/g,this.config.name).replace('{pn} cancel challenge', `${api.PREFIX || global.config.PREFIX}${this.config.name} cancel challenge`),threadID);
        break;
    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    if (!db) return api.sendMessage("Database is not connected.", event.threadID);
    const userID = event.senderID; const threadID = event.threadID; const replySenderName = await usersData.getName(userID);
    if (Reply.senderID !== userID || Reply.commandName !== this.config.name) return;
    let userState = await getGameStateForUser(userID);
    if (!userState) return api.sendMessage("Error loading game data.", threadID);
    
    if (Reply.type === "challenge_answer") {
        if (!userState.currentChallenge || Reply.challengeData.name !== userState.currentChallenge.name) {
            if (userState.currentChallenge && userState.currentChallenge.messageID && Reply.originalMID === userState.currentChallenge.messageID) {
                 api.unsendMessage(Reply.originalMID).catch(e => console.warn("Challenge_answer: Minor error un-sending original reply, possibly already unsent:", e.message));
            }
            return api.sendMessage("Challenge expired, already answered, or invalid.", threadID);
        }
        
        if (userState.currentChallenge.timeoutID) { clearTimeout(parseInt(userState.currentChallenge.timeoutID)); } 
        if (userState.currentChallenge.messageID) { api.unsendMessage(userState.currentChallenge.messageID).catch(e => console.warn("Challenge_answer: Error un-sending challenge question:", e.message)); }

        const userAnswer = event.body.trim().toLowerCase(); const correctName = userState.currentChallenge.name.toLowerCase();
        if (userAnswer === correctName) {
            api.sendMessage(`🎉 Correct, ${replySenderName}! It was ${userState.currentChallenge.name}!`, threadID);
            let userPokemonsReply = await getUserPokemonCollectionList(userID);
            const caughtReply = { name: userState.currentChallenge.name, hp: parseInt(userState.currentChallenge.hp), maxHp: parseInt(userState.currentChallenge.hp), type: userState.currentChallenge.type, attack: parseInt(String(userState.currentChallenge.attack).replace(/\D/g,'')||'0'), imageUrl: userState.currentChallenge.originalImageUrl, id: `${userID}_${Date.now()}`};
            userPokemonsReply.push(caughtReply); await saveUserPokemonCollectionList(userID, userPokemonsReply);
            api.sendMessage(`🌟 ${caughtReply.name} added to collection!`, threadID);
            userState.coins = (userState.coins || 0) + 50; api.sendMessage(`💰 +50 Coins! Total: ${userState.coins}`, threadID);
        } else { api.sendMessage(`❌ Incorrect. Pokémon was ${userState.currentChallenge.name}.`, threadID); }
        
        userState.currentChallenge = null;
        userState.lastChallengeTime = Date.now(); 
        await saveGameStateForUser(userID, userState);
    }
    else if (Reply.type === "pvp_challenge_response") {
        try { if (Reply.originalMID) await api.unsendMessage(Reply.originalMID); } catch (e) { console.warn("PvP_resp: Error un-sending original reply:", e.message); }
        const responsePvP = event.body.trim().toLowerCase(); const challengerIDPvP = Reply.challengerID;
        let challengerStatePvP = await getGameStateForUser(challengerIDPvP);
        if (!challengerStatePvP || !challengerStatePvP.pendingPvpChallenge || challengerStatePvP.pendingPvpChallenge.challengedUserID !== userID) return api.sendMessage("Challenge invalid/expired.", threadID);
        const pendingDataPvP = { ...challengerStatePvP.pendingPvpChallenge };
        challengerStatePvP.pendingPvpChallenge = null; 
        if (responsePvP === "accept") {
            const cNamePvP = await usersData.getName(challengerIDPvP); const aNamePvP = replySenderName;
            api.sendMessage(`✅ ${aNamePvP} accepted ${cNamePvP}'s challenge! Starting...`, threadID);
            try { api.sendMessage(`✅ ${aNamePvP} accepted your challenge!`, challengerIDPvP); } catch(e){}
            let p1PokemonsPvP = await getUserPokemonCollectionList(challengerIDPvP); let p2PokemonsPvP = await getUserPokemonCollectionList(userID);
            if (p1PokemonsPvP.length === 0 || p2PokemonsPvP.length === 0) { api.sendMessage("One player has no Pokémon. Battle cancelled.", threadID); await saveGameStateForUser(challengerIDPvP, challengerStatePvP); return; }
            const p1ActivePvP = { ...p1PokemonsPvP[0], hp:parseInt(p1PokemonsPvP[0].hp),maxHp:parseInt(p1PokemonsPvP[0].maxHp),attack:parseInt(String(p1PokemonsPvP[0].attack).replace(/\D/g,'')||'0')};
            const p2ActivePvP = { ...p2PokemonsPvP[0], hp:parseInt(p2PokemonsPvP[0].hp),maxHp:parseInt(p2PokemonsPvP[0].maxHp),attack:parseInt(String(p2PokemonsPvP[0].attack).replace(/\D/g,'')||'0')};
            const battleDataPvP = {type:"pvp", player1ID:challengerIDPvP, player2ID:userID, player1ActivePokemonName:p1ActivePvP.name, player1ActivePokemonHP:p1ActivePvP.hp, player1ActivePokemonMaxHp:p1ActivePvP.maxHp, player1ActivePokemonType:p1ActivePvP.type, player1ActivePokemonAttack:p1ActivePvP.attack, player1PokemonIndex:0, player2ActivePokemonName:p2ActivePvP.name, player2ActivePokemonHP:p2ActivePvP.hp, player2ActivePokemonMaxHp:p2ActivePvP.maxHp, player2ActivePokemonType:p2ActivePvP.type, player2ActivePokemonAttack:p2ActivePvP.attack, player2PokemonIndex:0, currentTurn:challengerIDPvP};
            challengerStatePvP.currentBattle = battleDataPvP; userState.currentBattle = battleDataPvP;
            await saveGameStateForUser(challengerIDPvP, challengerStatePvP); await saveGameStateForUser(userID, userState);
            let pvpStartMsg = `⚔️ PvP: ${cNamePvP} vs ${aNamePvP}!\n\nP1(${cNamePvP}): ${p1ActivePvP.name}(HP ${p1ActivePvP.hp})\nP2(${aNamePvP}): ${p2ActivePvP.name}(HP ${p2ActivePvP.hp})\n\n${cNamePvP}'s turn! Reply "attack".`;
            const bstMsgPvP = await api.sendMessage(pvpStartMsg, threadID);
            try{ const ftMsgPvP = await api.sendMessage(`PvP vs ${aNamePvP} started! Your ${p1ActivePvP.name} vs ${p2ActivePvP.name}. Reply "attack".`, challengerIDPvP); global.GoatBot.onReply.set(ftMsgPvP.messageID,{commandName:this.config.name,senderID:challengerIDPvP,type:"battle_move",originalMID:ftMsgPvP.messageID}); }
            catch(e){global.GoatBot.onReply.set(bstMsgPvP.messageID,{commandName:this.config.name,senderID:challengerIDPvP,type:"battle_move",originalMID:bstMsgPvP.messageID});}
        } else if (responsePvP === "decline") { api.sendMessage(`❌ Declined challenge.`, threadID); try { api.sendMessage(`😔 ${replySenderName} declined.`, Reply.challengerID); } catch(e){} await saveGameStateForUser(challengerIDPvP, challengerStatePvP);
        } else { challengerStatePvP.pendingPvpChallenge = pendingDataPvP; await saveGameStateForUser(challengerIDPvP, challengerStatePvP); const rpMsgPvP = await api.sendMessage(`Invalid. "accept" or "decline".`, threadID); global.GoatBot.onReply.set(rpMsgPvP.messageID,{commandName:this.config.name,senderID:userID,type:"pvp_challenge_response",challengerID:Reply.challengerID,originalMID:rpMsgPvP.messageID});}
    }
    else if (Reply.type === "battle_move") {
        try { if (Reply.originalMID) await api.unsendMessage(Reply.originalMID); } catch (e) { console.warn("Battle_move: Error un-sending original reply:", e.message); }
        if (!userState.currentBattle) return api.sendMessage("No active battle.", threadID);
        let battleBM = userState.currentBattle;
        if (battleBM.currentTurn !== userID) return api.sendMessage(`Not your turn! Wait for ${await usersData.getName(battleBM.currentTurn)}.`, threadID);
        const userInputBM = event.body.trim().toLowerCase();
        if (userInputBM === "attack") {
            let attackerBM, defenderBM, attackerNameBM, defenderNameBM, attackerHPKeyBM, defenderHPKeyBM, nextTurnPlayerIDBM = null;
            let attackerActualIDBM, defenderActualIDBM, attackerCollectionIndexBM = 0, defenderCollectionIndexBM = 0;
            if (battleBM.type === "ai") { attackerBM = {name:battleBM.playerActivePokemonName,hp:battleBM.playerActivePokemonHP,maxHp:battleBM.playerActivePokemonMaxHp,type:battleBM.playerActivePokemonType,attack:battleBM.playerActivePokemonAttack}; defenderBM = {name:battleBM.opponentName,hp:battleBM.opponentHP,maxHp:battleBM.opponentMaxHp,type:battleBM.opponentType,attack:battleBM.opponentAttack}; attackerNameBM = replySenderName; defenderNameBM = `AI ${battleBM.opponentName}`; attackerHPKeyBM = 'playerActivePokemonHP'; defenderHPKeyBM = 'opponentHP'; attackerActualIDBM = userID; defenderActualIDBM = 'AI'; attackerCollectionIndexBM = battleBM.playerPokemonIndex;}
            else { const isP1AttackingBM = battleBM.player1ID === userID; attackerActualIDBM = userID; defenderActualIDBM = isP1AttackingBM ? battleBM.player2ID : battleBM.player1ID; nextTurnPlayerIDBM = defenderActualIDBM; attackerCollectionIndexBM = isP1AttackingBM ? battleBM.player1PokemonIndex : battleBM.player2PokemonIndex; defenderCollectionIndexBM = isP1AttackingBM ? battleBM.player2PokemonIndex : battleBM.player1PokemonIndex; attackerBM = isP1AttackingBM ? {name:battleBM.player1ActivePokemonName,hp:battleBM.player1ActivePokemonHP,maxHp:battleBM.player1ActivePokemonMaxHp,type:battleBM.player1ActivePokemonType,attack:battleBM.player1ActivePokemonAttack} : {name:battleBM.player2ActivePokemonName,hp:battleBM.player2ActivePokemonHP,maxHp:battleBM.player2ActivePokemonMaxHp,type:battleBM.player2ActivePokemonType,attack:battleBM.player2ActivePokemonAttack}; defenderBM = isP1AttackingBM ? {name:battleBM.player2ActivePokemonName,hp:battleBM.player2ActivePokemonHP,maxHp:battleBM.player2ActivePokemonMaxHp,type:battleBM.player2ActivePokemonType,attack:battleBM.player2ActivePokemonAttack} : {name:battleBM.player1ActivePokemonName,hp:battleBM.player1ActivePokemonHP,maxHp:battleBM.player1ActivePokemonMaxHp,type:battleBM.player1ActivePokemonType,attack:battleBM.player1ActivePokemonAttack}; attackerNameBM = await usersData.getName(attackerActualIDBM); defenderNameBM = await usersData.getName(defenderActualIDBM); attackerHPKeyBM = isP1AttackingBM ? 'player1ActivePokemonHP' : 'player2ActivePokemonHP'; defenderHPKeyBM = isP1AttackingBM ? 'player2ActivePokemonHP' : 'player1ActivePokemonHP';}
            const damageDealtBM = Math.max(1, Math.floor(attackerBM.attack * this.getTypeAdvantage(attackerBM.type, defenderBM.type))); battleBM[defenderHPKeyBM] = Math.max(0, battleBM[defenderHPKeyBM] - damageDealtBM);
            let battleMessageBM = `💥 ${attackerBM.name}(${attackerNameBM}) attacked ${defenderBM.name}(${defenderNameBM}) for ${damageDealtBM} damage!\n${defenderBM.name} has ${battleBM[defenderHPKeyBM]} HP.\n\n`;
            if (battleBM[defenderHPKeyBM] <= 0) {
                battleMessageBM += `🎉 ${defenderBM.name} fainted! ${attackerNameBM} wins!`; api.sendMessage(battleMessageBM, threadID);
                userState.coins = (userState.coins || 0) + (battleBM.type === "ai" ? 75 : 150);
                api.sendMessage(`💰 +${battleBM.type==="ai"?75:150} Coins!`, attackerActualIDBM === threadID ? threadID : attackerActualIDBM); 
                if(attackerActualIDBM !== threadID && battleBM.type === "pvp") api.sendMessage(`${attackerNameBM} won!`, threadID);
                userState.currentBattle = null; await saveGameStateForUser(attackerActualIDBM, userState);
                if (defenderActualIDBM !== 'AI') { let loserStateBM = await getGameStateForUser(defenderActualIDBM); loserStateBM.currentBattle = null; await saveGameStateForUser(defenderActualIDBM, loserStateBM); } return;
            }
            if (battleBM.type === "ai") {
                const aiDamageBM = Math.max(1, Math.floor(defenderBM.attack * this.getTypeAdvantage(defenderBM.type, attackerBM.type))); battleBM[attackerHPKeyBM] = Math.max(0, battleBM[attackerHPKeyBM] - aiDamageBM);
                battleMessageBM += `💢 ${defenderBM.name}(AI) attacked ${attackerBM.name} for ${aiDamageBM} damage!\nYou have ${battleBM[attackerHPKeyBM]} HP.\n\n`;
                if (battleBM[attackerHPKeyBM] <= 0) { battleMessageBM += `💔 You lost to AI.`; api.sendMessage(battleMessageBM, threadID); userState.currentBattle = null; await saveGameStateForUser(userID, userState); return; }
                let pokesBM = await getUserPokemonCollectionList(userID); if(pokesBM[attackerCollectionIndexBM]) { pokesBM[attackerCollectionIndexBM].hp = battleBM[attackerHPKeyBM]; await saveUserPokemonCollectionList(userID, pokesBM); }
                battleMessageBM += `Your turn! Reply "attack".`; const nAiRepBM = await api.sendMessage(battleMessageBM, threadID); global.GoatBot.onReply.set(nAiRepBM.messageID,{commandName:this.config.name,senderID:userID,type:"battle_move",originalMID:nAiRepBM.messageID}); userState.currentBattle = battleBM; await saveGameStateForUser(userID, userState);
            } else { // PvP
                battleBM.currentTurn = nextTurnPlayerIDBM;
                let pokesAttackerPvP = await getUserPokemonCollectionList(attackerActualIDBM); if(pokesAttackerPvP[attackerCollectionIndexBM]) { pokesAttackerPvP[attackerCollectionIndexBM].hp = battleBM[attackerHPKeyBM]; await saveUserPokemonCollectionList(attackerActualIDBM, pokesAttackerPvP); }
                let pokesDefenderPvP = await getUserPokemonCollectionList(defenderActualIDBM); if(pokesDefenderPvP[defenderCollectionIndexBM]) { pokesDefenderPvP[defenderCollectionIndexBM].hp = battleBM[defenderHPKeyBM]; await saveUserPokemonCollectionList(defenderActualIDBM, pokesDefenderPvP); }
                let attackerStatePvP = await getGameStateForUser(attackerActualIDBM); attackerStatePvP.currentBattle = battleBM; await saveGameStateForUser(attackerActualIDBM, attackerStatePvP);
                let defenderStatePvP = await getGameStateForUser(defenderActualIDBM); defenderStatePvP.currentBattle = battleBM; await saveGameStateForUser(defenderActualIDBM, defenderStatePvP);
                const nextTurnUNBM = await usersData.getName(nextTurnPlayerIDBM); battleMessageBM += `It's ${nextTurnUNBM}'s turn!`; api.sendMessage(battleMessageBM, threadID);
                const nextAttackerDetsBM = (battleBM.player1ID===nextTurnPlayerIDBM)?{n:battleBM.player1ActivePokemonName,h:battleBM.player1ActivePokemonHP,mH:battleBM.player1ActivePokemonMaxHp}:{n:battleBM.player2ActivePokemonName,h:battleBM.player2ActivePokemonHP,mH:battleBM.player2ActivePokemonMaxHp};
                const currentAttackerBecomesDefDetsBM = (battleBM.player1ID===userID)?{n:battleBM.player1ActivePokemonName,h:battleBM.player1ActivePokemonHP}:{n:battleBM.player2ActivePokemonName,h:battleBM.player2ActivePokemonHP};
                const promptNextBM = `Your turn, ${nextTurnUNBM}!\nYour ${nextAttackerDetsBM.n}(HP ${nextAttackerDetsBM.h}/${nextAttackerDetsBM.mH})\nOpponent(${replySenderName}): ${currentAttackerBecomesDefDetsBM.n}(HP ${currentAttackerBecomesDefDetsBM.h})\nReply "attack".`;
                try{const nPvPRepBM=await api.sendMessage(promptNextBM,nextTurnPlayerIDBM);global.GoatBot.onReply.set(nPvPRepBM.messageID,{commandName:this.config.name,senderID:nextTurnPlayerIDBM,type:"battle_move",originalMID:nPvPRepBM.messageID});}
                catch(e){ const fbRepBM = await api.sendMessage(`@${nextTurnUNBM}, ${promptNextBM}`,threadID,{mentions:[{tag:`@${nextTurnUNBM}`,id:nextTurnPlayerIDBM}]}); global.GoatBot.onReply.set(fbRepBM.messageID,{commandName:this.config.name,senderID:nextTurnPlayerIDBM,type:"battle_move",originalMID:fbRepBM.messageID});}
            }
        } else { 
            api.sendMessage(`Invalid action. Reply "attack".`, threadID);
            let cANP, cAHPP, cAMHPP; 
            if (battleBM.type === "ai" || (battleBM.player1ID === userID)) { cANP = battleBM.playerActivePokemonName || battleBM.player1ActivePokemonName; cAHPP = battleBM.playerActivePokemonHP || battleBM.player1ActivePokemonHP; cAMHPP = battleBM.playerActivePokemonMaxHp || battleBM.player1ActivePokemonMaxHp;
            } else { cANP = battleBM.player2ActivePokemonName; cAHPP = battleBM.player2ActivePokemonHP; cAMHPP = battleBM.player2ActivePokemonMaxHp; }
            const rMsg = await api.sendMessage(`Your turn, ${replySenderName}! Your ${cANP} (HP ${cAHPP}/${cAMHPP}). Reply "attack".`, threadID);
            global.GoatBot.onReply.set(rMsg.messageID, { commandName: this.config.name, senderID: userID, type: "battle_move", originalMID: rMsg.messageID });
        }
    }
  }
};
