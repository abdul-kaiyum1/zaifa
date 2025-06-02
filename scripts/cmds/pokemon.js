const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require('canvas');
const { MongoClient } = require('mongodb');

// --- MongoDB Setup ---
const mongoURI = "mongodb+srv://abdulkaiyum:abdulkaiyum5426@octa.elx1m1f.mongodb.net/GoatBotV2?retryWrites=true&w=majority&appName=octa"; // Ensure this URI is correct and working
const dbName = 'GoatBotV2';
let db;

MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(client => {
    db = client.db(dbName);
    console.log('Pokémon Command: Connected to MongoDB successfully!');
    db.collection('pokemon_game_states').createIndex({ userID: 1 }, { background: true }).catch(err => console.error("Error creating index for pokemon_game_states:", err));
    db.collection('pokemon_user_collections').createIndex({ userID: 1 }, { background: true }).catch(err => console.error("Error creating index for pokemon_user_collections:", err));
})
.catch(error => console.error('Pokémon Command: Error connecting to MongoDB:', error));

// --- Constants ---
const ONE_HOUR_MS = 30 * 60 * 1000;
const CHALLENGE_TIMEOUT_MS = 60 * 1000; // 1 minute for name challenge
const PVP_ACCEPT_TIMEOUT_MS = CHALLENGE_TIMEOUT_MS * 2; // 2 minutes for PvP acceptance
const POKEMON_TCG_API_KEY = '4b2b15c7-27f0-4c3e-aa24-8474d551500c'; // <<<< REPLACE THIS!
const NAME_OBSCURE_AREA = { x: 0.1, y: 0.04, width: 0.8, height: 0.08, color: 'black' };
const CACHE_FOLDER_PATH = path.join(__dirname, 'cache');
fs.ensureDirSync(CACHE_FOLDER_PATH);

const STATUS_CONDITIONS = {
    POISONED: 'poisoned', PARALYZED: 'paralyzed', ASLEEP: 'asleep',
    CONFUSED: 'confused', BURNED: 'burned'
};
const POISON_DAMAGE = 10;
const BURN_DAMAGE = 20;
const CONFUSION_SELF_DAMAGE = 20;

// --- Helper Functions ---
async function obscurePokemonName(imageUrl, obscureAreaConfig) {
    try {
        const image = await loadImage(imageUrl);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const rectX = obscureAreaConfig.x * image.width; const rectY = obscureAreaConfig.y * image.height;
        const rectWidth = obscureAreaConfig.width * image.width; const rectHeight = obscureAreaConfig.height * image.height;
        ctx.fillStyle = obscureAreaConfig.color || 'black'; ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        return canvas.toBuffer('image/png');
    } catch (error) { console.error(`Error obscuring Pokémon name (URL: ${imageUrl}):`, error.message); return null; }
}

function parseAttacksFromAPI(apiAttacks) {
    if (!apiAttacks || apiAttacks.length === 0) return [];
    return apiAttacks.map(attack => {
        let effect = null; const effectText = (attack.text || "").toLowerCase(); const nameText = (attack.name || "").toLowerCase();
        if (effectText.includes("poisoned") || nameText.includes("poison")) effect = { type: STATUS_CONDITIONS.POISONED, chance: 1.0 };
        else if (effectText.includes("paralyzed") || nameText.includes("paralyz")) effect = { type: STATUS_CONDITIONS.PARALYZED, chance: 0.5 };
        else if (effectText.includes("asleep") || nameText.includes("sleep")) effect = { type: STATUS_CONDITIONS.ASLEEP, chance: 1.0 };
        else if (effectText.includes("confused") || nameText.includes("confuse")) effect = { type: STATUS_CONDITIONS.CONFUSED, chance: 1.0 };
        else if (effectText.includes("burned") || nameText.includes("burn")) effect = { type: STATUS_CONDITIONS.BURNED, chance: 1.0 };

        let damageString = String(attack.damage || "0");
        let baseDamage = parseInt(damageString.replace(/[^0-9].*$/, "")) || 0;

        return {
            name: attack.name || "Unknown Attack", damage: baseDamage, damageString: attack.damage || "0",
            text: attack.text || "", cost: attack.cost || [], effect: effect
        };
    }).slice(0, 4); // Max 4 moves displayed for simplicity
}

// --- MongoDB Data Access Functions ---
async function getGameStateForUser(userID) {
    if (!db) { console.error("DB not connected: getGameStateForUser"); return null; }
    const collection = db.collection('pokemon_game_states');
    let userState = await collection.findOne({ userID: userID });
    const defaultState = { userID: userID, coins: 100, currentChallenge: null, currentBattle: null, pendingPvpChallenge: null, lastChallengeTime: null };
    if (!userState) { return defaultState; }
    return { ...defaultState, ...userState };
}

async function saveGameStateForUser(userID, userState) {
    if (!db) { console.error("DB not connected: saveGameStateForUser"); return; }
    const collection = db.collection('pokemon_game_states');
    const stateToSave = {
        userID: userID, coins: userState.coins || 0,
        currentChallenge: userState.currentChallenge || null, currentBattle: userState.currentBattle || null,
        pendingPvpChallenge: userState.pendingPvpChallenge || null, lastChallengeTime: userState.lastChallengeTime || null
    };
    await collection.updateOne({ userID: userID }, { $set: stateToSave }, { upsert: true });
}

async function getUserPokemonCollectionList(userID) {
    if (!db) { console.error("DB not connected: getUserPokemonCollectionList"); return []; }
    const collection = db.collection('pokemon_user_collections');
    const userPokemonsDoc = await collection.findOne({ userID: userID });
    return userPokemonsDoc ? userPokemonsDoc.pokemons || [] : [];
}

async function saveUserPokemonCollectionList(userID, pokemonsList) {
    if (!db) { console.error("DB not connected: saveUserPokemonCollectionList"); return; }
    const collection = db.collection('pokemon_user_collections');
    await collection.updateOne({ userID: userID }, { $set: { userID: userID, pokemons: pokemonsList } }, { upsert: true });
}

// --- Main Module ---
const cmdModule = {
    config: {
        name: "pokemon",
        aliases: ["pkmn", "game"],
        version: "1.3.3", // Incremented version
        author: "Abdul Kaiyum",
        countDown: 5, role: 0,
        shortDescription: { en: "Pokémon game with moves, status, battle cancel, timeout, MongoDB." },
        longDescription: { en: "Full Pokémon TCG game experience with selectable moves and basic status effects. All data stored in MongoDB. Challenges hide names, timeout if no reply, or can be cancelled. Battles can also be cancelled." },
        category: "pokemon",
        guide: { en: `Usage:\n• {pn} challenge\n• {pn} cancel challenge (for name identification)\n• {pn} cancel battle (for ongoing battles)\n• {pn} cancel pvp (to cancel a PvP challenge you sent)\n• {pn} battle ai\n• {pn} battle pvp <@user>\n• {pn} status\n• {pn} leaderboard` }
    },

    async getPokemonDetailsFromAPI(pokemonName) {
        try {
            const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(pokemonName)}"`, { headers: { 'X-Api-Key': POKEMON_TCG_API_KEY } });
            const card = response.data.data.find(c => c.name.toLowerCase() === pokemonName.toLowerCase()) || response.data.data[0];
            if (card) {
                return {
                    id: card.id, name: card.name, type: card.types ? card.types[0] : "N/A", // Primary type
                    hp: card.hp || "N/A", rarity: card.rarity || "N/A", set: card.set?.name || "N/A",
                    attacks: parseAttacksFromAPI(card.attacks),
                    abilities: card.abilities ? card.abilities.map(a => `${a.name}: ${a.text}`).join('\\n') : "N/A",
                    imageUrl: card.images?.large
                };
            } return null;
        } catch (error) { console.error(`Error fetching Pokémon details for ${pokemonName}:`, error.message); return null; }
    },

    async getRandomPokemonForBattleSetup() {
        try {
            const types = ["fire", "water", "grass", "lightning", "fighting", "psychic", "darkness", "metal", "fairy", "dragon", "colorless"];
            const randomType = types[Math.floor(Math.random() * types.length)];
            const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=types:${randomType} supertype:pokemon`, { headers: { 'X-Api-Key': POKEMON_TCG_API_KEY }, params: { pageSize: 50 } });
            const playableCards = response.data.data.filter(card => card.supertype === "Pokémon" && card.images && card.images.large && card.hp && !isNaN(parseInt(card.hp)) && card.attacks && card.attacks.length > 0);
            if (playableCards.length > 0) {
                const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
                return {
                    name: randomCard.name, imageUrl: randomCard.images.large,
                    hp: parseInt(randomCard.hp), maxHp: parseInt(randomCard.hp),
                    type: randomCard.types && randomCard.types.length > 0 ? randomCard.types[0] : "Colorless",
                    attacks: parseAttacksFromAPI(randomCard.attacks),
                    status: null
                };
            }
            console.warn("No playable cards found for battle setup."); return null;
        } catch (error) { console.error("Error fetching random Pokémon for battle setup:", error.message); return null; }
    },

    async getRandomPokemonForChallengeDisplay() {
        const pokemonData = await this.getRandomPokemonForBattleSetup();
        if (!pokemonData) return null;
        let imageBuffer = null;
        if (pokemonData.imageUrl) {
            imageBuffer = await obscurePokemonName(pokemonData.imageUrl, NAME_OBSCURE_AREA);
        }
        return { ...pokemonData, imageBuffer };
    },

    getTypeAdvantage(attackingType, defendingType) {
        const advantages = {"Fire":{"weakTo":["Water"],"strongAgainst":["Grass","Metal"]},"Water":{"weakTo":["Lightning","Grass"],"strongAgainst":["Fire","Fighting"]},"Grass":{"weakTo":["Fire","Psychic"],"strongAgainst":["Water","Fighting"]},"Lightning":{"weakTo":["Fighting"],"strongAgainst":["Water","Colorless"]},"Fighting":{"weakTo":["Psychic","Fairy"],"strongAgainst":["Darkness","Metal","Colorless"]},"Psychic":{"weakTo":["Darkness","Psychic"],"strongAgainst":["Fighting","Grass"]},"Darkness":{"weakTo":["Fighting","Fairy"],"strongAgainst":["Psychic"]},"Colorless":{"weakTo":["Fighting","Lightning"],"strongAgainst":[]},"Metal":{"weakTo":["Fire","Fighting"],"strongAgainst":["Fairy","Water"]},"Fairy":{"weakTo":["Metal","Darkness"],"strongAgainst":["Fighting","Dragon","Darkness"]},"Dragon":{"weakTo":["Fairy","Dragon"],"strongAgainst":["Dragon"]}};
        // Ensure types are capitalized for lookup as keys in `advantages` are capitalized
        const capAttackingType = attackingType ? attackingType.charAt(0).toUpperCase() + attackingType.slice(1) : null;
        const capDefendingType = defendingType ? defendingType.charAt(0).toUpperCase() + defendingType.slice(1) : null;

        const attackerInfo=advantages[capAttackingType];
        const defenderInfo=advantages[capDefendingType];

        if(attackerInfo?.strongAgainst?.includes(capDefendingType)) return 2; // Super effective
        if(defenderInfo?.weakTo?.includes(capAttackingType)) return 2; // Also super effective (defender is weak)
        
        if(attackerInfo?.weakTo?.includes(capDefendingType)) return 0.5; // Not very effective
        // No specific check for defender being strong against attacker, as that's covered by attacker being weak.
        
        return 1; // Normal effectiveness
    },

    onStart: async function ({ api, event, args, usersData }) {
        if (!db) {
            try {
                let attempts = 0;
                while (!db && attempts < 5) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    attempts++;
                }
                if (!db) return api.sendMessage("⏳ Database is initializing... Please try again in a moment.", event.threadID);
            } catch (e) {
                return api.sendMessage("❌ Database connection error. Please contact an admin.", event.threadID);
            }
        }

        const userID = event.senderID;
        const threadID = event.threadID;
        const userName = await usersData.getName(userID); 
        let userState = await getGameStateForUser(userID);

        if (!userState) { 
            userState = { userID: userID, coins: 100, currentChallenge: null, currentBattle: null, pendingPvpChallenge: null, lastChallengeTime: null };
        }

        const command = args[0]?.toLowerCase();
        const subCommand = args[1]?.toLowerCase(); 

        let currentPrefix = "!"; 
        if (global.utils && typeof global.utils.getPrefix === 'function') {
            try { const threadPrefix = await global.utils.getPrefix(threadID); if (threadPrefix) currentPrefix = threadPrefix; }
            catch (e) { console.warn("Could not get thread prefix:", e.message); }
        } else if (global.config && global.config.PREFIX) {
            currentPrefix = global.config.PREFIX;
        } else if (api && api.PREFIX) {
            currentPrefix = api.PREFIX;
        }

        if (command === "cancel") {
            const cancelType = args[1]?.toLowerCase(); 
            if (cancelType === "challenge") { 
                if (userState.currentChallenge) {
                    if (userState.currentChallenge.timeoutID) {
                        clearTimeout(parseInt(userState.currentChallenge.timeoutID));
                    }
                    if (userState.currentChallenge.messageID) {
                        api.unsendMessage(userState.currentChallenge.messageID).catch(e => console.warn("Cancel Name Challenge: Error un-sending original message:", e.message));
                    }
                    userState.currentChallenge = null;
                    await saveGameStateForUser(userID, userState);
                    return api.sendMessage("✅ Your active Pokémon identification challenge has been cancelled.", threadID);
                } else {
                    return api.sendMessage("You don't have an active Pokémon identification challenge to cancel.", threadID);
                }
            } else if (cancelType === "battle") { 
                if (userState.currentBattle) {
                    const battleToEnd = { ...userState.currentBattle }; 
                    const battleType = battleToEnd.type;
                    const p1ID = battleToEnd.player1ID;
                    const p2ID = battleToEnd.player2ID;

                    userState.currentBattle = null;
                    await saveGameStateForUser(userID, userState);
                    api.sendMessage(`✅ ${userName}, you have cancelled the ongoing battle.`, threadID);

                    if (battleType === "pvp") {
                        const opponentID = (p1ID === userID) ? p2ID : p1ID;
                        if (opponentID) {
                            let opponentState = await getGameStateForUser(opponentID);
                            if (opponentState && opponentState.currentBattle && 
                                ((opponentState.currentBattle.player1ID === p1ID && opponentState.currentBattle.player2ID === p2ID) ||
                                 (opponentState.currentBattle.player1ID === p2ID && opponentState.currentBattle.player2ID === p1ID)) ) {
                                opponentState.currentBattle = null;
                                await saveGameStateForUser(opponentID, opponentState);
                                try { api.sendMessage(`ℹ️ ${userName} has cancelled your PvP battle.`, opponentID); } 
                                catch(e) { console.warn("Failed to notify opponent of battle cancellation via DM", e.message); }
                            }
                        }
                    }
                    return; 
                } else {
                    return api.sendMessage("You are not in an active battle to cancel.", threadID);
                }
            } else if (cancelType === "pvp") { 
                if (userState.pendingPvpChallenge && userState.pendingPvpChallenge.challengerID === userID) {
                    const challengedUserName = await usersData.getName(userState.pendingPvpChallenge.challengedUserID);
                    if (userState.pendingPvpChallenge.acceptTimeoutID) { 
                        clearTimeout(parseInt(userState.pendingPvpChallenge.acceptTimeoutID));
                    }
                    userState.pendingPvpChallenge = null;
                    await saveGameStateForUser(userID, userState);
                    return api.sendMessage(`Your sent PvP challenge to ${challengedUserName} has been cancelled.`, threadID);
                } else {
                    return api.sendMessage("You do not have a pending sent PvP challenge to cancel.", threadID);
                }
            } else {
                return api.sendMessage(`Invalid cancel type. Use: "${currentPrefix}pokemon cancel challenge", "${currentPrefix}pokemon cancel battle", or "${currentPrefix}pokemon cancel pvp".`, threadID);
            }
        }


        if (userState.currentChallenge) { return api.sendMessage(`You have an active Pokémon identification challenge! Reply to its image or use "${currentPrefix}${this.config.name} cancel challenge".`, threadID); }
        if (userState.currentBattle) {
            let battleMsg = `⚔️ You are currently in an ongoing battle! ⚔️\n\n`;
            const opponentPlayerID = userState.currentBattle.player1ID === userID ? userState.currentBattle.player2ID : userState.currentBattle.player1ID;
            const opponentDisplayName = userState.currentBattle.type === "ai" ? userState.currentBattle.opponentName : await usersData.getName(opponentPlayerID);
            battleMsg += `Your opponent: ${opponentDisplayName}.\n`;
            battleMsg += `It's currently ${userState.currentBattle.currentTurn === userID ? "your" : (await usersData.getName(userState.currentBattle.currentTurn)) + "'s"} turn.\n`;
            battleMsg += `You can use "${currentPrefix}${this.config.name} cancel battle" to forfeit.`;
            return api.sendMessage(battleMsg, threadID);
        }
        if (userState.pendingPvpChallenge && userState.pendingPvpChallenge.challengerID === userID) { 
            const cUserName = await usersData.getName(userState.pendingPvpChallenge.challengedUserID); 
            let msg = `⏳ Pending PvP challenge sent to ${cUserName}. Waiting for their response. You can use "${currentPrefix}pokemon cancel pvp" to withdraw it.`;
            if (userState.pendingPvpChallenge.challengeSentTime) {
                const timeElapsed = Date.now() - userState.pendingPvpChallenge.challengeSentTime;
                const timeRemaining = PVP_ACCEPT_TIMEOUT_MS - timeElapsed;
                if (timeRemaining > 0) {
                    msg += ` (Expires in ~${Math.ceil(timeRemaining / 60000)} min)`;
                } else {
                    userState.pendingPvpChallenge = null;
                    await saveGameStateForUser(userID, userState);
                    msg = `Your previous PvP challenge to ${cUserName} has expired.`; 
                }
            }
            return api.sendMessage(msg, threadID); 
        }
        if (db) { 
            const incomingChallenge = await db.collection('pokemon_game_states').findOne({ 
                "pendingPvpChallenge.challengedUserID": userID, 
                "pendingPvpChallenge.challengerID": { $ne: userID } 
            }); 
            if (incomingChallenge && incomingChallenge.pendingPvpChallenge) { 
                const challengerName = await usersData.getName(incomingChallenge.pendingPvpChallenge.challengerID); 
                const timeSinceSent = Date.now() - (incomingChallenge.pendingPvpChallenge.challengeSentTime || 0);
                if (timeSinceSent < PVP_ACCEPT_TIMEOUT_MS) {
                    return api.sendMessage(`📩 Incoming PvP challenge from ${challengerName}! Reply to their challenge message with "accept" or "decline".`, threadID);
                }
            }
        }


        switch (command) {
            case "challenge":
                if (userState.lastChallengeTime && (Date.now() - userState.lastChallengeTime < ONE_HOUR_MS)) {
                    const timeLeftMs = ONE_HOUR_MS - (Date.now() - userState.lastChallengeTime);
                    return api.sendMessage(`⏳ New name challenge available in ~${Math.ceil(timeLeftMs / 60000)} min.`, threadID);
                }
                api.sendMessage("⏳ Generating Pokémon name challenge (name hidden, 1 min to reply)...", threadID);
                const challengePokemon = await this.getRandomPokemonForChallengeDisplay();
                if (challengePokemon) {
                    userState.currentChallenge = {
                        name: challengePokemon.name, hp: challengePokemon.hp, type: challengePokemon.type,
                        attacks: challengePokemon.attacks, 
                        originalImageUrl: challengePokemon.imageUrl,
                        messageID: null, timeoutID: null
                    };
                    await saveGameStateForUser(userID, userState);

                    let attachment = null; let messageBody = `❓ Daily Challenge! Name this Pokémon! (Name area hidden)`;
                    let tempImagePath = null;

                    if (challengePokemon.imageBuffer) {
                        try {
                            tempImagePath = path.join(CACHE_FOLDER_PATH, `challenge_${userID}_${Date.now()}.png`);
                            fs.writeFileSync(tempImagePath, challengePokemon.imageBuffer);
                            attachment = fs.createReadStream(tempImagePath);
                        } catch (writeError) {
                            console.error("Error writing image buffer to temp file:", writeError);
                            attachment = null; tempImagePath = null;
                            if (challengePokemon.imageUrl) {
                                messageBody = `❓ Daily Challenge! Name this Pokémon! (Processing error, using original).`;
                                try { if (global.utils && typeof global.utils.getStreamFromURL === 'function') { attachment = await global.utils.getStreamFromURL(challengePokemon.imageUrl); } else { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }} catch (e) { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }
                            }
                        }
                    } else if (challengePokemon.imageUrl) {
                        messageBody = `❓ Daily Challenge! Name this Pokémon! (Could not hide name).`;
                        try { if (global.utils && typeof global.utils.getStreamFromURL === 'function') { attachment = await global.utils.getStreamFromURL(challengePokemon.imageUrl); } else { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }} catch (e) { messageBody += `\nURL: ${challengePokemon.imageUrl}`; }
                    }

                    if (attachment) {
                        api.sendMessage({ body: messageBody, attachment: attachment }, threadID, async (err, msgInfo) => {
                            if (tempImagePath) { fs.unlink(tempImagePath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting temp challenge image:", unlinkErr); }); }
                            if (err) {
                                console.error("Error sending challenge message:", err);
                                let currentS = await getGameStateForUser(userID);
                                if(currentS && currentS.currentChallenge && currentS.currentChallenge.name === challengePokemon.name) {
                                    currentS.currentChallenge = null;
                                    await saveGameStateForUser(userID, currentS);
                                }
                                return;
                            }
                            let currentState = await getGameStateForUser(userID);
                            if (currentState && currentState.currentChallenge && currentState.currentChallenge.name === challengePokemon.name && !currentState.currentChallenge.messageID) {
                                currentState.currentChallenge.messageID = msgInfo.messageID;
                                const nameChallengeTimeoutID = setTimeout(async () => {
                                    let timedOutState = await getGameStateForUser(userID);
                                    if (timedOutState && timedOutState.currentChallenge && timedOutState.currentChallenge.messageID === msgInfo.messageID) {
                                        api.unsendMessage(msgInfo.messageID).catch(unsendErr => console.error("Failed to unsend timed-out name challenge:", unsendErr));
                                        api.sendMessage(`⏰ Time's up for Pokémon name challenge! Removed. Try again.`, threadID);
                                        timedOutState.currentChallenge = null;
                                        await saveGameStateForUser(userID, timedOutState); 
                                    }
                                }, CHALLENGE_TIMEOUT_MS);
                                currentState.currentChallenge.timeoutID = nameChallengeTimeoutID.toString();
                                await saveGameStateForUser(userID, currentState);
                                global.GoatBot.onReply.set(msgInfo.messageID, { commandName: this.config.name, senderID: userID, challengeData: currentState.currentChallenge, type: "challenge_answer", originalMID: msgInfo.messageID });
                            }
                        });
                    } else {
                        userState.currentChallenge = null; await saveGameStateForUser(userID, userState);
                        messageBody = `❓ Identify: ${challengePokemon.name}. (Image failed). Reply name!`; if(challengePokemon.imageUrl) messageBody += `\nOriginal: ${challengePokemon.imageUrl}`;
                        const rMNA = await api.sendMessage(messageBody, threadID);
                        global.GoatBot.onReply.set(rMNA.messageID, { commandName: this.config.name, senderID: userID, challengeData: {name: challengePokemon.name, originalImageUrl: challengePokemon.imageUrl, hp: challengePokemon.hp, type: challengePokemon.type, attacks: challengePokemon.attacks }, type: "challenge_answer", originalMID: rMNA.messageID });
                    }
                } else { api.sendMessage("❌ Name challenge generation failed.", threadID); }
                break;

            case "battle":
                let userPokemonsForBattle = await getUserPokemonCollectionList(userID);
                if (userPokemonsForBattle.length === 0) return api.sendMessage(`You have no Pokémon to battle! Complete challenges first.`, threadID);

                const firstOwnedPokemon = userPokemonsForBattle[0];
                let playerActivePokemonDetails = await this.getPokemonDetailsFromAPI(firstOwnedPokemon.name);

                if (!playerActivePokemonDetails || !playerActivePokemonDetails.attacks || playerActivePokemonDetails.attacks.length === 0) {
                    console.warn(`Could not get details/attacks for user's Pokemon ${firstOwnedPokemon.name}, getting a random one for them.`);
                    playerActivePokemonDetails = await this.getRandomPokemonForBattleSetup();
                    if (!playerActivePokemonDetails) return api.sendMessage("❌ Could not prepare your Pokémon for battle. Try again.", threadID);
                }
                 const playerPokemonForBattle = {
                    name: playerActivePokemonDetails.name,
                    hp: parseInt(playerActivePokemonDetails.hp),
                    maxHp: parseInt(playerActivePokemonDetails.hp),
                    type: playerActivePokemonDetails.type, 
                    attacks: playerActivePokemonDetails.attacks,
                    status: null
                };

                if (!subCommand) return api.sendMessage(`Specify battle type: "${currentPrefix}${this.config.name} battle ai" or "${currentPrefix}${this.config.name} battle pvp @user".`, threadID);

                if (subCommand === "ai") {
                    api.sendMessage("⏳ Setting up AI battle...", threadID);
                    const opponentAI = await this.getRandomPokemonForBattleSetup();
                    if (!opponentAI) return api.sendMessage("❌ Failed to set up AI opponent. Please try again.", threadID);

                    userState.currentBattle = {
                        type: "ai",
                        player1ID: userID, 
                        playerActivePokemonName: playerPokemonForBattle.name,
                        playerActivePokemonHP: playerPokemonForBattle.hp,
                        playerActivePokemonMaxHp: playerPokemonForBattle.maxHp,
                        playerActivePokemonType: playerPokemonForBattle.type,
                        playerActivePokemonMoves: playerPokemonForBattle.attacks,
                        playerActivePokemonStatus: null,
                        opponentName: opponentAI.name,
                        opponentHP: opponentAI.hp,
                        opponentMaxHp: opponentAI.maxHp,
                        opponentType: opponentAI.type,
                        opponentMoves: opponentAI.attacks,
                        opponentStatus: null,
                        currentTurn: userID
                    };
                    await saveGameStateForUser(userID, userState);

                    let msgAI = `⚔️ ${userName} vs ${userState.currentBattle.opponentName} (AI) ⚔️\n\n`;
                    msgAI += `Your ${playerPokemonForBattle.name} (${playerPokemonForBattle.type} - HP ${playerPokemonForBattle.hp}/${playerPokemonForBattle.maxHp})\n`;
                    msgAI += `AI's ${opponentAI.name} (${opponentAI.type} - HP ${opponentAI.hp}/${opponentAI.maxHp})\n\n`;
                    msgAI += `--- Your Turn, ${userName}! ---\nChoose a move:\n`;
                    (playerPokemonForBattle.attacks || []).forEach((move, index) => {
                        msgAI += `${index + 1}. ${move.name} (Dmg: ${move.damageString || '0'})${move.text ? ` - ${move.text.substring(0,30)}...` : ''}\n`;
                    });
                    msgAI += `Reply with move number.`;

                    const rMAI = await api.sendMessage(msgAI, threadID);
                    global.GoatBot.onReply.set(rMAI.messageID, { commandName: this.config.name, senderID: userID, type: "battle_move", originalMID: rMAI.messageID });

                } else if (subCommand === "pvp") {
                    const mentionsPvP = Object.keys(event.mentions);
                    if (mentionsPvP.length === 0) return api.sendMessage(`Tag a player to challenge for PvP! e.g., "${currentPrefix}${this.config.name} battle pvp @user"`, threadID);
                    const challengedIDPvP = mentionsPvP[0];
                    if (challengedIDPvP === userID) return api.sendMessage("You cannot challenge yourself!", threadID);

                    const challengedNamePvP = await usersData.getName(challengedIDPvP);
                    let challengedStatePvP = await getGameStateForUser(challengedIDPvP);
                    if (challengedStatePvP.currentBattle || challengedStatePvP.currentChallenge || challengedStatePvP.pendingPvpChallenge) return api.sendMessage(`${challengedNamePvP} is currently busy. Try again later.`, threadID);
                    
                    const existingSentChallenge = await db.collection('pokemon_game_states').findOne({ "pendingPvpChallenge.challengerID": userID });
                    if (existingSentChallenge && existingSentChallenge.pendingPvpChallenge) {
                         return api.sendMessage(`You already have a pending PvP challenge sent to ${await usersData.getName(existingSentChallenge.pendingPvpChallenge.challengedUserID)}. Please wait or cancel it using "${currentPrefix}pokemon cancel pvp".`, threadID);
                    }

                    let challengedPokemonsPvP = await getUserPokemonCollectionList(challengedIDPvP);
                    if (challengedPokemonsPvP.length === 0) return api.sendMessage(`${challengedNamePvP} has no Pokémon to battle with!`, threadID);
                    
                    const pvpAcceptTimeoutID = setTimeout(async () => {
                        let currentChallengerState = await getGameStateForUser(userID); 
                        if (currentChallengerState && 
                            currentChallengerState.pendingPvpChallenge && 
                            currentChallengerState.pendingPvpChallenge.challengedUserID === challengedIDPvP &&
                            currentChallengerState.pendingPvpChallenge.challengerID === userID) { 
                            
                            const originalChallengedName = await usersData.getName(challengedIDPvP); 
                            const originalChallengerName = await usersData.getName(userID);

                            console.log(`PvP Challenge from ${originalChallengerName} to ${originalChallengedName} timed out.`);
                            try {
                                await api.sendMessage(`Your PvP challenge to ${originalChallengedName} has expired as they did not respond in time.`, userID); 
                            } catch (e) { console.warn("Failed to DM challenger about PvP timeout", e.message)}
                            
                            const challengeOriginThread = currentChallengerState.pendingPvpChallenge.threadID;
                            if (challengeOriginThread && challengeOriginThread !== userID) { 
                                 try {
                                    await api.sendMessage(`The PvP challenge from ${originalChallengerName} to ${originalChallengedName} in this chat has expired due to no response.`, challengeOriginThread);
                                 } catch (e) { console.warn("Failed to inform original thread about PvP timeout", e.message)}
                            }
                            currentChallengerState.pendingPvpChallenge = null;
                            await saveGameStateForUser(userID, currentChallengerState);
                        }
                    }, PVP_ACCEPT_TIMEOUT_MS);

                    userState.pendingPvpChallenge = {
                        challengerID: userID,
                        challengedUserID: challengedIDPvP,
                        threadID: threadID, 
                        challengerPokemonDetails: playerPokemonForBattle,
                        challengeSentTime: Date.now(),
                        acceptTimeoutID: pvpAcceptTimeoutID.toString()
                    };
                    await saveGameStateForUser(userID, userState);

                    const cMsgPvP = `🔔 ${userName} has challenged you (${challengedNamePvP}) to a Pokémon battle! Reply to this message with "accept" or "decline". This challenge expires in ~${Math.ceil(PVP_ACCEPT_TIMEOUT_MS / 60000)} min.`;
                    try {
                        const sMPvP = await api.sendMessage(cMsgPvP, challengedIDPvP); 
                        global.GoatBot.onReply.set(sMPvP.messageID, { commandName: this.config.name, senderID: challengedIDPvP, type: "pvp_challenge_response", challengerID: userID, originalMID: sMPvP.messageID });
                        api.sendMessage(`✅ Challenge sent to ${challengedNamePvP}. Waiting for their response... (Expires in ~${Math.ceil(PVP_ACCEPT_TIMEOUT_MS / 60000)} min)`, threadID);
                    } catch (e) {
                        console.error("PvP Challenge DM send failed:", e.message);
                        clearTimeout(pvpAcceptTimeoutID); 
                        userState.pendingPvpChallenge = null; 
                        await saveGameStateForUser(userID, userState);
                        api.sendMessage(`❌ Failed to send challenge to ${challengedNamePvP}. Please try again.`, threadID);
                    }
                } else {
                    api.sendMessage(`Invalid battle subcommand. Use "ai" or "pvp".`, threadID);
                }
                break;
            
            case "status":
                let sMsgStatus = `🌟 ${userName}'s Pokémon Game Status 🌟\n\n💰 Coins: ${userState.coins}\n`;
                if(userState.lastChallengeTime){
                    const tsStatus=Date.now()-userState.lastChallengeTime;
                    if(tsStatus < ONE_HOUR_MS){ sMsgStatus+=`⏳ Next Name Challenge: ~${Math.ceil((ONE_HOUR_MS-tsStatus)/60000)} min\n`;}
                    else{ sMsgStatus+=`✅ Daily Name Challenge: Available!\n`;}
                } else { sMsgStatus+=`✅ Daily Name Challenge: Available!\n`;}

                if(userState.currentChallenge){
                    sMsgStatus+=`❓ Active Name Challenge: Identifying ${userState.currentChallenge.name} (Reply to image or use "${currentPrefix}${this.config.name} cancel challenge")\n`;
                }

                if(userState.currentBattle){
                    const battle = userState.currentBattle;
                    let playerPokemonName, playerPokemonHP, playerPokemonMaxHP, playerPokemonType, playerPokemonStatusString = "";
                    let opponentNameDisplay, opponentPokemonName, opponentPokemonHP, opponentPokemonMaxHP, opponentPokemonType, opponentPokemonStatusString = "";
                    
                    if (battle.type === "ai") {
                        playerPokemonName = battle.playerActivePokemonName;
                        playerPokemonHP = battle.playerActivePokemonHP;
                        playerPokemonMaxHp = battle.playerActivePokemonMaxHp;
                        playerPokemonType = battle.playerActivePokemonType;
                        if (battle.playerActivePokemonStatus) playerPokemonStatusString = ` [${battle.playerActivePokemonStatus.type.toUpperCase()}]`;
                        
                        opponentNameDisplay = battle.opponentName; 
                        opponentPokemonName = battle.opponentName; // For AI, display name is the pokemon name
                        opponentPokemonHP = battle.opponentHP;
                        opponentPokemonMaxHp = battle.opponentMaxHp; 
                        opponentPokemonType = battle.opponentType;
                        if (battle.opponentStatus) opponentPokemonStatusString = ` [${battle.opponentStatus.type.toUpperCase()}]`;
                    } else { // PvP
                        const isPlayer1 = battle.player1ID === userID;
                        const currentOpponentPlayerID = isPlayer1 ? battle.player2ID : battle.player1ID;
                        opponentNameDisplay = await usersData.getName(currentOpponentPlayerID); // Player's name

                        playerPokemonName = isPlayer1 ? battle.player1ActivePokemonName : battle.player2ActivePokemonName;
                        playerPokemonHP = isPlayer1 ? battle.player1ActivePokemonHP : battle.player2ActivePokemonHP;
                        playerPokemonMaxHp = isPlayer1 ? battle.player1ActivePokemonMaxHp : battle.player2ActivePokemonMaxHp;
                        playerPokemonType = isPlayer1 ? battle.player1ActivePokemonType : battle.player2ActivePokemonType;
                        const playerStatus = isPlayer1 ? battle.player1Status : battle.player2Status;
                        if (playerStatus) playerPokemonStatusString = ` [${playerStatus.type.toUpperCase()}]`;

                        opponentPokemonName = isPlayer1 ? battle.player2ActivePokemonName : battle.player1ActivePokemonName; // Opponent's Pokemon name
                        opponentPokemonHP = isPlayer1 ? battle.player2ActivePokemonHP : battle.player1ActivePokemonHP;
                        opponentPokemonMaxHp = isPlayer1 ? battle.player2ActivePokemonMaxHp : battle.player1ActivePokemonMaxHp;
                        opponentPokemonType = isPlayer1 ? battle.player2ActivePokemonType : battle.player1ActivePokemonType;
                        const opponentStatus = isPlayer1 ? battle.player2Status : battle.player1Status;
                        if (opponentStatus) opponentPokemonStatusString = ` [${opponentStatus.type.toUpperCase()}]`;
                    }
                    sMsgStatus+=`⚔️ Active Battle (${battle.type.toUpperCase()}): Vs ${opponentNameDisplay}\n`;
                    sMsgStatus+=`   Your ${playerPokemonName} (${playerPokemonType} - HP: ${playerPokemonHP}/${playerPokemonMaxHp})${playerPokemonStatusString}\n`;
                    sMsgStatus+=`   Opponent's ${opponentPokemonName} (${opponentPokemonType} - HP: ${opponentPokemonHP}/${opponentPokemonMaxHp})${opponentPokemonStatusString}\n`; 
                    sMsgStatus+=`   Can use: "${currentPrefix}${this.config.name} cancel battle"\n`;
                } else {
                    sMsgStatus+=`✅ No active battle.\n`;
                }

                if(userState.pendingPvpChallenge && userState.pendingPvpChallenge.challengerID === userID){
                     const timeSinceSentPvP = Date.now() - (userState.pendingPvpChallenge.challengeSentTime || 0);
                     if (timeSinceSentPvP < PVP_ACCEPT_TIMEOUT_MS) {
                        sMsgStatus+=`⏳ Pending PvP Sent: To ${await usersData.getName(userState.pendingPvpChallenge.challengedUserID)} (Expires in ~${Math.ceil((PVP_ACCEPT_TIMEOUT_MS - timeSinceSentPvP)/60000)} min)\n`;
                     } else {
                        sMsgStatus+=`ℹ️ Your previously sent PvP challenge has expired.\n`;
                        userState.pendingPvpChallenge = null; 
                        await saveGameStateForUser(userID, userState);
                     }
                } else { 
                    if (db) {
                        const incomingPvPStatus = await db.collection('pokemon_game_states').findOne({ "pendingPvpChallenge.challengedUserID": userID, "pendingPvpChallenge.challengerID": { $ne: userID} }); 
                        if (incomingPvPStatus && incomingPvPStatus.pendingPvpChallenge) { 
                             const timeSinceIncomingSent = Date.now() - (incomingPvPStatus.pendingPvpChallenge.challengeSentTime || 0);
                             if (timeSinceIncomingSent < PVP_ACCEPT_TIMEOUT_MS) {
                                sMsgStatus+= `📩 Incoming PvP: From ${await usersData.getName(incomingPvPStatus.pendingPvpChallenge.challengerID)}! (Expires in ~${Math.ceil((PVP_ACCEPT_TIMEOUT_MS - timeSinceIncomingSent)/60000)} min)\n`; 
                             }
                        } else if (!(userState.pendingPvpChallenge && userState.pendingPvpChallenge.challengerID === userID)) { 
                            sMsgStatus+=`✅ No pending PvP challenges.\n`;
                        }
                    } else {
                         sMsgStatus+=`⚠️ Could not check for incoming PvP challenges (DB connection issue).\n`;
                    }
                }
                api.sendMessage(sMsgStatus,threadID);
                break;

            case "leaderboard":
                if (!db) return api.sendMessage("DB not connected.", threadID);
                const playersLB = await db.collection('pokemon_game_states')
                    .find({ coins: { $exists: true, $type: "number" } }) 
                    .sort({ coins: -1 })
                    .limit(10)
                    .toArray();
                let lbMsgLB = "🏆 Top Trainers by Coins 🏆\n\n";
                if (playersLB.length === 0) {
                    lbMsgLB += "No players on the leaderboard yet!";
                } else {
                    for (let i = 0; i < playersLB.length; i++) {
                        try {
                            const playerName = await usersData.getName(playersLB[i].userID);
                            lbMsgLB += `${i + 1}. ${playerName || `User ${playersLB[i].userID.slice(0, 6)}`}: ${playersLB[i].coins || 0} Coins\n`;
                        } catch (e) {
                            lbMsgLB += `${i + 1}. User ${playersLB[i].userID.slice(0, 6)} (name error): ${playersLB[i].coins || 0} Coins\n`;
                        }
                    }
                }
                api.sendMessage(lbMsgLB, threadID);
                break;

            default:
                api.sendMessage(this.config.guide.en.replace(/{pn}/g, `${currentPrefix}${this.config.name}`),threadID);
                break;
        }
    },

    onReply: async function ({ api, event, Reply, usersData }) {
        if (!db) return api.sendMessage("⏳ Database is connecting... Please try again in a moment.", event.threadID);
        const userID = event.senderID; 
        const threadID = event.threadID;
        const replySenderName = await usersData.getName(userID); 

        if (Reply.senderID !== userID || Reply.commandName !== this.config.name) return;

        let userState = await getGameStateForUser(userID); 
        if (!userState) return api.sendMessage("❌ Error: Could not load your game data.", threadID);

        if (Reply.type === "challenge_answer") {
            if (userState.currentChallenge && userState.currentChallenge.messageID === Reply.originalMID) {
                api.unsendMessage(Reply.originalMID).catch(e => console.warn("Challenge_answer: Minor error un-sending original reply:", e.message));
            }

            if (!userState.currentChallenge || !Reply.challengeData || Reply.challengeData.name !== userState.currentChallenge.name) {
                return api.sendMessage("⚠️ This Pokémon name challenge has expired, was already answered, or is invalid. Try starting a new one!", threadID);
            }

            if (userState.currentChallenge.timeoutID) {
                clearTimeout(parseInt(userState.currentChallenge.timeoutID));
            }

            const userAnswer = event.body.trim().toLowerCase();
            const correctName = userState.currentChallenge.name.toLowerCase();

            if (userAnswer === correctName) {
                api.sendMessage(`🎉 Congratulations, ${replySenderName}! You correctly identified ${userState.currentChallenge.name}!`, threadID);
                let userPokemonsReply = await getUserPokemonCollectionList(userID);
                const caughtReply = {
                    name: userState.currentChallenge.name,
                    hp: parseInt(userState.currentChallenge.hp || 0), 
                    maxHp: parseInt(userState.currentChallenge.hp || 0),
                    type: userState.currentChallenge.type || "Unknown",
                    attacks: userState.currentChallenge.attacks || [], 
                    imageUrl: userState.currentChallenge.originalImageUrl, 
                    id: `${userID}_${Date.now()}`
                };
                userPokemonsReply.push(caughtReply);
                await saveUserPokemonCollectionList(userID, userPokemonsReply);
                api.sendMessage(`🌟 ${caughtReply.name} has been added to your collection!`, threadID);
                userState.coins = (userState.coins || 0) + 50;
                api.sendMessage(`💰 You earned 50 Coins! Total: ${userState.coins}`, threadID);
            } else {
                api.sendMessage(`❌ Sorry, ${replySenderName}. That's not correct. The Pokémon was ${userState.currentChallenge.name}.`, threadID);
            }

            userState.currentChallenge = null;
            userState.lastChallengeTime = Date.now(); 
            await saveGameStateForUser(userID, userState);

        } else if (Reply.type === "pvp_challenge_response") {
            try { if (Reply.originalMID) await api.unsendMessage(Reply.originalMID); } catch (e) { console.warn("pvp_challenge_response: unsend original failed", e.message)} 

            const responsePvP = event.body.trim().toLowerCase();
            const originalChallengerID = Reply.challengerID; 
            const challengedUserID = userID; 

            let originalChallengerState = await getGameStateForUser(originalChallengerID);
            let challengedPlayerState = userState; 

            console.log(`PvP Challenge Response Debug:`);
            console.log(`  - Replier (Challenged): ${challengedUserID} (${replySenderName})`);
            console.log(`  - Original Challenger: ${originalChallengerID}`);
            console.log(`  - Original Challenger's Pending Challenge:`, originalChallengerState ? originalChallengerState.pendingPvpChallenge : "No challenger state or pendingPvpChallenge field");

            if (!originalChallengerState || 
                !originalChallengerState.pendingPvpChallenge || 
                originalChallengerState.pendingPvpChallenge.challengedUserID !== challengedUserID ||
                originalChallengerState.pendingPvpChallenge.challengerID !== originalChallengerID) { 
                return api.sendMessage("This PvP challenge is no longer valid, has expired, was cancelled, or was not intended for you.", threadID);
            }
            
            const pendingChallengeDetails = { ...originalChallengerState.pendingPvpChallenge };

            if (pendingChallengeDetails.acceptTimeoutID) {
                clearTimeout(parseInt(pendingChallengeDetails.acceptTimeoutID));
            }
            originalChallengerState.pendingPvpChallenge = null; 

            if (responsePvP === "accept") {
                const originalChallengerName = await usersData.getName(originalChallengerID);
                const challengedPlayerName = replySenderName; 

                api.sendMessage(`✅ ${challengedPlayerName} accepted the battle challenge from ${originalChallengerName}! Setting up the battle...`, threadID); 
                try { api.sendMessage(`✅ Your challenge to ${challengedPlayerName} has been accepted! Setting up...`, originalChallengerID); } catch(e){ console.warn("Failed to DM original challenger about acceptance", e.message)}

                const challengerPokemonForBattle = pendingChallengeDetails.challengerPokemonDetails; 
                if (!challengerPokemonForBattle || !challengerPokemonForBattle.attacks) {
                    api.sendMessage("❌ Error: Original challenger's Pokémon data is missing. Battle cancelled.", threadID);
                    await saveGameStateForUser(originalChallengerID, originalChallengerState); 
                    return;
                }

                let p2Collection = await getUserPokemonCollectionList(challengedUserID); 
                if (p2Collection.length === 0) {
                    api.sendMessage(`❌ ${challengedPlayerName}, you have no Pokémon to battle with! Battle cancelled.`, threadID);
                    try { api.sendMessage(`❌ ${challengedPlayerName} has no Pokémon. Battle cancelled.`, originalChallengerID); } catch(e){ console.warn("Failed to DM original challenger about P2 no pokemon", e.message)}
                    await saveGameStateForUser(originalChallengerID, originalChallengerState);
                    return;
                }
                const p2FirstPokemonName = p2Collection[0].name; 
                let p2PokemonDetails = await this.getPokemonDetailsFromAPI(p2FirstPokemonName); 
                if (!p2PokemonDetails || !p2PokemonDetails.attacks) {
                    console.warn(`Could not fetch details for ${p2FirstPokemonName}, using a random Pokemon for P2.`);
                    p2PokemonDetails = await this.getRandomPokemonForBattleSetup();
                    if (!p2PokemonDetails) {
                        api.sendMessage("❌ Error preparing Player 2's Pokémon. Battle cancelled.", threadID);
                        await saveGameStateForUser(originalChallengerID, originalChallengerState); return;
                    }
                }
                 const p2PokemonForBattle = { 
                    name: p2PokemonDetails.name,
                    hp: parseInt(p2PokemonDetails.hp),
                    maxHp: parseInt(p2PokemonDetails.hp),
                    type: p2PokemonDetails.type, 
                    attacks: p2PokemonDetails.attacks,
                    status: null
                };

                const battleData = {
                    type: "pvp",
                    player1ID: originalChallengerID, 
                    player2ID: challengedUserID, 
                    challengeOriginThreadID: pendingChallengeDetails.threadID, 
                    
                    player1ActivePokemonName: challengerPokemonForBattle.name,
                    player1ActivePokemonHP: challengerPokemonForBattle.hp,
                    player1ActivePokemonMaxHp: challengerPokemonForBattle.maxHp,
                    player1ActivePokemonType: challengerPokemonForBattle.type,
                    player1ActivePokemonMoves: challengerPokemonForBattle.attacks,
                    player1Status: null,
                   
                    player2ActivePokemonName: p2PokemonForBattle.name,
                    player2ActivePokemonHP: p2PokemonForBattle.hp,
                    player2ActivePokemonMaxHp: p2PokemonForBattle.maxHp,
                    player2ActivePokemonType: p2PokemonForBattle.type, 
                    player2ActivePokemonMoves: p2PokemonForBattle.attacks,
                    player2Status: null,
                    
                    currentTurn: originalChallengerID 
                };

                originalChallengerState.currentBattle = battleData;
                challengedPlayerState.currentBattle = battleData;
                
                await saveGameStateForUser(originalChallengerID, originalChallengerState);
                await saveGameStateForUser(challengedUserID, challengedPlayerState);

                let pvpStartMsg = `⚔️ PvP Battle Starting! ⚔️\n\n`;
                pvpStartMsg += `${originalChallengerName} (P1) with ${battleData.player1ActivePokemonName} (${battleData.player1ActivePokemonType} - HP: ${battleData.player1ActivePokemonHP}/${battleData.player1ActivePokemonMaxHp})\n`;
                pvpStartMsg += `vs.\n`;
                pvpStartMsg += `${challengedPlayerName} (P2) with ${battleData.player2ActivePokemonName} (${battleData.player2ActivePokemonType} - HP: ${battleData.player2ActivePokemonHP}/${battleData.player2ActivePokemonMaxHp})\n\n`;
                
                api.sendMessage(pvpStartMsg, threadID); 
                
                let promptToChallengerForFirstMove = `--- Your Turn, ${originalChallengerName}! ---\nChoose a move for your ${battleData.player1ActivePokemonName} (${battleData.player1ActivePokemonType}):\n`;
                (battleData.player1ActivePokemonMoves || []).forEach((move, index) => { 
                    promptToChallengerForFirstMove += `${index + 1}. ${move.name} (Dmg: ${move.damageString || '0'})${move.text ? ` - ${move.text.substring(0,30)}...` : ''}\n`; 
                });
                promptToChallengerForFirstMove += `Reply with move number.`;

                try { 
                    const firstMovePromptMsg = await api.sendMessage(promptToChallengerForFirstMove, originalChallengerID); 
                    global.GoatBot.onReply.set(firstMovePromptMsg.messageID,{commandName:this.config.name,senderID:originalChallengerID,type:"battle_move",originalMID:firstMovePromptMsg.messageID}); 
                } catch(e){ 
                    console.error(`PvP Challenge Response: Failed to DM original challenger ${originalChallengerID} for first move. Prompting in challenge origin thread ${pendingChallengeDetails.threadID}.`);
                    const fallbackPromptMsg = await api.sendMessage(`@${originalChallengerName}, your DM for the battle prompt failed. ${promptToChallengerForFirstMove}`, pendingChallengeDetails.threadID, { mentions: [{ tag: `@${originalChallengerName}`, id: originalChallengerID }] });
                    global.GoatBot.onReply.set(fallbackPromptMsg.messageID, {commandName:this.config.name,senderID:originalChallengerID,type:"battle_move",originalMID:fallbackPromptMsg.messageID});
                }

            } else if (responsePvP === "decline") { 
                api.sendMessage(`❌ You declined the battle challenge.`, threadID); 
                try { api.sendMessage(`😔 ${replySenderName} declined your battle challenge.`, originalChallengerID); } catch(e){ console.warn("Failed to DM original challenger about decline", e.message) } 
                await saveGameStateForUser(originalChallengerID, originalChallengerState); 
            } else { 
                // Invalid response, restore pending challenge state for challenger (timeout was already cleared, so it won't re-timeout unless re-issued)
                originalChallengerState.pendingPvpChallenge = pendingChallengeDetails; 
                 // Re-set the timeout if invalid response. This is tricky because the original timeout object is gone.
                 // A simpler approach might be to just inform the user and let the original timeout run its course if it wasn't cleared,
                 // or require a new challenge. For now, we'll just restore the pending state.
                 // The timeout was cleared above, so this challenge won't auto-expire anymore from the original timer.
                await saveGameStateForUser(originalChallengerID, originalChallengerState); 
                const rpMsgPvP = await api.sendMessage(`Invalid response. Reply "accept" or "decline" to the challenge.`, threadID); 
                global.GoatBot.onReply.set(rpMsgPvP.messageID,{commandName:this.config.name,senderID:userID,type:"pvp_challenge_response",challengerID:originalChallengerID,originalMID:rpMsgPvP.messageID});
            }

        } else if (Reply.type === "battle_move") {
            try { if (Reply.originalMID) await api.unsendMessage(Reply.originalMID); }
            catch (e) { console.warn("Battle_move: Error un-sending original prompt:", e.message); }

            if (!userState.currentBattle) {
                return api.sendMessage("❌ No active battle found for you, or it has already ended.", threadID);
            }

            let battle = userState.currentBattle; 
            const currentPlayerID = userID; 

            if (battle.currentTurn !== currentPlayerID) {
                return api.sendMessage(`⏳ It's not your turn! Please wait for ${await usersData.getName(battle.currentTurn)}.`, threadID);
            }

            let battleMessages = []; 
            let attacker, defender, attackerName, defenderName, attackerProps, defenderProps, isP1AttackingGlobal = null;

            if (battle.type === "ai") {
                attackerProps = {
                    nameKey: 'playerActivePokemonName', hpKey: 'playerActivePokemonHP', maxHpKey: 'playerActivePokemonMaxHp',
                    typeKey: 'playerActivePokemonType', movesKey: 'playerActivePokemonMoves', statusKey: 'playerActivePokemonStatus'
                };
                defenderProps = {
                    nameKey: 'opponentName', hpKey: 'opponentHP', maxHpKey: 'opponentMaxHp',
                    typeKey: 'opponentType', movesKey: 'opponentMoves', statusKey: 'opponentStatus'
                };
                attackerName = replySenderName; 
                defenderName = `AI ${battle[defenderProps.nameKey]}`;
            } else { // PvP
                isP1AttackingGlobal = battle.player1ID === currentPlayerID;
                attackerProps = isP1AttackingGlobal ? {
                    nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp',
                    typeKey: 'player1ActivePokemonType', movesKey: 'player1ActivePokemonMoves', statusKey: 'player1Status'
                } : {
                    nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp',
                    typeKey: 'player2ActivePokemonType', movesKey: 'player2ActivePokemonMoves', statusKey: 'player2Status'
                };
                defenderProps = isP1AttackingGlobal ? {
                    nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp',
                    typeKey: 'player2ActivePokemonType', movesKey: 'player2ActivePokemonMoves', statusKey: 'player2Status'
                } : {
                    nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp',
                    typeKey: 'player1ActivePokemonType', movesKey: 'player1ActivePokemonMoves', statusKey: 'player1Status'
                };
                attackerName = await usersData.getName(currentPlayerID);
                defenderName = await usersData.getName(isP1AttackingGlobal ? battle.player2ID : battle.player1ID);
            }

            attacker = { name: battle[attackerProps.nameKey], hp: battle[attackerProps.hpKey], type: battle[attackerProps.typeKey], moves: battle[attackerProps.movesKey] || [], status: battle[attackerProps.statusKey] };
            defender = { name: battle[defenderProps.nameKey], hp: battle[defenderProps.hpKey], type: battle[defenderProps.typeKey], moves: battle[defenderProps.movesKey] || [], status: battle[defenderProps.statusKey] };

            battleMessages.push(`\n--- ${attackerName}'s Turn (${attacker.type}) ---`);
            let canPlayerAttack = true; // Renamed from canPlayerAttack to avoid conflict if it was global

            if (attacker.status) {
                switch (attacker.status.type) {
                    case STATUS_CONDITIONS.ASLEEP:
                        if (Math.random() < 0.5) { 
                            battleMessages.push(`☀️ ${attacker.name} woke up!`);
                            battle[attackerProps.statusKey] = null;
                        } else {
                            battleMessages.push(`😴 ${attacker.name} is fast asleep.`);
                            canPlayerAttack = false;
                        }
                        break;
                    case STATUS_CONDITIONS.PARALYZED:
                        battleMessages.push(`⚡ ${attacker.name} is paralyzed! It can't move!`);
                        battle[attackerProps.statusKey] = null; 
                        canPlayerAttack = false;
                        break;
                    case STATUS_CONDITIONS.CONFUSED:
                        battleMessages.push(`❓ ${attacker.name} is confused!`);
                        if (Math.random() < 0.5) { 
                            battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - CONFUSION_SELF_DAMAGE);
                            battleMessages.push(`💥 It hurt itself in its confusion for ${CONFUSION_SELF_DAMAGE} damage! ${attacker.name} HP: ${battle[attackerProps.hpKey]}/${battle[attackerProps.maxHpKey]}`);
                            canPlayerAttack = false;
                            if (battle[attackerProps.hpKey] <= 0) { 
                                battleMessages.push(`☠️ ${attacker.name} fainted from confusion!`);
                            }
                        } else {
                            battleMessages.push(`👍 ${attacker.name} managed to attack through confusion!`);
                        }
                        break;
                }
            }

            let selectedMove;
            if (canPlayerAttack && battle[attackerProps.hpKey] > 0) { 
                const chosenMoveIndex = parseInt(event.body.trim()) - 1;
                if (isNaN(chosenMoveIndex) || chosenMoveIndex < 0 || chosenMoveIndex >= attacker.moves.length) {
                    battleMessages.push("⚠️ Invalid move selection. Turn skipped.");
                    canPlayerAttack = false; 
                } else {
                    selectedMove = attacker.moves[chosenMoveIndex];
                }
            } else if (battle[attackerProps.hpKey] <= 0) { 
                 canPlayerAttack = false; 
            }

            if (canPlayerAttack && selectedMove) {
                battleMessages.push(`💥 ${attackerName}'s ${attacker.name} used ${selectedMove.name}!`);
                if (selectedMove.text) battleMessages.push(`   ${selectedMove.text}`);

                const moveBaseDamage = selectedMove.damage; 
                const advantageMultiplier = this.getTypeAdvantage(attacker.type, defender.type);
                const damageDealt = Math.max(0, Math.floor(moveBaseDamage * advantageMultiplier));
                
                battle[defenderProps.hpKey] = Math.max(0, battle[defenderProps.hpKey] - damageDealt);
                battleMessages.push(`⚔️ It dealt ${damageDealt} damage to ${defender.name}.`);
                if (advantageMultiplier === 2) battleMessages.push("It's super effective!");
                if (advantageMultiplier === 0.5) battleMessages.push("It's not very effective...");


                if (selectedMove.effect && (!defender.status || selectedMove.effect.type !== defender.status.type) ) { 
                     if (Math.random() < (selectedMove.effect.chance || 1.0)) { 
                        battle[defenderProps.statusKey] = { type: selectedMove.effect.type, turns: selectedMove.effect.type === STATUS_CONDITIONS.PARALYZED ? 1 : undefined }; 
                        battleMessages.push(`✨ ${defender.name} is now ${selectedMove.effect.type.toUpperCase()}!`);
                    }
                }
                battleMessages.push(`${defender.name} (${defender.type}) HP: ${battle[defenderProps.hpKey]}/${battle[defenderProps.maxHpKey]}`);
            }
            
            let battleEnded = false;
            if (battle[defenderProps.hpKey] <= 0) { 
                battleMessages.push(`☠️ ${defender.name} fainted!`);
                battleMessages.push(`🎉 ${attackerName} wins the battle!`);
                userState.coins = (userState.coins || 0) + (battle.type === "ai" ? 75 : 150);
                battleMessages.push(`💰 ${attackerName} earned ${battle.type === "ai" ? 75 : 150} coins! Total: ${userState.coins}`);
                battleEnded = true;
            } else if (battle[attackerProps.hpKey] <= 0 && !canPlayerAttack) { // Attacker fainted from pre-turn status/confusion
                 battleMessages.push(`🎉 ${defenderName} wins the battle!`);
                 if (battle.type === "pvp") {
                    const winnerID = isP1AttackingGlobal ? battle.player2ID : battle.player1ID;
                    let winnerState = await getGameStateForUser(winnerID);
                    if(winnerState){ 
                        winnerState.coins = (winnerState.coins || 0) + 150; 
                        await saveGameStateForUser(winnerID, winnerState); 
                        try { api.sendMessage(`💰 You earned 150 coins as ${attackerName} fainted!`, winnerID); } catch(e){}
                    }
                 }
                 battleEnded = true;
            }

            if (battleEnded) {
                userState.currentBattle = null;
                await saveGameStateForUser(userID, userState); 
                if (battle.type === "pvp") {
                    const opponentID = battle.player1ID === userID ? battle.player2ID : battle.player1ID;
                    let opponentState = await getGameStateForUser(opponentID);
                    if (opponentState) { opponentState.currentBattle = null; await saveGameStateForUser(opponentID, opponentState); }
                }
                return api.sendMessage(battleMessages.join('\n'), threadID);
            }

            if (attacker.status && canPlayerAttack && battle[attackerProps.hpKey] > 0) { 
                switch(attacker.status.type) {
                    case STATUS_CONDITIONS.POISONED:
                        battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - POISON_DAMAGE);
                        battleMessages.push(`🤢 ${attacker.name} took ${POISON_DAMAGE} damage from poison! HP: ${battle[attackerProps.hpKey]}/${battle[attackerProps.maxHpKey]}`);
                        break;
                    case STATUS_CONDITIONS.BURNED:
                        battleMessages.push(`🔥 ${attacker.name} is burned! Flipping a coin...`);
                        if (Math.random() < 0.5) { 
                            battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - BURN_DAMAGE);
                            battleMessages.push(`💥 Coin was TAILS! Took ${BURN_DAMAGE} damage from burn! HP: ${battle[attackerProps.hpKey]}/${battle[attackerProps.maxHpKey]}`);
                        } else {
                            battleMessages.push(`👍 Coin was HEADS! No damage from burn this turn.`);
                        }
                        break;
                }
                if (battle[attackerProps.hpKey] <= 0) { 
                     battleMessages.push(`☠️ ${attacker.name} fainted from its status condition!`);
                     battleMessages.push(`🎉 ${defenderName} wins the battle!`);
                     battleEnded = true; 
                     if (battle.type === "pvp") {
                        const winnerID = isP1AttackingGlobal ? battle.player2ID : battle.player1ID;
                        let winnerState = await getGameStateForUser(winnerID);
                        if(winnerState){ 
                            winnerState.coins = (winnerState.coins || 0) + 150; 
                            await saveGameStateForUser(winnerID, winnerState); 
                            try { api.sendMessage(`💰 You earned 150 coins as ${attackerName} fainted from status!`, winnerID); } catch(e){}
                        }
                     }
                }
            }
            
            if (battleEnded) { 
                userState.currentBattle = null;
                await saveGameStateForUser(userID, userState); 
                if (battle.type === "pvp") {
                    const opponentID = battle.player1ID === userID ? battle.player2ID : battle.player1ID;
                    let opponentState = await getGameStateForUser(opponentID);
                    if (opponentState) { opponentState.currentBattle = null; await saveGameStateForUser(opponentID, opponentState); }
                }
                return api.sendMessage(battleMessages.join('\n'), threadID);
            }

            let nextTurnPlayerID = null;
            if (battle.type === "ai") {
                battleMessages.push(`\n--- AI ${battle[defenderProps.nameKey]}'s Turn (${battle[defenderProps.typeKey]}) ---`);
                let aiCanAttack = true; // AI's ability to attack this turn
                if (battle[defenderProps.statusKey]) { 
                    const aiStatus = battle[defenderProps.statusKey];
                    switch(aiStatus.type) {
                        case STATUS_CONDITIONS.ASLEEP: if (Math.random() < 0.5) { battleMessages.push(`☀️ AI ${defender.name} woke up!`); battle[defenderProps.statusKey] = null; } else { battleMessages.push(`😴 AI ${defender.name} is asleep.`); aiCanAttack = false; } break;
                        case STATUS_CONDITIONS.PARALYZED: battleMessages.push(`⚡ AI ${defender.name} is paralyzed!`); battle[defenderProps.statusKey] = null; aiCanAttack = false; break;
                        case STATUS_CONDITIONS.CONFUSED: battleMessages.push(`❓ AI ${defender.name} is confused!`); if (Math.random() < 0.5) { battle[defenderProps.hpKey] = Math.max(0, battle[defenderProps.hpKey] - CONFUSION_SELF_DAMAGE); battleMessages.push(`💥 AI hurt itself for ${CONFUSION_SELF_DAMAGE}! HP: ${battle[defenderProps.hpKey]}/${battle[defenderProps.maxHpKey]}`); aiCanAttack = false; if(battle[defenderProps.hpKey] <=0) {battleMessages.push(`☠️ AI ${defender.name} fainted from confusion!`); battleEnded = true;} } else { battleMessages.push(`👍 AI overcame confusion!`);} break;
                    }
                }

                if (!battleEnded && aiCanAttack && battle[defenderProps.hpKey] > 0) { 
                    const aiMoves = battle[defenderProps.movesKey] || [];
                    let aiSelectedMove;
                    if (aiMoves.length > 0) {
                        const playerPokemonTypeForAI = battle[attackerProps.typeKey]; 
                        const aiPokemonTypeForAI = battle[defenderProps.typeKey];
                        
                        const superEffectiveMoves = aiMoves.filter(move => move.damage > 0 && this.getTypeAdvantage(aiPokemonTypeForAI, playerPokemonTypeForAI) === 2);
                        const normalEffectiveMoves = aiMoves.filter(move => move.damage > 0 && this.getTypeAdvantage(aiPokemonTypeForAI, playerPokemonTypeForAI) === 1);

                        if (superEffectiveMoves.length > 0 && Math.random() < 0.75) { 
                            aiSelectedMove = superEffectiveMoves[Math.floor(Math.random() * superEffectiveMoves.length)];
                            battleMessages.push(`🤖 AI ${defender.name} is looking for a strategic advantage...`);
                        } else if (normalEffectiveMoves.length > 0 && Math.random() < 0.6) { 
                            aiSelectedMove = normalEffectiveMoves[Math.floor(Math.random() * normalEffectiveMoves.length)];
                        } else { 
                            aiSelectedMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
                        }
                        
                        const aiMoveBaseDamage = aiSelectedMove.damage;
                        const aiAdvantageMultiplier = this.getTypeAdvantage(aiPokemonTypeForAI, playerPokemonTypeForAI);
                        const aiDamageDealt = Math.max(0, Math.floor(aiMoveBaseDamage * aiAdvantageMultiplier));

                        battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - aiDamageDealt);
                        battleMessages.push(`💢 AI ${defender.name} used ${aiSelectedMove.name} on your ${attacker.name} for ${aiDamageDealt} damage!`);
                        if (aiAdvantageMultiplier === 2) battleMessages.push("It's super effective against your Pokémon!");
                        if (aiAdvantageMultiplier === 0.5) battleMessages.push("It's not very effective against your Pokémon...");

                        if (aiSelectedMove.text) battleMessages.push(`   Effect: ${aiSelectedMove.text}`);
                        if (aiSelectedMove.effect && (!battle[attackerProps.statusKey] || aiSelectedMove.effect.type !== battle[attackerProps.statusKey].type) ) {
                            if (Math.random() < (aiSelectedMove.effect.chance || 1.0)) {
                                battle[attackerProps.statusKey] = { type: aiSelectedMove.effect.type, turns: (aiSelectedMove.effect.type === STATUS_CONDITIONS.PARALYZED ? 1 : undefined) };
                                battleMessages.push(`✨ Your ${attacker.name} is now ${aiSelectedMove.effect.type.toUpperCase()}!`);
                            }
                        }
                        battleMessages.push(`Your ${attacker.name} (${attacker.type}) HP: ${battle[attackerProps.hpKey]}/${battle[attackerProps.maxHpKey]}`);
                        if (battle[attackerProps.hpKey] <= 0) { 
                            battleMessages.push(`☠️ Your ${attacker.name} fainted!`);
                            battleMessages.push(`👎 AI ${defender.name} wins the battle!`);
                            battleEnded = true;
                        }
                    } else { battleMessages.push(`AI ${defender.name} has no moves!`);}
                }
                
                if (!battleEnded && battle[defenderProps.statusKey] && aiCanAttack && battle[defenderProps.hpKey] > 0) { 
                    const aiStatus = battle[defenderProps.statusKey];
                    if (aiStatus.type === STATUS_CONDITIONS.POISONED) { battle[defenderProps.hpKey] = Math.max(0, battle[defenderProps.hpKey] - POISON_DAMAGE); battleMessages.push(`🤢 AI ${defender.name} took ${POISON_DAMAGE} from poison! HP: ${battle[defenderProps.hpKey]}/${battle[defenderProps.maxHpKey]}`);}
                    else if (aiStatus.type === STATUS_CONDITIONS.BURNED) { if(Math.random() < 0.5) { battle[defenderProps.hpKey] = Math.max(0, battle[defenderProps.hpKey] - BURN_DAMAGE); battleMessages.push(`💥 AI ${defender.name} took ${BURN_DAMAGE} from burn! HP: ${battle[defenderProps.hpKey]}/${battle[defenderProps.maxHpKey]}`);}}
                     if (battle[defenderProps.hpKey] <= 0) { 
                         battleMessages.push(`☠️ AI ${defender.name} fainted from status!`);
                         battleMessages.push(`🎉 You (${attackerName}) win the battle!`);
                         userState.coins = (userState.coins||0)+75; 
                         battleEnded = true;
                    }
                }

                if (battleEnded) {
                    userState.currentBattle = null; 
                    await saveGameStateForUser(userID, userState); 
                    return api.sendMessage(battleMessages.join('\n'), threadID);
                }
                battle.currentTurn = userID; 
                nextTurnPlayerID = userID;

            } else { // PvP
                if (battle[attackerProps.hpKey] > 0 && battle[defenderProps.hpKey] > 0) { 
                    battle.currentTurn = (battle.player1ID === currentPlayerID ? battle.player2ID : battle.player1ID);
                    nextTurnPlayerID = battle.currentTurn;
                } else { 
                    if (!battleEnded) { 
                        battleMessages.push("The battle has concluded."); 
                        battleEnded = true; 
                    }
                    userState.currentBattle = null;
                    await saveGameStateForUser(userID, userState);
                    const opponentID = battle.player1ID === userID ? battle.player2ID : battle.player1ID;
                    let opponentState = await getGameStateForUser(opponentID);
                    if (opponentState) { opponentState.currentBattle = null; await saveGameStateForUser(opponentID, opponentState); }
                    return api.sendMessage(battleMessages.join('\n'), threadID);
                }
            }

            userState.currentBattle = battle; 
            await saveGameStateForUser(userID, userState);

            if (battle.type === "pvp" && nextTurnPlayerID && nextTurnPlayerID !== userID) { 
                let opponentState = await getGameStateForUser(nextTurnPlayerID);
                if(opponentState) { 
                    opponentState.currentBattle = battle; 
                    await saveGameStateForUser(nextTurnPlayerID, opponentState); 
                }
            }
            
            if (battle.currentTurn === userID && battle.type === "ai") { 
                const currentAttacker = { name: battle[attackerProps.nameKey], hp: battle[attackerProps.hpKey], maxHp: battle[attackerProps.maxHpKey], type: battle[attackerProps.typeKey], status: battle[attackerProps.statusKey], moves: battle[attackerProps.movesKey] || [] };
                const currentDefender = { name: battle[defenderProps.nameKey], hp: battle[defenderProps.hpKey], maxHp: battle[defenderProps.maxHpKey], type: battle[defenderProps.typeKey], status: battle[defenderProps.statusKey] };
                let nextPrompt = `\n\n--- Your Turn, ${attackerName}! ---\n`;
                nextPrompt += `Your ${currentAttacker.name} (${currentAttacker.type} - HP: ${currentAttacker.hp}/${currentAttacker.maxHp})${currentAttacker.status ? ` [${currentAttacker.status.type.toUpperCase()}]` : ''}\n`;
                nextPrompt += `Opponent's ${currentDefender.name} (${currentDefender.type} - HP: ${currentDefender.hp}/${currentDefender.maxHp})${currentDefender.status ? ` [${currentDefender.status.type.toUpperCase()}]` : ''}\n`;
                nextPrompt += `Choose a move:\n`;
                currentAttacker.moves.forEach((m,i) => { nextPrompt += `${i+1}. ${m.name} (Dmg: ${m.damageString||'0'})\n`;});
                nextPrompt += `Reply with move number.`;
                const rMsg = await api.sendMessage(battleMessages.join('\n') + nextPrompt, threadID);
                global.GoatBot.onReply.set(rMsg.messageID, { commandName: this.config.name, senderID: userID, type: "battle_move", originalMID: rMsg.messageID });
            } else if (battle.type === "pvp" && nextTurnPlayerID && nextTurnPlayerID !== userID ) { 
                api.sendMessage(battleMessages.join('\n') + `\n\n➡️ Turn passes to ${await usersData.getName(nextTurnPlayerID)}.`, threadID); 

                const nextPlayerIsP1 = battle.player1ID === nextTurnPlayerID;
                const nextPlayerAttackerPropsHandle = nextPlayerIsP1 ? { nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp', typeKey: 'player1ActivePokemonType', movesKey: 'player1ActivePokemonMoves', statusKey: 'player1Status'} : { nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp', typeKey: 'player2ActivePokemonType', movesKey: 'player2ActivePokemonMoves', statusKey: 'player2Status'};
                const nextPlayerDefenderPropsHandle = nextPlayerIsP1 ? { nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp', typeKey: 'player2ActivePokemonType', statusKey: 'player2Status'} : { nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp', typeKey: 'player1ActivePokemonType', statusKey: 'player1Status'};
                
                const nextPlayerActive = { name: battle[nextPlayerAttackerPropsHandle.nameKey], hp: battle[nextPlayerAttackerPropsHandle.hpKey], maxHp: battle[nextPlayerAttackerPropsHandle.maxHpKey], type: battle[nextPlayerAttackerPropsHandle.typeKey], status: battle[nextPlayerAttackerPropsHandle.statusKey], moves: battle[nextPlayerAttackerPropsHandle.movesKey] || [] };
                const opponentForNext = { name: battle[nextPlayerDefenderPropsHandle.nameKey], hp: battle[nextPlayerDefenderPropsHandle.hpKey], maxHp: battle[nextPlayerDefenderPropsHandle.maxHpKey], type: battle[nextPlayerDefenderPropsHandle.typeKey], status: battle[nextPlayerDefenderPropsHandle.statusKey] };
                const opponentNameForNextDisplay = await usersData.getName(nextPlayerIsP1 ? battle.player2ID : battle.player1ID);
                const nextPlayerName = await usersData.getName(nextTurnPlayerID);

                let promptToNextPlayer = `--- Your Turn, ${nextPlayerName}! ---\n`;
                promptToNextPlayer += `Your ${nextPlayerActive.name} (${nextPlayerActive.type} - HP: ${nextPlayerActive.hp}/${nextPlayerActive.maxHp})${nextPlayerActive.status ? ` [${nextPlayerActive.status.type.toUpperCase()}]` : ''}\n`;
                promptToNextPlayer += `Opponent ${opponentNameForNextDisplay}'s ${opponentForNext.name} (${opponentForNext.type} - HP: ${opponentForNext.hp}/${opponentForNext.maxHp})${opponentForNext.status ? ` [${opponentForNext.status.type.toUpperCase()}]` : ''}\n`;
                promptToNextPlayer += `Choose a move:\n`;
                (nextPlayerActive.moves || []).forEach((m,i) => { promptToNextPlayer += `${i+1}. ${m.name} (Dmg: ${m.damageString||'0'})\n`;});
                promptToNextPlayer += `Reply with move number.`;
                try {
                    const nextMsgToOpponent = await api.sendMessage(promptToNextPlayer, nextTurnPlayerID); 
                    global.GoatBot.onReply.set(nextMsgToOpponent.messageID, { commandName: this.config.name, senderID: nextTurnPlayerID, type: "battle_move", originalMID: nextMsgToOpponent.messageID });
                } catch (e) { 
                    const fallbackThreadForNextPlayer = battle.challengeOriginThreadID || threadID; 
                    console.error(`PvP Battle Move: Failed to DM next player ${nextTurnPlayerID}. Prompting in thread ${fallbackThreadForNextPlayer}.`);
                    const fallbackMsg = await api.sendMessage(`@${nextPlayerName}, your DM for the battle prompt failed. ${promptToNextPlayer}`, fallbackThreadForNextPlayer, {mentions: [{tag: `@${nextPlayerName}`, id: nextTurnPlayerID}]});
                    global.GoatBot.onReply.set(fallbackMsg.messageID, { commandName: this.config.name, senderID: nextTurnPlayerID, type: "battle_move", originalMID: fallbackMsg.messageID });
                }
            } else if (battleMessages.length > 0 && userState.currentBattle) { 
                api.sendMessage(battleMessages.join('\n'), threadID);
            }
        }
    }
};

module.exports = cmdModule;
