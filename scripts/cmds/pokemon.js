// scripts/cmds/pokemon.js
// Author: Abdul Kaiyum

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require('canvas');
const { MongoClient } = require('mongodb');

// --- MongoDB Setup ---
const mongoURI = "mongodb+srv://abdulkaiyum:abdulkaiyum5426@octa.elx1m1f.mongodb.net/GoatBotV2?retryWrites=true&w=majority&appName=octa";
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
const ONE_HOUR_MS = 60 * 60 * 1000;
const CHALLENGE_TIMEOUT_MS = 60 * 1000;
const PVP_ACCEPT_TIMEOUT_MS = CHALLENGE_TIMEOUT_MS * 2;
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
const BASE_ENERGY = 100;
const ENERGY_RECOVERY_PER_TURN = 15;
const REST_ENERGY_RECOVERY = 25;

const CRIT_CHANCE = 0.0625; 
const CRIT_MULTIPLIER = 1.5;
const MISS_CHANCE = 0.05; 

// Training Constants
const HP_TRAIN_COST = 50;
const HP_TRAIN_AMOUNT = 10;
const HP_TRAIN_MAX_BONUS = 50;

const ATTACK_TRAIN_COST = 100;
const ATTACK_TRAIN_AMOUNT = 5;
const ATTACK_TRAIN_MAX_BONUS = 15; 

const ENERGY_TRAIN_COST = 75;
const ENERGY_TRAIN_AMOUNT = 10;
const ENERGY_TRAIN_MAX_BONUS = 30;


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
    if (!apiAttacks || !Array.isArray(apiAttacks) || apiAttacks.length === 0) return [];
    return apiAttacks.map(attack => {
        let effect = null; const effectText = (attack.text || "").toLowerCase(); const nameText = (attack.name || "").toLowerCase();
        if (effectText.includes("poisoned") || nameText.includes("poison")) effect = { type: STATUS_CONDITIONS.POISONED, chance: 1.0 };
        else if (effectText.includes("paralyzed") || nameText.includes("paralyz")) effect = { type: STATUS_CONDITIONS.PARALYZED, chance: 0.5 };
        else if (effectText.includes("asleep") || nameText.includes("sleep")) effect = { type: STATUS_CONDITIONS.ASLEEP, chance: 1.0 };
        else if (effectText.includes("confused") || nameText.includes("confuse")) effect = { type: STATUS_CONDITIONS.CONFUSED, chance: 1.0 };
        else if (effectText.includes("burned") || nameText.includes("burn")) effect = { type: STATUS_CONDITIONS.BURNED, chance: 1.0 };

        let damageString = String(attack.damage || "0");
        let baseDamage = parseInt(damageString.replace(/[^0-9].*$/, "")) || 0;
        const energyCost = Math.max(5, Math.floor(baseDamage / 4) + 5); 

        return {
            name: attack.name || "Unknown Attack",
            damage: baseDamage, 
            currentDamage: baseDamage, 
            baseDamage: baseDamage, 
            damageString: attack.damage || "0",
            text: attack.text || "",
            cost: attack.cost || [],
            effect: effect,
            energyCost: energyCost || 10 
        };
    }).slice(0, 4);
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
        version: "1.3.11", // Incremented version
        author: "Abdul Kaiyum",
        countDown: 5, role: 0,
        shortDescription: { en: "Pokémon game with training, energy, crits, and more!" },
        longDescription: { en: "Full Pokémon game with name challenges, AI/PvP battles, Pokémon training, energy system, critical hits, and status effects.." },
        category: "pokemon",
        guide: { en: `Usage:\n• {pn} challenge\n• {pn} battle ai\n• {pn} battle pvp <@user>\n• {pn} train (lists your Pokémon for training)\n• {pn} train <index> (shows training options for that Pokémon)\n• {pn} train <index> hp\n• {pn} train <index> attack <1-4>\n• {pn} train <index> energy\n• {pn} cancel challenge\n• {pn} cancel battle\n• {pn} cancel pvp\n• {pn} status\n• {pn} leaderboard` }
    },

    async getPokemonDetailsFromAPI(pokemonName) {
        try {
            const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(pokemonName)}"`, { headers: { 'X-Api-Key': POKEMON_TCG_API_KEY } });
            const card = response.data.data.find(c => c.name.toLowerCase() === pokemonName.toLowerCase()) || response.data.data[0];
            if (card) {
                const baseHp = parseInt(card.hp) || 50;
                return {
                    id: card.id, name: card.name, type: card.types ? card.types[0] : "N/A", 
                    hp: baseHp, 
                    currentHp: baseHp, 
                    maxHp: baseHp,
                    baseHp: baseHp, 
                    attacks: parseAttacksFromAPI(card.attacks),
                    abilities: card.abilities ? card.abilities.map(a => `${a.name}: ${a.text}`).join('\\n') : "N/A",
                    imageUrl: card.images?.large,
                    energy: BASE_ENERGY,
                    maxEnergy: BASE_ENERGY,
                    baseMaxEnergy: BASE_ENERGY 
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
                const parsedAttacks = parseAttacksFromAPI(randomCard.attacks);
                const baseHp = parseInt(randomCard.hp);
                return {
                    name: randomCard.name, imageUrl: randomCard.images.large,
                    hp: baseHp, currentHp: baseHp, maxHp: baseHp, baseHp: baseHp,
                    type: randomCard.types && randomCard.types.length > 0 ? randomCard.types[0] : "Colorless",
                    attacks: parsedAttacks.map(a => ({...a, currentDamage: a.damage})), 
                    status: null,
                    energy: BASE_ENERGY, maxEnergy: BASE_ENERGY, baseMaxEnergy: BASE_ENERGY
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
        const capAttackingType = attackingType ? attackingType.charAt(0).toUpperCase() + attackingType.slice(1) : null;
        const capDefendingType = defendingType ? defendingType.charAt(0).toUpperCase() + defendingType.slice(1) : null;

        const attackerInfo=advantages[capAttackingType];
        const defenderInfo=advantages[capDefendingType];

        if(attackerInfo?.strongAgainst?.includes(capDefendingType)) return 2; 
        if(defenderInfo?.weakTo?.includes(capAttackingType)) return 2; 
        if(attackerInfo?.weakTo?.includes(capDefendingType)) return 0.5; 
        return 1; 
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
                    const battleOriginThread = battleToEnd.challengeOriginThreadID || threadID; 

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
                                try { 
                                    const opponentName = await usersData.getName(opponentID);
                                    api.sendMessage({body: `ℹ️ ${userName} has cancelled the PvP battle against @${opponentName}.`, mentions: [{ tag: `@${opponentName}`, id: opponentID }]}, battleOriginThread); 
                                } 
                                catch(e) { console.warn("Failed to notify opponent of battle cancellation in origin thread", e.message); }
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
                    const challengeOriginThreadForCancel = userState.pendingPvpChallenge.threadID;
                    if (userState.pendingPvpChallenge.acceptTimeoutID) { 
                        clearTimeout(parseInt(userState.pendingPvpChallenge.acceptTimeoutID));
                    }
                    const challengedPlayerIDForCancel = userState.pendingPvpChallenge.challengedUserID; 
                    userState.pendingPvpChallenge = null;
                    await saveGameStateForUser(userID, userState);
                    api.sendMessage(`Your sent PvP challenge to ${challengedUserName} has been cancelled.`, threadID); 
                    try {
                        api.sendMessage({body: `ℹ️ The PvP challenge from ${userName} to @${challengedUserName} has been cancelled.`, mentions: [{tag: `@${challengedUserName}`, id: challengedPlayerIDForCancel}]}, challengeOriginThreadForCancel); 
                    } catch (e) { console.warn("Failed to notify origin thread of PvP challenge cancellation", e.message); }
                    return;
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
                    return api.sendMessage(`📩 Incoming PvP challenge from ${challengerName} in chat thread ID ${incomingChallenge.pendingPvpChallenge.threadID}! Reply "accept" or "decline" in that chat.`, threadID);
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
                        messageID: null, timeoutID: null,
                        energy: challengePokemon.energy,
                        maxEnergy: challengePokemon.maxEnergy,
                        baseHp: challengePokemon.baseHp,
                        baseMaxEnergy: challengePokemon.baseMaxEnergy
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
                        global.GoatBot.onReply.set(rMNA.messageID, { commandName: this.config.name, senderID: userID, challengeData: {name: challengePokemon.name, originalImageUrl: challengePokemon.imageUrl, hp: challengePokemon.hp, type: challengePokemon.type, attacks: challengePokemon.attacks, energy: challengePokemon.energy, maxEnergy: challengePokemon.maxEnergy, baseHp: challengePokemon.baseHp, baseMaxEnergy: challengePokemon.baseMaxEnergy }, type: "challenge_answer", originalMID: rMNA.messageID });
                    }
                } else { api.sendMessage("❌ Name challenge generation failed.", threadID); }
                break;

            case "battle":
                let userPokemonsForBattle = await getUserPokemonCollectionList(userID);
                if (userPokemonsForBattle.length === 0) return api.sendMessage(`You have no Pokémon to battle! Complete challenges first.`, threadID);

                let firstOwnedPokemonData = userPokemonsForBattle[0]; 
                
                if (!firstOwnedPokemonData.attacks || !Array.isArray(firstOwnedPokemonData.attacks) || firstOwnedPokemonData.attacks.length === 0) {
                    console.warn(`Player ${userID}'s Pokémon ${firstOwnedPokemonData.name} has no attacks in collection. Refetching...`);
                    const refetchedDetails = await this.getPokemonDetailsFromAPI(firstOwnedPokemonData.name);
                    if (refetchedDetails && refetchedDetails.attacks && refetchedDetails.attacks.length > 0) {
                        firstOwnedPokemonData.attacks = refetchedDetails.attacks.map(a => ({...a, currentDamage: a.damage, baseDamage: a.damage})); 
                        firstOwnedPokemonData.type = refetchedDetails.type; 
                        firstOwnedPokemonData.maxHp = firstOwnedPokemonData.maxHp || refetchedDetails.maxHp;
                        firstOwnedPokemonData.currentHp = firstOwnedPokemonData.currentHp || refetchedDetails.currentHp; 
                        firstOwnedPokemonData.baseHp = firstOwnedPokemonData.baseHp || refetchedDetails.baseHp;
                        firstOwnedPokemonData.maxEnergy = firstOwnedPokemonData.maxEnergy || refetchedDetails.maxEnergy;
                        firstOwnedPokemonData.energy = firstOwnedPokemonData.energy || refetchedDetails.energy; 
                        firstOwnedPokemonData.baseMaxEnergy = firstOwnedPokemonData.baseMaxEnergy || refetchedDetails.baseMaxEnergy;
                        userPokemonsForBattle[0] = firstOwnedPokemonData; 
                        await saveUserPokemonCollectionList(userID, userPokemonsForBattle); 
                    } else {
                        return api.sendMessage(`❌ Your Pokémon ${firstOwnedPokemonData.name} has corrupted attack data and cannot be used for battle. Please try training it or contact support.`, threadID);
                    }
                }
                
                const playerPokemonForBattle = {
                    name: firstOwnedPokemonData.name,
                    hp: firstOwnedPokemonData.currentHp || firstOwnedPokemonData.maxHp || BASE_ENERGY, 
                    maxHp: firstOwnedPokemonData.maxHp || BASE_ENERGY,  
                    baseHp: firstOwnedPokemonData.baseHp || firstOwnedPokemonData.maxHp || BASE_ENERGY,
                    type: firstOwnedPokemonData.type,
                    attacks: (firstOwnedPokemonData.attacks || []).map(a => ({...a, damage: a.currentDamage || a.baseDamage || a.damage})), 
                    status: null,
                    energy: firstOwnedPokemonData.energy || BASE_ENERGY,
                    maxEnergy: firstOwnedPokemonData.maxEnergy || BASE_ENERGY,
                    baseMaxEnergy: firstOwnedPokemonData.baseMaxEnergy || BASE_ENERGY
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
                        playerActivePokemonEnergy: playerPokemonForBattle.energy,
                        playerActivePokemonMaxEnergy: playerPokemonForBattle.maxEnergy,

                        opponentName: opponentAI.name,
                        opponentHP: opponentAI.hp,
                        opponentMaxHp: opponentAI.maxHp,
                        opponentType: opponentAI.type,
                        opponentMoves: opponentAI.attacks,
                        opponentStatus: null,
                        opponentEnergy: opponentAI.energy,
                        opponentMaxEnergy: opponentAI.maxEnergy,
                        currentTurn: userID,
                        challengeOriginThreadID: threadID 
                    };
                    await saveGameStateForUser(userID, userState);

                    let msgAI = `⚔️ ${userName} vs ${userState.currentBattle.opponentName} (AI) ⚔️\n\n`;
                    msgAI += `Your ${playerPokemonForBattle.name} (${playerPokemonForBattle.type} - HP ${playerPokemonForBattle.hp}/${playerPokemonForBattle.maxHp} - Energy ${playerPokemonForBattle.energy}/${playerPokemonForBattle.maxEnergy})\n`;
                    msgAI += `AI's ${opponentAI.name} (${opponentAI.type} - HP ${opponentAI.hp}/${opponentAI.maxHp} - Energy ${opponentAI.energy}/${opponentAI.maxEnergy})\n\n`;
                    msgAI += `--- Your Turn, ${userName}! ---\nChoose a move:\n`;
                    (playerPokemonForBattle.attacks || []).forEach((move, index) => {
                        msgAI += `${index + 1}. ${move.name} (Dmg: ${move.damage}, Cost: ${move.energyCost}⚡)\n`; 
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
                            const challengeOriginThreadForTimeout = currentChallengerState.pendingPvpChallenge.threadID; 

                            console.log(`PvP Challenge from ${originalChallengerName} to ${originalChallengedName} timed out.`);
                            api.sendMessage({body: `The PvP challenge from ${originalChallengerName} to @${originalChallengedName} has expired due to no response.`, mentions: [{ tag: `@${originalChallengedName}`, id: challengedIDPvP }]}, challengeOriginThreadForTimeout); 
                            
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
                    
                    const cMsgPvP = `🔔 @${challengedNamePvP}, ${userName} has challenged you to a Pokémon battle! Reply to this message with "accept" or "decline". This challenge expires in ~${Math.ceil(PVP_ACCEPT_TIMEOUT_MS / 60000)} min.`;
                    const challengeMsgInfo = await api.sendMessage({body: cMsgPvP, mentions: [{ tag: `@${challengedNamePvP}`, id: challengedIDPvP }]}, threadID);
                    global.GoatBot.onReply.set(challengeMsgInfo.messageID, { commandName: this.config.name, senderID: challengedIDPvP, type: "pvp_challenge_response", challengerID: userID, originalMID: challengeMsgInfo.messageID });
                    
                } else {
                    api.sendMessage(`Invalid battle subcommand. Use "ai" or "pvp".`, threadID);
                }
                break;
            
            case "train":
                const userPokemonsToTrain = await getUserPokemonCollectionList(userID);
                if (userPokemonsToTrain.length === 0) {
                    return api.sendMessage("You have no Pokémon in your collection to train!", threadID);
                }

                const trainPokemonIndexArg = args[1];
                const trainPokemonIndex = parseInt(trainPokemonIndexArg) -1; 
                const trainStatType = args[2]?.toLowerCase(); 
                const trainAttackIndexArg = args[3];
                const trainAttackIndex = parseInt(trainAttackIndexArg) -1; 

                if (isNaN(trainPokemonIndex) || trainPokemonIndex < 0 || trainPokemonIndex >= userPokemonsToTrain.length) {
                    let listMsg = "Your Pokémon Collection for Training:\n";
                    userPokemonsToTrain.forEach((p, i) => {
                        listMsg += `${i + 1}. ${p.name} (HP: ${p.maxHp}, Max Energy: ${p.maxEnergy || BASE_ENERGY})\n`; 
                        if (p.attacks && Array.isArray(p.attacks)) {
                            p.attacks.forEach((atk, idx) => {
                                listMsg += `   - Attack ${idx + 1}: ${atk.name} (Dmg: ${atk.currentDamage || atk.baseDamage || 0}, Cost: ${atk.energyCost || 10}⚡)\n`;
                            });
                        } else {
                            listMsg += `   (Attack data missing/corrupted for this Pokémon)\n`;
                        }
                    });
                    listMsg += `\nUse: {pn} train <index> <hp|attack|energy> [attack_number_if_attack]`;
                    return api.sendMessage(listMsg.replace(/{pn}/g, `${currentPrefix}pokemon`), threadID);
                }
                
                const selectedPokemon = userPokemonsToTrain[trainPokemonIndex];
                selectedPokemon.baseHp = parseInt(selectedPokemon.baseHp || selectedPokemon.maxHp || BASE_ENERGY); 
                selectedPokemon.maxHp = parseInt(selectedPokemon.maxHp || selectedPokemon.baseHp);
                selectedPokemon.baseMaxEnergy = parseInt(selectedPokemon.baseMaxEnergy || BASE_ENERGY);
                selectedPokemon.maxEnergy = parseInt(selectedPokemon.maxEnergy || selectedPokemon.baseMaxEnergy);
                selectedPokemon.attacks = Array.isArray(selectedPokemon.attacks) ? selectedPokemon.attacks : [];
                selectedPokemon.attacks.forEach(atk => {
                    atk.baseDamage = parseInt(atk.baseDamage || atk.damage || 0);
                    atk.currentDamage = parseInt(atk.currentDamage || atk.baseDamage);
                    atk.energyCost = parseInt(atk.energyCost || Math.max(5, Math.floor(atk.baseDamage / 4) + 5));
                });


                let trainConfirmMsg = "";

                if (!trainStatType) {
                    let detailMsg = `Training options for ${selectedPokemon.name}:\n`;
                    detailMsg += `1. HP (Current Max: ${selectedPokemon.maxHp}, Base: ${selectedPokemon.baseHp})\n   Cost: ${HP_TRAIN_COST} coins for +${HP_TRAIN_AMOUNT} HP (Max +${HP_TRAIN_MAX_BONUS} total bonus)\n`;
                    if (selectedPokemon.attacks && Array.isArray(selectedPokemon.attacks)) {
                        selectedPokemon.attacks.forEach((atk, i) => {
                            detailMsg += `${i + 2}. Attack ${i + 1}: ${atk.name} (Current Dmg: ${atk.currentDamage}, Base: ${atk.baseDamage})\n   Cost: ${ATTACK_TRAIN_COST} coins for +${ATTACK_TRAIN_AMOUNT} Dmg (Max +${ATTACK_TRAIN_MAX_BONUS} total bonus)\n`;
                        });
                    } else {
                         detailMsg += `(Attack data for ${selectedPokemon.name} is unavailable for training.)\n`;
                    }
                    detailMsg += `${(selectedPokemon.attacks?.length || 0) + 2}. Max Energy (Current: ${selectedPokemon.maxEnergy}, Base: ${selectedPokemon.baseMaxEnergy})\n   Cost: ${ENERGY_TRAIN_COST} coins for +${ENERGY_TRAIN_AMOUNT} Max Energy (Max +${ENERGY_TRAIN_MAX_BONUS} total bonus)\n`;
                    detailMsg += `\nUse: {pn} train ${trainPokemonIndexArg} <hp|attack|energy> [attack_number_if_attack]`;
                    return api.sendMessage(detailMsg.replace(/{pn}/g, `${currentPrefix}pokemon`), threadID);
                }

                if (trainStatType === "hp") {
                    if (userState.coins < HP_TRAIN_COST) return api.sendMessage(`Not enough coins! Training HP costs ${HP_TRAIN_COST} coins.`, threadID);
                    if (selectedPokemon.maxHp >= selectedPokemon.baseHp + HP_TRAIN_MAX_BONUS) return api.sendMessage(`${selectedPokemon.name}'s HP is already maxed out through training!`, threadID);
                    
                    userState.coins -= HP_TRAIN_COST;
                    selectedPokemon.maxHp += HP_TRAIN_AMOUNT;
                    selectedPokemon.currentHp = selectedPokemon.maxHp; 
                    trainConfirmMsg = `${selectedPokemon.name}'s Max HP increased by ${HP_TRAIN_AMOUNT} to ${selectedPokemon.maxHp}! You have ${userState.coins} coins left.`;
                } else if (trainStatType === "attack") {
                    if (!selectedPokemon.attacks || !Array.isArray(selectedPokemon.attacks) || selectedPokemon.attacks.length === 0) {
                        return api.sendMessage(`${selectedPokemon.name} has no attacks or attack data is corrupted, cannot train attacks.`, threadID);
                    }
                    if (isNaN(trainAttackIndex) || trainAttackIndex < 0 || trainAttackIndex >= selectedPokemon.attacks.length) {
                        return api.sendMessage(`Invalid attack number. Choose between 1 and ${selectedPokemon.attacks.length}.`, threadID);
                    }
                    const attackToTrain = selectedPokemon.attacks[trainAttackIndex];
                     attackToTrain.baseDamage = parseInt(attackToTrain.baseDamage || attackToTrain.currentDamage || 0); 
                     attackToTrain.currentDamage = parseInt(attackToTrain.currentDamage || attackToTrain.baseDamage);


                    if (userState.coins < ATTACK_TRAIN_COST) return api.sendMessage(`Not enough coins! Training attack damage costs ${ATTACK_TRAIN_COST} coins.`, threadID);
                    if (attackToTrain.currentDamage >= attackToTrain.baseDamage + ATTACK_TRAIN_MAX_BONUS) return api.sendMessage(`${selectedPokemon.name}'s ${attackToTrain.name} damage is already maxed out through training!`, threadID);

                    userState.coins -= ATTACK_TRAIN_COST;
                    attackToTrain.currentDamage += ATTACK_TRAIN_AMOUNT;
                    trainConfirmMsg = `${selectedPokemon.name}'s ${attackToTrain.name} damage increased by ${ATTACK_TRAIN_AMOUNT} to ${attackToTrain.currentDamage}! You have ${userState.coins} coins left.`;
                } else if (trainStatType === "energy") {
                    if (userState.coins < ENERGY_TRAIN_COST) return api.sendMessage(`Not enough coins! Training Max Energy costs ${ENERGY_TRAIN_COST} coins.`, threadID);
                    if (selectedPokemon.maxEnergy >= selectedPokemon.baseMaxEnergy + ENERGY_TRAIN_MAX_BONUS) return api.sendMessage(`${selectedPokemon.name}'s Max Energy is already maxed out through training!`, threadID);

                    userState.coins -= ENERGY_TRAIN_COST;
                    selectedPokemon.maxEnergy += ENERGY_TRAIN_AMOUNT;
                    selectedPokemon.energy = selectedPokemon.maxEnergy; 
                    trainConfirmMsg = `${selectedPokemon.name}'s Max Energy increased by ${ENERGY_TRAIN_AMOUNT} to ${selectedPokemon.maxEnergy}! You have ${userState.coins} coins left.`;
                } else {
                    return api.sendMessage("Invalid training type. Choose 'hp', 'attack', or 'energy'.", threadID);
                }

                userPokemonsToTrain[trainPokemonIndex] = selectedPokemon; 
                await saveUserPokemonCollectionList(userID, userPokemonsToTrain);
                await saveGameStateForUser(userID, userState); 
                return api.sendMessage(trainConfirmMsg, threadID);

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
                    let playerPokemonName, playerPokemonHP, playerPokemonMaxHp, playerPokemonType, playerPokemonEnergy, playerPokemonMaxEnergy, playerPokemonStatusString = "";
                    let opponentNameDisplay, opponentPokemonName, opponentPokemonHP, opponentPokemonMaxHp, opponentPokemonType, opponentPokemonEnergy, opponentPokemonMaxEnergy, opponentPokemonStatusString = "";
                    
                    if (battle.type === "ai") {
                        playerPokemonName = battle.playerActivePokemonName;
                        playerPokemonHP = battle.playerActivePokemonHP;
                        playerPokemonMaxHp = battle.playerActivePokemonMaxHp;
                        playerPokemonType = battle.playerActivePokemonType;
                        playerPokemonEnergy = battle.playerActivePokemonEnergy;
                        playerPokemonMaxEnergy = battle.playerActivePokemonMaxEnergy;
                        if (battle.playerActivePokemonStatus) playerPokemonStatusString = ` [${battle.playerActivePokemonStatus.type.toUpperCase()}]`;
                        
                        opponentNameDisplay = battle.opponentName; 
                        opponentPokemonName = battle.opponentName; 
                        opponentPokemonHP = battle.opponentHP;
                        opponentPokemonMaxHp = battle.opponentMaxHp; 
                        opponentPokemonType = battle.opponentType;
                        opponentPokemonEnergy = battle.opponentEnergy;
                        opponentPokemonMaxEnergy = battle.opponentMaxEnergy;
                        if (battle.opponentStatus) opponentPokemonStatusString = ` [${battle.opponentStatus.type.toUpperCase()}]`;
                    } else { // PvP
                        const isPlayer1 = battle.player1ID === userID;
                        const currentOpponentPlayerID = isPlayer1 ? battle.player2ID : battle.player1ID;
                        opponentNameDisplay = await usersData.getName(currentOpponentPlayerID); 

                        playerPokemonName = isPlayer1 ? battle.player1ActivePokemonName : battle.player2ActivePokemonName;
                        playerPokemonHP = isPlayer1 ? battle.player1ActivePokemonHP : battle.player2ActivePokemonHP;
                        playerPokemonMaxHp = isPlayer1 ? battle.player1ActivePokemonMaxHp : battle.player2ActivePokemonMaxHp;
                        playerPokemonType = isPlayer1 ? battle.player1ActivePokemonType : battle.player2ActivePokemonType;
                        playerPokemonEnergy = isPlayer1 ? battle.player1Energy : battle.player2Energy;
                        playerPokemonMaxEnergy = isPlayer1 ? battle.player1MaxEnergy : battle.player2MaxEnergy;
                        const playerStatus = isPlayer1 ? battle.player1Status : battle.player2Status;
                        if (playerStatus) playerPokemonStatusString = ` [${playerStatus.type.toUpperCase()}]`;

                        opponentPokemonName = isPlayer1 ? battle.player2ActivePokemonName : battle.player1ActivePokemonName; 
                        opponentPokemonHP = isPlayer1 ? battle.player2ActivePokemonHP : battle.player1ActivePokemonHP;
                        opponentPokemonMaxHp = isPlayer1 ? battle.player2ActivePokemonMaxHp : battle.player1ActivePokemonMaxHp;
                        opponentPokemonType = isPlayer1 ? battle.player2ActivePokemonType : battle.player1ActivePokemonType;
                        opponentPokemonEnergy = isPlayer1 ? battle.player2Energy : battle.player1Energy;
                        opponentPokemonMaxEnergy = isPlayer1 ? battle.player2MaxEnergy : battle.player1MaxEnergy;
                        const opponentStatus = isPlayer1 ? battle.player2Status : battle.player1Status;
                        if (opponentStatus) opponentPokemonStatusString = ` [${opponentStatus.type.toUpperCase()}]`;
                    }
                    sMsgStatus+=`⚔️ Active Battle (${battle.type.toUpperCase()}): Vs ${opponentNameDisplay}\n`;
                    sMsgStatus+=`   Your ${playerPokemonName} (${playerPokemonType} - HP: ${playerPokemonHP}/${playerPokemonMaxHp} - Energy: ${playerPokemonEnergy}/${playerPokemonMaxEnergy})${playerPokemonStatusString}\n`;
                    sMsgStatus+=`   Opponent's ${opponentPokemonName} (${opponentPokemonType} - HP: ${opponentPokemonHP}/${opponentPokemonMaxHp} - Energy: ${opponentPokemonEnergy}/${opponentPokemonMaxEnergy})${opponentPokemonStatusString}\n`; 
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
            const challengeDataForCollection = Reply.challengeData; 

            if (userAnswer === correctName) {
                api.sendMessage(`🎉 Congratulations, ${replySenderName}! You correctly identified ${challengeDataForCollection.name}!`, threadID);
                let userPokemonsReply = await getUserPokemonCollectionList(userID);
                const caughtReply = {
                    name: challengeDataForCollection.name,
                    baseHp: parseInt(challengeDataForCollection.baseHp || challengeDataForCollection.hp || 50),
                    currentHp: parseInt(challengeDataForCollection.hp || 50),
                    maxHp: parseInt(challengeDataForCollection.hp || 50),
                    type: challengeDataForCollection.type || "Unknown",
                    attacks: (challengeDataForCollection.attacks || []).map(a => ({ 
                        ...a, 
                        currentDamage: a.damage, 
                        baseDamage: a.damage    
                    })), 
                    imageUrl: challengeDataForCollection.originalImageUrl, 
                    id: `${userID}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
                    energy: parseInt(challengeDataForCollection.maxEnergy || BASE_ENERGY), 
                    maxEnergy: parseInt(challengeDataForCollection.maxEnergy || BASE_ENERGY),
                    baseMaxEnergy: parseInt(challengeDataForCollection.baseMaxEnergy || BASE_ENERGY)
                };
                userPokemonsReply.push(caughtReply);
                await saveUserPokemonCollectionList(userID, userPokemonsReply);
                api.sendMessage(`🌟 ${caughtReply.name} has been added to your collection! You can train it using "{prefix}pokemon train".`.replace('{prefix}', Reply.prefix || "!"), threadID);
                userState.coins = (userState.coins || 0) + 50;
                api.sendMessage(`💰 You earned 50 Coins! Total: ${userState.coins}`, threadID);
            } else {
                api.sendMessage(`❌ Sorry, ${replySenderName}. That's not correct. The Pokémon was ${challengeDataForCollection.name}.`, threadID);
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

            if (!originalChallengerState || 
                !originalChallengerState.pendingPvpChallenge || 
                originalChallengerState.pendingPvpChallenge.challengedUserID !== challengedUserID ||
                originalChallengerState.pendingPvpChallenge.challengerID !== originalChallengerID) { 
                return api.sendMessage("This PvP challenge is no longer valid, has expired, was cancelled, or was not intended for you.", threadID); 
            }
            
            const pendingChallengeDetails = { ...originalChallengerState.pendingPvpChallenge };
            const challengeOriginThread = pendingChallengeDetails.threadID; 

            if (pendingChallengeDetails.acceptTimeoutID) {
                clearTimeout(parseInt(pendingChallengeDetails.acceptTimeoutID));
            }
            originalChallengerState.pendingPvpChallenge = null; 

            if (responsePvP === "accept") {
                const originalChallengerName = await usersData.getName(originalChallengerID);
                const challengedPlayerName = replySenderName; 

                api.sendMessage(`✅ ${challengedPlayerName} accepted the battle challenge from ${originalChallengerName}! Setting up the battle...`, challengeOriginThread); 
                
                const challengerPokemonForBattleRaw = pendingChallengeDetails.challengerPokemonDetails; 
                 const challengerPokemonForBattle = { 
                    name: challengerPokemonForBattleRaw.name,
                    hp: challengerPokemonForBattleRaw.hp,
                    maxHp: challengerPokemonForBattleRaw.maxHp,
                    baseHp: challengerPokemonForBattleRaw.baseHp,
                    type: challengerPokemonForBattleRaw.type,
                    attacks: (challengerPokemonForBattleRaw.attacks || []).map(a => ({...a, damage: a.currentDamage || a.damage})),
                    status: null,
                    energy: challengerPokemonForBattleRaw.energy,
                    maxEnergy: challengerPokemonForBattleRaw.maxEnergy,
                    baseMaxEnergy: challengerPokemonForBattleRaw.baseMaxEnergy
                };

                let p2Collection = await getUserPokemonCollectionList(challengedUserID); 
                if (p2Collection.length === 0) { 
                    api.sendMessage({body: `❌ @${originalChallengerName}, ${challengedPlayerName} has no Pokémon. Battle cancelled.`, mentions: [{ tag: `@${originalChallengerName}`, id: originalChallengerID }]}, challengeOriginThread);
                    await saveGameStateForUser(originalChallengerID, originalChallengerState); 
                    return;
                }
                const p2FirstPokemonData = p2Collection[0]; 
                const p2PokemonForBattle = {
                    name: p2FirstPokemonData.name,
                    hp: p2FirstPokemonData.currentHp || p2FirstPokemonData.maxHp,
                    maxHp: p2FirstPokemonData.maxHp,
                    baseHp: p2FirstPokemonData.baseHp || p2FirstPokemonData.maxHp,
                    type: p2FirstPokemonData.type,
                    attacks: (p2FirstPokemonData.attacks || []).map(a => ({...a, damage: a.currentDamage || a.baseDamage || a.damage})),
                    status: null,
                    energy: p2FirstPokemonData.energy || BASE_ENERGY,
                    maxEnergy: p2FirstPokemonData.maxEnergy || BASE_ENERGY,
                    baseMaxEnergy: p2FirstPokemonData.baseMaxEnergy || BASE_ENERGY
                };


                const battleData = {
                    type: "pvp",
                    player1ID: originalChallengerID, 
                    player2ID: challengedUserID, 
                    challengeOriginThreadID: challengeOriginThread, 
                    
                    player1ActivePokemonName: challengerPokemonForBattle.name,
                    player1ActivePokemonHP: challengerPokemonForBattle.hp,
                    player1ActivePokemonMaxHp: challengerPokemonForBattle.maxHp,
                    player1ActivePokemonType: challengerPokemonForBattle.type,
                    player1ActivePokemonMoves: challengerPokemonForBattle.attacks,
                    player1Status: null,
                    player1Energy: challengerPokemonForBattle.energy,
                    player1MaxEnergy: challengerPokemonForBattle.maxEnergy,
                   
                    player2ActivePokemonName: p2PokemonForBattle.name,
                    player2ActivePokemonHP: p2PokemonForBattle.hp,
                    player2ActivePokemonMaxHp: p2PokemonForBattle.maxHp,
                    player2ActivePokemonType: p2PokemonForBattle.type, 
                    player2ActivePokemonMoves: p2PokemonForBattle.attacks,
                    player2Status: null,
                    player2Energy: p2PokemonForBattle.energy,
                    player2MaxEnergy: p2PokemonForBattle.maxEnergy,
                    
                    currentTurn: originalChallengerID 
                };

                originalChallengerState.currentBattle = battleData;
                challengedPlayerState.currentBattle = battleData;
                
                await saveGameStateForUser(originalChallengerID, originalChallengerState);
                await saveGameStateForUser(challengedUserID, challengedPlayerState);

                let pvpStartMsg = `⚔️ PvP Battle Starting in this chat! ⚔️\n\n`;
                pvpStartMsg += `${originalChallengerName} (P1) with ${battleData.player1ActivePokemonName} (${battleData.player1ActivePokemonType} - HP: ${battleData.player1ActivePokemonHP}/${battleData.player1ActivePokemonMaxHp} - Energy: ${battleData.player1Energy}/${battleData.player1MaxEnergy})\n`;
                pvpStartMsg += `vs.\n`;
                pvpStartMsg += `${challengedPlayerName} (P2) with ${battleData.player2ActivePokemonName} (${battleData.player2ActivePokemonType} - HP: ${battleData.player2ActivePokemonHP}/${battleData.player2ActivePokemonMaxHp} - Energy: ${battleData.player2Energy}/${battleData.player2MaxEnergy})\n\n`;
                
                api.sendMessage(pvpStartMsg, challengeOriginThread); 
                
                let promptToChallengerForFirstMove = `--- Your Turn, @${originalChallengerName}! ---\nChoose a move for your ${battleData.player1ActivePokemonName} (${battleData.player1ActivePokemonType}):\n`;
                (battleData.player1ActivePokemonMoves || []).forEach((move, index) => { 
                    promptToChallengerForFirstMove += `${index + 1}. ${move.name} (Dmg: ${move.damage}, Cost: ${move.energyCost}⚡)\n`; 
                });
                promptToChallengerForFirstMove += `Reply with move number.`;

                const firstMovePromptMsg = await api.sendMessage({body: promptToChallengerForFirstMove, mentions: [{ tag: `@${originalChallengerName}`, id: originalChallengerID }]}, challengeOriginThread);
                global.GoatBot.onReply.set(firstMovePromptMsg.messageID,{commandName:this.config.name,senderID:originalChallengerID,type:"battle_move",originalMID:firstMovePromptMsg.messageID}); 
                
            } else if (responsePvP === "decline") { 
                api.sendMessage(`❌ ${replySenderName} declined the battle challenge.`, challengeOriginThread); 
                await saveGameStateForUser(originalChallengerID, originalChallengerState); 
            } else { 
                originalChallengerState.pendingPvpChallenge = pendingChallengeDetails; 
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
            const battleCommThread = battle.challengeOriginThreadID || threadID; 

            if (battle.currentTurn !== currentPlayerID) {
                return api.sendMessage(`⏳ It's not your turn! Please wait for ${await usersData.getName(battle.currentTurn)}.`, threadID); 
            }

            let battleMessages = []; 
            let attacker, defender, attackerName, defenderName, attackerProps, defenderProps, isP1AttackingGlobal = null;
            
            if (battle.type === "ai") {
                attackerProps = {
                    nameKey: 'playerActivePokemonName', hpKey: 'playerActivePokemonHP', maxHpKey: 'playerActivePokemonMaxHp',
                    typeKey: 'playerActivePokemonType', movesKey: 'playerActivePokemonMoves', statusKey: 'playerActivePokemonStatus',
                    energyKey: 'playerActivePokemonEnergy', maxEnergyKey: 'playerActivePokemonMaxEnergy'
                };
                defenderProps = {
                    nameKey: 'opponentName', hpKey: 'opponentHP', maxHpKey: 'opponentMaxHp',
                    typeKey: 'opponentType', movesKey: 'opponentMoves', statusKey: 'opponentStatus',
                    energyKey: 'opponentEnergy', maxEnergyKey: 'opponentMaxEnergy'
                };
                attackerName = replySenderName; 
                defenderName = `AI ${battle[defenderProps.nameKey]}`;
            } else { // PvP
                isP1AttackingGlobal = battle.player1ID === currentPlayerID;
                attackerProps = isP1AttackingGlobal ? {
                    nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp',
                    typeKey: 'player1ActivePokemonType', movesKey: 'player1ActivePokemonMoves', statusKey: 'player1Status',
                    energyKey: 'player1Energy', maxEnergyKey: 'player1MaxEnergy'
                } : {
                    nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp',
                    typeKey: 'player2ActivePokemonType', movesKey: 'player2ActivePokemonMoves', statusKey: 'player2Status',
                    energyKey: 'player2Energy', maxEnergyKey: 'player2MaxEnergy'
                };
                defenderProps = isP1AttackingGlobal ? {
                    nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp',
                    typeKey: 'player2ActivePokemonType', movesKey: 'player2ActivePokemonMoves', statusKey: 'player2Status',
                    energyKey: 'player2Energy', maxEnergyKey: 'player2MaxEnergy'
                } : {
                    nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp',
                    typeKey: 'player1ActivePokemonType', movesKey: 'player1ActivePokemonMoves', statusKey: 'player1Status',
                    energyKey: 'player1Energy', maxEnergyKey: 'player1MaxEnergy'
                };
                attackerName = await usersData.getName(currentPlayerID);
                defenderName = await usersData.getName(isP1AttackingGlobal ? battle.player2ID : battle.player1ID);
            }

            attacker = { name: battle[attackerProps.nameKey], hp: battle[attackerProps.hpKey], maxHp: battle[attackerProps.maxHpKey], type: battle[attackerProps.typeKey], moves: battle[attackerProps.movesKey] || [], status: battle[attackerProps.statusKey], energy: battle[attackerProps.energyKey], maxEnergy: battle[attackerProps.maxEnergyKey] };
            defender = { name: battle[defenderProps.nameKey], hp: battle[defenderProps.hpKey], maxHp: battle[defenderProps.maxHpKey], type: battle[defenderProps.typeKey], moves: battle[defenderProps.movesKey] || [], status: battle[defenderProps.statusKey], energy: battle[defenderProps.energyKey], maxEnergy: battle[defenderProps.maxEnergyKey] };

            battleMessages.push(`\n--- ${attackerName}'s Turn (${attacker.type} - Energy: ${attacker.energy}/${attacker.maxEnergy}) ---`);
            
            battle[attackerProps.energyKey] = Math.min(attacker.maxEnergy, attacker.energy + ENERGY_RECOVERY_PER_TURN);
            attacker.energy = battle[attackerProps.energyKey]; 
            battleMessages.push(`✨ ${attacker.name} recovered ${ENERGY_RECOVERY_PER_TURN} energy! (Now: ${attacker.energy}/${attacker.maxEnergy})`);


            let playerCanAttack = true; 
            if (attacker.status) {
                switch (attacker.status.type) {
                    case STATUS_CONDITIONS.ASLEEP:
                        if (Math.random() < 0.5) { 
                            battleMessages.push(`☀️ ${attacker.name} woke up!`);
                            battle[attackerProps.statusKey] = null;
                        } else {
                            battleMessages.push(`😴 ${attacker.name} is fast asleep.`);
                            playerCanAttack = false;
                        }
                        break;
                    case STATUS_CONDITIONS.PARALYZED:
                        battleMessages.push(`⚡ ${attacker.name} is paralyzed! It can't move!`);
                        battle[attackerProps.statusKey] = null; 
                        playerCanAttack = false;
                        break;
                    case STATUS_CONDITIONS.CONFUSED:
                        battleMessages.push(`❓ ${attacker.name} is confused!`);
                        if (Math.random() < 0.5) { 
                            battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - CONFUSION_SELF_DAMAGE);
                            battleMessages.push(`💥 It hurt itself in its confusion for ${CONFUSION_SELF_DAMAGE} damage! ${attacker.name} HP: ${battle[attackerProps.hpKey]}/${attacker.maxHp}`);
                            playerCanAttack = false;
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
            let restedThisTurn = false;
            if (playerCanAttack && battle[attackerProps.hpKey] > 0) { 
                const chosenMoveIndex = parseInt(event.body.trim()) - 1;
                if (isNaN(chosenMoveIndex) || chosenMoveIndex < 0 || chosenMoveIndex >= attacker.moves.length) {
                    battleMessages.push("⚠️ Invalid move selection. Turn skipped by resting.");
                    playerCanAttack = false; 
                    battle[attackerProps.energyKey] = Math.min(attacker.maxEnergy, attacker.energy + REST_ENERGY_RECOVERY);
                    attacker.energy = battle[attackerProps.energyKey];
                    battleMessages.push(`🧘 ${attacker.name} rests and recovers ${REST_ENERGY_RECOVERY} energy due to invalid move! (Now: ${attacker.energy}/${attacker.maxEnergy})`);
                    restedThisTurn = true;
                } else {
                    selectedMove = attacker.moves[chosenMoveIndex];
                    if (attacker.energy < selectedMove.energyCost) {
                        battleMessages.push(`⚠️ Not enough energy for ${selectedMove.name} (needs ${selectedMove.energyCost}⚡, has ${attacker.energy}⚡)!`);
                        battle[attackerProps.energyKey] = Math.min(attacker.maxEnergy, attacker.energy + REST_ENERGY_RECOVERY);
                        attacker.energy = battle[attackerProps.energyKey];
                        battleMessages.push(`🧘 ${attacker.name} rests and recovers ${REST_ENERGY_RECOVERY} energy! (Now: ${attacker.energy}/${attacker.maxEnergy})`);
                        playerCanAttack = false; 
                        selectedMove = null; 
                        restedThisTurn = true;
                    }
                }
            } else if (battle[attackerProps.hpKey] <= 0) { 
                 playerCanAttack = false; 
            }


            if (playerCanAttack && selectedMove) {
                battle[attackerProps.energyKey] -= selectedMove.energyCost;
                attacker.energy = battle[attackerProps.energyKey]; 
                battleMessages.push(`💥 ${attackerName}'s ${attacker.name} used ${selectedMove.name}! (Cost: ${selectedMove.energyCost}⚡, Remaining: ${attacker.energy}/${attacker.maxEnergy})`);
                if (selectedMove.text) battleMessages.push(`   ${selectedMove.text}`);

                let damageDealt = 0;
                if (Math.random() < MISS_CHANCE) {
                    battleMessages.push(`💨 ${attacker.name}'s ${selectedMove.name} missed!`);
                } else {
                    const moveBaseDamage = selectedMove.damage; 
                    const advantageMultiplier = this.getTypeAdvantage(attacker.type, defender.type);
                    damageDealt = Math.max(0, Math.floor(moveBaseDamage * advantageMultiplier));
                    
                    if (Math.random() < CRIT_CHANCE) {
                        damageDealt = Math.floor(damageDealt * CRIT_MULTIPLIER);
                        battleMessages.push("💥 A Critical Hit!");
                    }
                    
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
                }
                battleMessages.push(`${defender.name} (${defender.type}) HP: ${battle[defenderProps.hpKey]}/${battle[defenderProps.maxHpKey]} - Energy: ${battle[defenderProps.energyKey]}/${battle[defenderProps.maxEnergyKey]}`);
            }
            
            let battleEnded = false;
            if (battle[defenderProps.hpKey] <= 0) { 
                battleMessages.push(`☠️ ${defender.name} fainted!`);
                battleMessages.push(`🎉 ${attackerName} wins the battle!`);
                userState.coins = (userState.coins || 0) + (battle.type === "ai" ? 75 : 150);
                battleMessages.push(`💰 ${attackerName} earned ${battle.type === "ai" ? 75 : 150} coins! Total: ${userState.coins}`);
                battleEnded = true;
            } else if (battle[attackerProps.hpKey] <= 0 && (!playerCanAttack || restedThisTurn) ) { 
                 battleMessages.push(`🎉 ${defenderName} wins the battle!`);
                 if (battle.type === "pvp") {
                    const winnerID = isP1AttackingGlobal ? battle.player2ID : battle.player1ID;
                    let winnerState = await getGameStateForUser(winnerID);
                    if(winnerState){ 
                        winnerState.coins = (winnerState.coins || 0) + 150; 
                        await saveGameStateForUser(winnerID, winnerState); 
                        try { 
                            api.sendMessage({body: `💰 You earned 150 coins as ${attackerName} fainted!`, mentions:[]}, battleCommThread, null, winnerID); // Corrected sendMessage
                        } catch(e){}
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
                return api.sendMessage(battleMessages.join('\n'), battleCommThread); 
            }

            if (attacker.status && (playerCanAttack || restedThisTurn) && battle[attackerProps.hpKey] > 0) { 
                switch(attacker.status.type) {
                    case STATUS_CONDITIONS.POISONED:
                        battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - POISON_DAMAGE);
                        battleMessages.push(`🤢 ${attacker.name} took ${POISON_DAMAGE} damage from poison! HP: ${battle[attackerProps.hpKey]}/${attacker.maxHp}`);
                        break;
                    case STATUS_CONDITIONS.BURNED:
                        battleMessages.push(`🔥 ${attacker.name} is burned! Flipping a coin...`);
                        if (Math.random() < 0.5) { 
                            battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - BURN_DAMAGE);
                            battleMessages.push(`💥 Coin was TAILS! Took ${BURN_DAMAGE} damage from burn! HP: ${battle[attackerProps.hpKey]}/${attacker.maxHp}`);
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
                            try { 
                                api.sendMessage({body: `💰 You earned 150 coins as ${attackerName} fainted from status!`, mentions:[]}, battleCommThread, null, winnerID); // Corrected sendMessage
                            } catch(e){}
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
                return api.sendMessage(battleMessages.join('\n'), battleCommThread);
            }

            let nextTurnPlayerID = null;
            if (battle.type === "ai") {
                battleMessages.push(`\n--- AI ${battle[defenderProps.nameKey]}'s Turn (${battle[defenderProps.typeKey]} - Energy: ${battle[defenderProps.energyKey]}/${battle[defenderProps.maxEnergyKey]}) ---`);
                battle[defenderProps.energyKey] = Math.min(battle[defenderProps.maxEnergyKey], battle[defenderProps.energyKey] + ENERGY_RECOVERY_PER_TURN);
                battleMessages.push(`✨ AI ${defender.name} recovered ${ENERGY_RECOVERY_PER_TURN} energy! (Now: ${battle[defenderProps.energyKey]}/${battle[defenderProps.maxEnergyKey]})`);

                let aiCanAttack = true; 
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
                    let aiSelectedMove = null;
                    if (aiMoves.length > 0) {
                        const usableMoves = aiMoves.filter(m => battle[defenderProps.energyKey] >= m.energyCost);
                        if (usableMoves.length > 0) {
                            const playerPokemonTypeForAI = battle[attackerProps.typeKey]; 
                            const aiPokemonTypeForAI = battle[defenderProps.typeKey]; 
                            
                            const superEffectiveUsableMoves = usableMoves.filter(move => move.damage > 0 && this.getTypeAdvantage(aiPokemonTypeForAI, playerPokemonTypeForAI) === 2);
                            const normalEffectiveUsableMoves = usableMoves.filter(move => move.damage > 0 && this.getTypeAdvantage(aiPokemonTypeForAI, playerPokemonTypeForAI) === 1);

                            if (superEffectiveUsableMoves.length > 0 && Math.random() < 0.75) { 
                                aiSelectedMove = superEffectiveUsableMoves[Math.floor(Math.random() * superEffectiveUsableMoves.length)];
                                battleMessages.push(`🤖 AI ${defender.name} is looking for a strategic advantage...`);
                            } else if (normalEffectiveUsableMoves.length > 0 && Math.random() < 0.6) { 
                                aiSelectedMove = normalEffectiveUsableMoves[Math.floor(Math.random() * normalEffectiveUsableMoves.length)];
                            } else { 
                                aiSelectedMove = usableMoves[Math.floor(Math.random() * usableMoves.length)];
                            }
                        } else {
                             battleMessages.push(`AI ${defender.name} doesn't have enough energy for any moves and rests!`);
                             battle[defenderProps.energyKey] = Math.min(battle[defenderProps.maxEnergyKey], battle[defenderProps.energyKey] + REST_ENERGY_RECOVERY);
                             battleMessages.push(`🧘 AI ${defender.name} recovered ${REST_ENERGY_RECOVERY} energy! (Now: ${battle[defenderProps.energyKey]}/${battle[defenderProps.maxEnergyKey]})`);
                        }
                        
                        if (aiSelectedMove) {
                            battle[defenderProps.energyKey] -= aiSelectedMove.energyCost;
                            battleMessages.push(`💢 AI ${defender.name} used ${aiSelectedMove.name}! (Cost: ${aiSelectedMove.energyCost}⚡, Remaining: ${battle[defenderProps.energyKey]}/${battle[defenderProps.maxEnergyKey]})`);
                            
                            let aiDamageDealt = 0;
                            if (Math.random() < MISS_CHANCE) {
                                battleMessages.push(`💨 AI ${defender.name}'s ${aiSelectedMove.name} missed!`);
                            } else {
                                const aiMoveBaseDamage = aiSelectedMove.damage;
                                const aiPokemonTypeForAI = battle[defenderProps.typeKey]; 
                                const playerPokemonTypeForAI = battle[attackerProps.typeKey]; 
                                const aiAdvantageMultiplier = this.getTypeAdvantage(aiPokemonTypeForAI, playerPokemonTypeForAI); 
                                aiDamageDealt = Math.max(0, Math.floor(aiMoveBaseDamage * aiAdvantageMultiplier));
                                if (Math.random() < CRIT_CHANCE) {
                                    aiDamageDealt = Math.floor(aiDamageDealt * CRIT_MULTIPLIER);
                                    battleMessages.push("💥 A Critical Hit from the AI!");
                                }
                                battle[attackerProps.hpKey] = Math.max(0, battle[attackerProps.hpKey] - aiDamageDealt);
                                battleMessages.push(`⚔️ It dealt ${aiDamageDealt} damage to your ${attacker.name}.`);
                                if (aiAdvantageMultiplier === 2) battleMessages.push("It's super effective against your Pokémon!");
                                if (aiAdvantageMultiplier === 0.5) battleMessages.push("It's not very effective against your Pokémon...");

                                if (aiSelectedMove.text) battleMessages.push(`   Effect: ${aiSelectedMove.text}`);
                                if (aiSelectedMove.effect && (!battle[attackerProps.statusKey] || aiSelectedMove.effect.type !== battle[attackerProps.statusKey].type) ) {
                                    if (Math.random() < (aiSelectedMove.effect.chance || 1.0)) {
                                        battle[attackerProps.statusKey] = { type: aiSelectedMove.effect.type, turns: (aiSelectedMove.effect.type === STATUS_CONDITIONS.PARALYZED ? 1 : undefined) };
                                        battleMessages.push(`✨ Your ${attacker.name} is now ${aiSelectedMove.effect.type.toUpperCase()}!`);
                                    }
                                }
                            }
                            battleMessages.push(`Your ${attacker.name} (${attacker.type}) HP: ${battle[attackerProps.hpKey]}/${attacker.maxHp} - Energy: ${battle[attackerProps.energyKey]}/${attacker.maxEnergy}`);
                            if (battle[attackerProps.hpKey] <= 0) { 
                                battleMessages.push(`☠️ Your ${attacker.name} fainted!`);
                                battleMessages.push(`👎 AI ${defender.name} wins the battle!`);
                                battleEnded = true;
                            }
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
                    return api.sendMessage(battleMessages.join('\n'), battleCommThread);
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
                const currentAttacker = { name: battle[attackerProps.nameKey], hp: battle[attackerProps.hpKey], maxHp: battle[attackerProps.maxHpKey], type: battle[attackerProps.typeKey], status: battle[attackerProps.statusKey], moves: battle[attackerProps.movesKey] || [], energy: battle[attackerProps.energyKey], maxEnergy: battle[attackerProps.maxEnergyKey] };
                const currentDefender = { name: battle[defenderProps.nameKey], hp: battle[defenderProps.hpKey], maxHp: battle[defenderProps.maxHpKey], type: battle[defenderProps.typeKey], status: battle[defenderProps.statusKey], energy: battle[defenderProps.energyKey], maxEnergy: battle[defenderProps.maxEnergyKey] };
                let nextPrompt = `\n\n--- Your Turn, ${attackerName}! ---\n`;
                nextPrompt += `Your ${currentAttacker.name} (${currentAttacker.type} - HP: ${currentAttacker.hp}/${currentAttacker.maxHp} - Energy: ${currentAttacker.energy}/${currentAttacker.maxEnergy})${currentAttacker.status ? ` [${currentAttacker.status.type.toUpperCase()}]` : ''}\n`;
                nextPrompt += `Opponent's ${currentDefender.name} (${currentDefender.type} - HP: ${currentDefender.hp}/${currentDefender.maxHp} - Energy: ${currentDefender.energy}/${currentDefender.maxEnergy})${currentDefender.status ? ` [${currentDefender.status.type.toUpperCase()}]` : ''}\n`;
                nextPrompt += `Choose a move:\n`;
                currentAttacker.moves.forEach((m,i) => { nextPrompt += `${i+1}. ${m.name} (Dmg: ${m.damage}, Cost: ${m.energyCost}⚡)\n`;}); 
                nextPrompt += `Reply with move number.`;
                const rMsg = await api.sendMessage(battleMessages.join('\n') + nextPrompt, threadID);
                global.GoatBot.onReply.set(rMsg.messageID, { commandName: this.config.name, senderID: userID, type: "battle_move", originalMID: rMsg.messageID });

            } else if (battle.type === "pvp" && nextTurnPlayerID && nextTurnPlayerID !== userID ) { 
                api.sendMessage({body: battleMessages.join('\n') + `\n\n➡️ Turn passes to @${await usersData.getName(nextTurnPlayerID)}.`, mentions: [{tag: `@${await usersData.getName(nextTurnPlayerID)}`, id: nextTurnPlayerID}]}, battleCommThread); 

                const nextPlayerIsP1 = battle.player1ID === nextTurnPlayerID;
                const nextPlayerAttackerPropsHandle = nextPlayerIsP1 ? { nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp', typeKey: 'player1ActivePokemonType', movesKey: 'player1ActivePokemonMoves', statusKey: 'player1Status', energyKey: 'player1Energy', maxEnergyKey: 'player1MaxEnergy'} : { nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp', typeKey: 'player2ActivePokemonType', movesKey: 'player2ActivePokemonMoves', statusKey: 'player2Status', energyKey: 'player2Energy', maxEnergyKey: 'player2MaxEnergy'};
                const nextPlayerDefenderPropsHandle = nextPlayerIsP1 ? { nameKey: 'player2ActivePokemonName', hpKey: 'player2ActivePokemonHP', maxHpKey: 'player2ActivePokemonMaxHp', typeKey: 'player2ActivePokemonType', statusKey: 'player2Status', energyKey: 'player2Energy', maxEnergyKey: 'player2MaxEnergy'} : { nameKey: 'player1ActivePokemonName', hpKey: 'player1ActivePokemonHP', maxHpKey: 'player1ActivePokemonMaxHp', typeKey: 'player1ActivePokemonType', statusKey: 'player1Status', energyKey: 'player1Energy', maxEnergyKey: 'player1MaxEnergy'};
                
                const nextPlayerActive = { name: battle[nextPlayerAttackerPropsHandle.nameKey], hp: battle[nextPlayerAttackerPropsHandle.hpKey], maxHp: battle[nextPlayerAttackerPropsHandle.maxHpKey], type: battle[nextPlayerAttackerPropsHandle.typeKey], status: battle[nextPlayerAttackerPropsHandle.statusKey], moves: battle[nextPlayerAttackerPropsHandle.movesKey] || [], energy: battle[nextPlayerAttackerPropsHandle.energyKey], maxEnergy: battle[nextPlayerAttackerPropsHandle.maxEnergyKey] };
                const opponentForNext = { name: battle[nextPlayerDefenderPropsHandle.nameKey], hp: battle[nextPlayerDefenderPropsHandle.hpKey], maxHp: battle[nextPlayerDefenderPropsHandle.maxHpKey], type: battle[nextPlayerDefenderPropsHandle.typeKey], status: battle[nextPlayerDefenderPropsHandle.statusKey], energy: battle[nextPlayerDefenderPropsHandle.energyKey], maxEnergy: battle[nextPlayerDefenderPropsHandle.maxEnergyKey] };
                const opponentNameForNextDisplay = await usersData.getName(nextPlayerIsP1 ? battle.player2ID : battle.player1ID);
                const nextPlayerName = await usersData.getName(nextTurnPlayerID);

                let promptToNextPlayer = `--- Your Turn, @${nextPlayerName}! ---\n`;
                promptToNextPlayer += `Your ${nextPlayerActive.name} (${nextPlayerActive.type} - HP: ${nextPlayerActive.hp}/${nextPlayerActive.maxHp} - Energy: ${nextPlayerActive.energy}/${nextPlayerActive.maxEnergy})${nextPlayerActive.status ? ` [${nextPlayerActive.status.type.toUpperCase()}]` : ''}\n`;
                promptToNextPlayer += `Opponent ${opponentNameForNextDisplay}'s ${opponentForNext.name} (${opponentForNext.type} - HP: ${opponentForNext.hp}/${opponentForNext.maxHp} - Energy: ${opponentForNext.energy}/${opponentForNext.maxEnergy})${opponentForNext.status ? ` [${opponentForNext.status.type.toUpperCase()}]` : ''}\n`;
                promptToNextPlayer += `Choose a move:\n`;
                (nextPlayerActive.moves || []).forEach((m,i) => { promptToNextPlayer += `${i+1}. ${m.name} (Dmg: ${m.damage}, Cost: ${m.energyCost}⚡)\n`;}); 
                promptToNextPlayer += `Reply with move number.`;
                
                const nextMovePromptMsg = await api.sendMessage({body: promptToNextPlayer, mentions: [{tag: `@${nextPlayerName}`, id: nextTurnPlayerID}]}, battleCommThread);
                global.GoatBot.onReply.set(nextMovePromptMsg.messageID, { commandName: this.config.name, senderID: nextTurnPlayerID, type: "battle_move", originalMID: nextMovePromptMsg.messageID });
                
            } else if (battleMessages.length > 0 && userState.currentBattle) { 
                api.sendMessage(battleMessages.join('\n'), battleCommThread);
            }
        }
    }
};

module.exports = cmdModule;
