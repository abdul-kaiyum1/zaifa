// scripts/cmds/pokemon.js

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// Paths to game data files
const USER_POKEMON_FILE = path.join(__dirname, 'user_pokemon.json');
const GAME_STATE_FILE = path.join(__dirname, 'game_state.json');

module.exports = {
  config: {
    name: "pokemon",
    aliases: ["pkmn"],
    version: "1.1.0", // Updated version for PvP
    author: "Abdul Kaiyum",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Start daily challenges, engage in Pokémon battles (AI or PvP), and check leaderboards."
    },
    longDescription: {
      en: "Embark on a Pokémon TCG Battle Adventure! Complete daily challenges to catch new Pokémon, test your deck against AI opponents or other trainers in PvP, and see who the top trainers are."
    },
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

  // --- Helper Functions for Data Management ---

  async getGameStates() {
    try {
      if (!await fs.pathExists(GAME_STATE_FILE)) {
        await fs.writeFile(GAME_STATE_FILE, JSON.stringify({}, null, 2), "utf8");
        return {};
      }
      const data = await fs.readFile(GAME_STATE_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading game_state.json:", error);
      return {};
    }
  },

  async saveGameStates(states) {
    try {
      await fs.writeFile(GAME_STATE_FILE, JSON.stringify(states, null, 2), "utf8");
    } catch (error) {
      console.error("Error writing game_state.json:", error);
    }
  },

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
      const cards = response.data.data.filter(card => card.images && card.images.large);
      return cards.length > 0 ? cards[0] : null;
    } catch (error) {
      console.error(`Error fetching Pokémon details for ${pokemonName}:`, error.message);
      return null;
    }
  },

  async getRandomPokemonForChallenge() {
    try {
      const types = ["fire", "water", "grass", "lightning", "fighting", "psychic", "darkness", "metal", "fairy", "dragon", "colorless"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=types:${randomType} supertype:pokemon`, {
        headers: {
          'X-Api-Key': '4b2b15c7-27f0-4c3e-aa24-8474d551500c' // <<< REPLACE WITH YOUR ACTUAL API KEY
        },
        params: {
            pageSize: 50
        }
      });
      const playableCards = response.data.data.filter(card => card.images && card.images.large && card.hp && card.attacks);

      if (playableCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * playableCards.length);
        const randomCard = playableCards[randomIndex];
        return {
          name: randomCard.name,
          imageUrl: randomCard.images.large,
          hp: randomCard.hp,
          type: randomCard.types && randomCard.types.length > 0 ? randomCard.types[0] : "Colorless",
          attack: randomCard.attacks && randomCard.attacks.length > 0 ? (randomCard.attacks[0].damage || '0').replace(/\D/g,'') : '0'
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching random Pokémon for challenge:", error.message);
      return null;
    }
  },

  getTypeAdvantage(attackingType, defendingType) {
    const advantages = {
      "Fire": { weakTo: ["Water"], strongAgainst: ["Grass", "Metal"] },
      "Water": { weakTo: ["Lightning", "Grass"], strongAgainst: ["Fire", "Fighting"] },
      "Grass": { weakTo: ["Fire", "Fighting"], strongAgainst: ["Water", "Lightning"] },
      "Lightning": { weakTo: ["Fighting"], strongAgainst: ["Water", "Colorless"] },
      "Fighting": { weakTo: ["Psychic", "Fairy"], strongAgainst: ["Darkness", "Metal", "Colorless"] },
      "Psychic": { weakTo: ["Darkness"], strongAgainst: ["Fighting"] },
      "Darkness": { weakTo: ["Fighting"], strongAgainst: ["Psychic"] },
      "Colorless": { weakTo: [], strongAgainst: [] },
      "Metal": { weakTo: ["Fire", "Fighting"], strongAgainst: ["Fairy", "Water"] },
      "Fairy": { weakTo: ["Metal", "Poison"], strongAgainst: ["Fighting", "Dragon"] },
      "Dragon": { weakTo: ["Fairy"], strongAgainst: ["Dragon"] }
    };

    const attackerInfo = advantages[attackingType];
    if (attackerInfo) {
      if (attackerInfo.strongAgainst && attackerInfo.strongAgainst.includes(defendingType)) {
        return 2;
      }
      if (attackerInfo.weakTo && attackerInfo.weakTo.includes(defendingType)) {
        return 0.5;
      }
    }
    return 1;
  },

  // --- Main Command Logic ---
  onStart: async function ({ api, event, args, usersData }) {
    const userID = event.senderID;
    const threadID = event.threadID;
    const userName = await usersData.getName(userID);

    const gameStates = await this.getGameStates();
    // Initialize user state if it doesn't exist
    if (!gameStates[userID]) {
        gameStates[userID] = { coins: 100, currentChallenge: null, currentBattle: null, pendingPvpChallenge: null };
        await this.saveGameStates(gameStates);
    }
    let userState = gameStates[userID];

    // Check for active challenges/battles first
    if (userState.currentChallenge) {
      return api.sendMessage(`You have an active Pokémon identification challenge! Reply to the image with the Pokémon's name.`, threadID);
    }

    if (userState.currentBattle) {
      let battleMsg = `⚔️ You are currently in a battle against ${userState.currentBattle.opponentName || userState.currentBattle.player2Name}!\n\n`;
      battleMsg += `Your active Pokémon: ${userState.currentBattle.playerActivePokemonName} (HP: ${userState.currentBattle.playerActivePokemonHP}/${userState.currentBattle.playerActivePokemonMaxHp})\n`;
      if (userState.currentBattle.opponentName) { // AI Battle
          battleMsg += `Opponent: ${userState.currentBattle.opponentName} (HP: ${userState.currentBattle.opponentHP})\n\n`;
          battleMsg += `It's your turn! Reply with "attack" to use ${userState.currentBattle.playerActivePokemonName}'s basic attack.`;
      } else { // PvP Battle
          const otherPlayerID = userState.currentBattle.player1ID === userID ? userState.currentBattle.player2ID : userState.currentBattle.player1ID;
          const otherPlayerName = await usersData.getName(otherPlayerID);
          const otherPlayerState = gameStates[otherPlayerID].currentBattle; // Get their current battle state

          let otherPlayerPokemonName = "";
          let otherPlayerPokemonHP = "";

          if (userState.currentBattle.player1ID === userID) { // If current user is Player 1
              otherPlayerPokemonName = otherPlayerState.playerActivePokemonName;
              otherPlayerPokemonHP = otherPlayerState.playerActivePokemonHP;
          } else { // If current user is Player 2
              otherPlayerPokemonName = otherPlayerState.playerActivePokemonName;
              otherPlayerPokemonHP = otherPlayerState.playerActivePokemonHP;
          }

          battleMsg += `${otherPlayerName}'s active Pokémon: ${otherPlayerPokemonName} (HP: ${otherPlayerPokemonHP})\n\n`;
          battleMsg += `It's currently ${userState.currentBattle.currentTurn === userID ? 'your' : otherPlayerName + "'s"} turn!\n`;
          battleMsg += `If it's your turn, reply with "attack" to use ${userState.currentBattle.playerActivePokemonName}'s basic attack.`;
      }
      return api.sendMessage(battleMsg, threadID);
    }

    // Check for pending PvP challenges (user sent a challenge)
    if (userState.pendingPvpChallenge) {
        const challengedUserName = await usersData.getName(userState.pendingPvpChallenge.challengedUserID);
        return api.sendMessage(`You have a pending PvP challenge to ${challengedUserName}. Waiting for them to accept.`, threadID);
    }

    // Check for pending PvP challenges (user received a challenge)
    const pendingChallengesForUser = Object.values(gameStates).find(state => 
        state.pendingPvpChallenge && state.pendingPvpChallenge.challengedUserID === userID
    );
    if (pendingChallengesForUser) {
        const challengerName = await usersData.getName(pendingChallengesForUser.pendingPvpChallenge.challengerID);
        return api.sendMessage(`You have a pending PvP challenge from ${challengerName}! Reply to their challenge message with "accept" or "decline".`, threadID);
    }

    const command = args[0]?.toLowerCase();
    const subCommand = args[1]?.toLowerCase();

    switch (command) {
      case "challenge":
        api.sendMessage("Starting a daily Pokémon identification challenge...", threadID);
        const challengePokemon = await this.getRandomPokemonForChallenge();

        if (challengePokemon && challengePokemon.imageUrl) {
          userState.currentChallenge = {
            name: challengePokemon.name,
            imageUrl: challengePokemon.imageUrl,
            hp: challengePokemon.hp,
            type: challengePokemon.type,
            attack: challengePokemon.attack
          };
          gameStates[userID] = userState;
          await this.saveGameStates(gameStates);

          let attachment = null;
          try {
              if (global.utils && typeof global.utils.getStreamFromURL === 'function') {
                  attachment = await global.utils.getStreamFromURL(challengePokemon.imageUrl);
              } else {
                  console.warn("global.utils.getStreamFromURL is not defined. Cannot attach image.");
              }
          } catch (error) {
              console.error("Failed to get image stream for challenge:", error);
          }

          const replyMessage = await api.sendMessage({
            body: `❓ Daily Challenge! What is the name of this Pokémon? Reply to this message with its name!`,
            attachment: attachment
          }, threadID);

          global.GoatBot.onReply.set(replyMessage.messageID, {
            commandName: this.config.name,
            senderID: userID,
            challengeData: userState.currentChallenge,
            type: "challenge_answer",
            originalMID: replyMessage.messageID
          });
        } else {
          api.sendMessage("❌ Could not generate a challenge right now. Please try again later.", threadID);
        }
        break;

      case "battle":
        const userPokemonCollection = await this.getUserPokemonCollections();
        const userActivePokemonList = userPokemonCollection[userID] || [];

        if (userActivePokemonList.length === 0) {
          return api.sendMessage(`You need at least one Pokémon to battle! Complete challenges to catch some.`, threadID);
        }
        
        const playerActivePokemon = userActivePokemonList[0]; // Always use the first Pokémon for simplicity

        if (!subCommand) {
             return api.sendMessage(`Please specify battle type: "${this.config.name} battle ai" or "${this.config.name} battle pvp <@user>".`, threadID);
        }

        if (subCommand === "ai") {
            api.sendMessage("Initiating an AI Pokémon battle...", threadID);
            const opponentPokemon = await this.getRandomPokemonForChallenge();
            if (!opponentPokemon) {
                return api.sendMessage("❌ Could not set up an AI opponent. Try again later.", threadID);
            }

            userState.currentBattle = {
              type: "ai",
              opponentName: opponentPokemon.name,
              opponentHP: parseInt(opponentPokemon.hp),
              opponentType: opponentPokemon.type,
              opponentAttack: parseInt(opponentPokemon.attack),
              playerActivePokemonName: playerActivePokemon.name,
              playerActivePokemonHP: parseInt(playerActivePokemon.hp),
              playerActivePokemonMaxHp: parseInt(playerActivePokemon.maxHp), // Store max HP for display
              playerActivePokemonType: playerActivePokemon.type,
              playerActivePokemonAttack: parseInt(playerActivePokemon.attack),
              playerPokemonIndex: 0, // Index in user's collection for updating HP
              currentTurn: userID // Player always starts AI battle
            };
            gameStates[userID] = userState;
            await this.saveGameStates(gameStates);

            let battleStartMsg = `⚔️ ${userName} challenges ${userState.currentBattle.opponentName}!\n\n`;
            battleStartMsg += `Your active Pokémon: ${userState.currentBattle.playerActivePokemonName} (HP: ${userState.currentBattle.playerActivePokemonHP}/${userState.currentBattle.playerActivePokemonMaxHp}, Type: ${userState.currentBattle.playerActivePokemonType})\n`;
            battleStartMsg += `Opponent: ${userState.currentBattle.opponentName} (HP: ${userState.currentBattle.opponentHP}, Type: ${userState.currentBattle.opponentType})\n\n`;
            battleStartMsg += `It's your turn! Reply with "attack" to use ${userState.currentBattle.playerActivePokemonName}'s basic attack.`;
            
            const battleMsg = await api.sendMessage(battleStartMsg, threadID);
            global.GoatBot.onReply.set(battleMsg.messageID, {
                commandName: this.config.name,
                senderID: userID,
                type: "battle_move",
                originalMID: battleMsg.messageID
            });

        } else if (subCommand === "pvp") {
            const challengedUserIDs = Object.keys(event.mentions);
            if (challengedUserIDs.length === 0) {
                return api.sendMessage(`Please tag the player you want to challenge, e.g., "${this.config.name} battle pvp @user".`, threadID);
            }
            const challengedUserID = challengedUserIDs[0];
            const challengedUserName = await usersData.getName(challengedUserID);

            if (challengedUserID === userID) {
                return api.sendMessage(`You cannot challenge yourself to a battle!`, threadID);
            }
            
            // Check if challenged user already in a battle or challenge
            if (gameStates[challengedUserID]?.currentBattle || gameStates[challengedUserID]?.currentChallenge || gameStates[challengedUserID]?.pendingPvpChallenge) {
                return api.sendMessage(`${challengedUserName} is currently busy with another challenge or battle.`, threadID);
            }
            
            const challengedUserPokemonCollection = await this.getUserPokemonCollections();
            const challengedUserActivePokemonList = challengedUserPokemonCollection[challengedUserID] || [];
            if (challengedUserActivePokemonList.length === 0) {
                return api.sendMessage(`${challengedUserName} doesn't have any Pokémon to battle with yet!`, threadID);
            }

            // Set pending PvP challenge state for challenger
            userState.pendingPvpChallenge = {
                challengerID: userID,
                challengedUserID: challengedUserID,
                threadID: threadID, // Store threadID for response
                challengerPokemon: playerActivePokemon // Store challenger's pokemon
            };
            gameStates[userID] = userState;
            await this.saveGameStates(gameStates);

            // Send challenge message to challenged user
            const challengeMsg = await api.sendMessage(`🔔 ${userName} has challenged you to a Pokémon battle!\n\nReply to this message with "accept" or "decline" to respond.`, challengedUserID);
            
            global.GoatBot.onReply.set(challengeMsg.messageID, {
                commandName: this.config.name,
                senderID: challengedUserID, // This reply is for the challenged user
                type: "pvp_challenge_response",
                challengerID: userID,
                originalMID: challengeMsg.messageID
            });
            api.sendMessage(`Challenge sent to ${challengedUserName}. Waiting for their response...`, threadID);

        } else {
            api.sendMessage(`Invalid battle subcommand. Use "ai" or "pvp".`, threadID);
        }
        break;

      case "status":
        let statusMsg = `🌟 ${userName}'s Pokémon Adventure Status 🌟\n\n`;
        statusMsg += `💰 Coins: ${userState.coins}\n`;
        if (userState.currentChallenge) {
          statusMsg += `❓ Active Challenge: Identify ${userState.currentChallenge.name} (image already sent)\n`;
        } else {
          statusMsg += `✅ No active challenge.\n`;
        }
        if (userState.currentBattle) {
          const opponentDisplay = userState.currentBattle.type === "ai" ? userState.currentBattle.opponentName : await usersData.getName(userState.currentBattle.player1ID === userID ? userState.currentBattle.player2ID : userState.currentBattle.player1ID);
          statusMsg += `⚔️ Active Battle (${userState.currentBattle.type.toUpperCase()}): Vs. ${opponentDisplay} (Your ${userState.currentBattle.playerActivePokemonName} HP: ${userState.currentBattle.playerActivePokemonHP}/${userState.currentBattle.playerActivePokemonMaxHp})\n`;
        } else {
          statusMsg += `✅ No active battle.\n`;
        }
        if (userState.pendingPvpChallenge) {
            const challengedPlayer = await usersData.getName(userState.pendingPvpChallenge.challengedUserID);
            statusMsg += `⏳ Pending PvP Challenge: To ${challengedPlayer}\n`;
        } else {
            // Check if pending challenge from others
            const incomingChallenge = Object.values(gameStates).find(state => 
                state.pendingPvpChallenge && state.pendingPvpChallenge.challengedUserID === userID
            );
            if (incomingChallenge) {
                const challengerName = await usersData.getName(incomingChallenge.pendingPvpChallenge.challengerID);
                statusMsg += `📩 Incoming PvP Challenge: From ${challengerName}!\n`;
            } else {
                statusMsg += `✅ No pending PvP challenges.\n`;
            }
        }
        api.sendMessage(statusMsg, threadID);
        break;
      
      case "leaderboard":
        const allGameStates = await this.getGameStates();
        const sortedPlayers = Object.entries(allGameStates)
          .map(([id, state]) => ({ id, coins: state.coins || 0 }))
          .sort((a, b) => b.coins - a.coins)
          .slice(0, 10); // Get top 10

        let leaderboardMsg = "🏆 Top 10 Pokémon Trainers by Coins 🏆\n\n";
        if (sortedPlayers.length === 0) {
          leaderboardMsg += "No players on the leaderboard yet. Start playing!";
        } else {
          for (let i = 0; i < sortedPlayers.length; i++) {
            const playerID = sortedPlayers[i].id;
            const playerName = await usersData.getName(playerID);
            leaderboardMsg += `${i + 1}. ${playerName}: ${sortedPlayers[i].coins} Coins\n`;
          }
        }
        api.sendMessage(leaderboardMsg, threadID);
        break;

      default:
        api.sendMessage(this.config.guide.en.replace(/{pn}/g, `${this.config.name}`), threadID);
        break;
    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    const userID = event.senderID;
    const threadID = event.threadID;
    const userName = await usersData.getName(userID);

    const gameStates = await this.getGameStates();
    let userState = gameStates[userID];

    // Ensure it's a valid reply for this command and user
    if (!userState || Reply.senderID !== userID || Reply.commandName !== this.config.name) {
      return;
    }

    await api.unsendMessage(Reply.originalMID); // Clear the previous message to reduce clutter

    // --- Handle Challenge Answer ---
    if (Reply.type === "challenge_answer" && userState.currentChallenge) {
      const userAnswer = event.body.trim().toLowerCase();
      const correctName = userState.currentChallenge.name.toLowerCase();

      if (userAnswer === correctName) {
        api.sendMessage(`🎉 Congratulations, ${userName}! You identified ${userState.currentChallenge.name}!`, threadID);

        const userPokemonCollections = await this.getUserPokemonCollections();
        userPokemonCollections[userID] = userPokemonCollections[userID] || [];
        
        const caughtPokemonData = {
            name: userState.currentChallenge.name,
            hp: parseInt(userState.currentChallenge.hp),
            maxHp: parseInt(userState.currentChallenge.hp), // Store max HP for upgrades
            type: userState.currentChallenge.type,
            attack: parseInt(userState.currentChallenge.attack),
            imageUrl: userState.currentChallenge.imageUrl,
            id: Date.now() // Unique ID for this specific caught Pokemon instance
        };
        userPokemonCollections[userID].push(caughtPokemonData);
        await this.saveUserPokemonCollections(userPokemonCollections);
        api.sendMessage(`🌟 ${userState.currentChallenge.name} has been added to your collection! Check it with "!mypokemon".`, threadID);

        userState.coins += 50;
        api.sendMessage(`💰 You earned 50 coins! Total coins: ${userState.coins}`, threadID);

        userState.currentChallenge = null;
        await this.saveGameStates(gameStates);

      } else {
        api.sendMessage(`❌ Sorry, ${userName}. That's not correct. The Pokémon was ${userState.currentChallenge.name}. Better luck next time!`, threadID);
        userState.currentChallenge = null;
        await this.saveGameStates(gameStates);
      }
    }

    // --- Handle PvP Challenge Response ---
    else if (Reply.type === "pvp_challenge_response") {
        const response = event.body.trim().toLowerCase();
        const challengerID = Reply.challengerID;
        let challengerState = gameStates[challengerID];

        if (!challengerState || !challengerState.pendingPvpChallenge || challengerState.pendingPvpChallenge.challengedUserID !== userID) {
            return api.sendMessage("This challenge is no longer valid or has expired.", threadID);
        }
        
        if (response === "accept") {
            api.sendMessage(`✅ ${userName} accepted the battle challenge! The battle is starting...`, threadID);
            api.sendMessage(`✅ Your challenge has been accepted by ${userName}! The battle is starting...`, challengerID);

            const userPokemonCollection = await this.getUserPokemonCollections();
            const player1PokemonList = userPokemonCollection[challengerID] || [];
            const player2PokemonList = userPokemonCollection[userID] || [];

            if (player1PokemonList.length === 0 || player2PokemonList.length === 0) {
                api.sendMessage("One of the players doesn't have Pokémon. Battle cancelled.", threadID);
                challengerState.pendingPvpChallenge = null;
                userState.pendingPvpChallenge = null; // Clear from both sides
                await this.saveGameStates(gameStates);
                return;
            }

            const player1ActivePokemon = player1PokemonList[0];
            const player2ActivePokemon = player2PokemonList[0];

            // Initialize battle state for both players
            const battleData = {
                type: "pvp",
                player1ID: challengerID,
                player2ID: userID,
                player1ActivePokemonName: player1ActivePokemon.name,
                player1ActivePokemonHP: parseInt(player1ActivePokemon.hp),
                player1ActivePokemonMaxHp: parseInt(player1ActivePokemon.maxHp),
                player1ActivePokemonType: player1ActivePokemon.type,
                player1ActivePokemonAttack: parseInt(player1ActivePokemon.attack),
                player1PokemonIndex: 0,

                player2ActivePokemonName: player2ActivePokemon.name,
                player2ActivePokemonHP: parseInt(player2ActivePokemon.hp),
                player2ActivePokemonMaxHp: parseInt(player2ActivePokemon.maxHp),
                player2ActivePokemonType: player2ActivePokemon.type,
                player2ActivePokemonAttack: parseInt(player2ActivePokemon.attack),
                player2PokemonIndex: 0,
                
                currentTurn: challengerID // Challenger starts
            };

            challengerState.currentBattle = battleData;
            userState.currentBattle = battleData; // Both users point to the same battle state
            
            challengerState.pendingPvpChallenge = null; // Clear pending challenge
            await this.saveGameStates(gameStates); // Save before other user's state is modified

            // Save player2's state (accepting user)
            gameStates[userID] = userState; // Update userState if it was modified
            await this.saveGameStates(gameStates);


            let battleStartMsg = `⚔️ PvP Battle Commencing! ⚔️\n\n`;
            battleStartMsg += `${await usersData.getName(challengerID)} vs. ${userName}\n\n`;
            battleStartMsg += `Your active Pokémon: ${player2ActivePokemon.name} (HP: ${player2ActivePokemon.hp}/${player2ActivePokemon.maxHp}, Type: ${player2ActivePokemon.type})\n`;
            battleStartMsg += `Opponent's active Pokémon (${player1ActivePokemon.name}): HP: ${player1ActivePokemon.hp}/${player1ActivePokemon.maxHp}, Type: ${player1ActivePokemon.type})\n\n`;
            battleStartMsg += `It's ${await usersData.getName(challengerID)}'s turn! They will make the first move.`;

            const firstTurnMsg = await api.sendMessage(battleStartMsg, threadID);
            // Set onReply for the current turn player
            global.GoatBot.onReply.set(firstTurnMsg.messageID, {
                commandName: this.config.name,
                senderID: challengerID, // Challenger makes first move
                type: "battle_move",
                originalMID: firstTurnMsg.messageID
            });

        } else if (response === "decline") {
            api.sendMessage(`❌ You declined the battle challenge from ${await usersData.getName(challengerID)}.`, threadID);
            api.sendMessage(`😔 ${userName} declined your battle challenge.`, challengerID);

            challengerState.pendingPvpChallenge = null; // Clear pending challenge
            await this.saveGameStates(gameStates);
            userState.pendingPvpChallenge = null; // Also clear any pending challenge for the accepting user
            await this.saveGameStates(gameStates);

        } else {
            api.sendMessage(`Invalid response. Please reply with "accept" or "decline".`, threadID);
            // Re-set onReply for the challenged user
            const currentChallengeMsg = await api.sendMessage(`🔔 ${await usersData.getName(challengerID)} has challenged you to a Pokémon battle!\n\nReply to this message with "accept" or "decline" to respond.`, threadID);
            global.GoatBot.onReply.set(currentChallengeMsg.messageID, {
                commandName: this.config.name,
                senderID: userID,
                type: "pvp_challenge_response",
                challengerID: challengerID,
                originalMID: currentChallengeMsg.messageID
            });
        }
    }

    // --- Handle Battle Move ---
    else if (Reply.type === "battle_move" && userState.currentBattle) {
        const userInput = event.body.trim().toLowerCase();
        let battle = userState.currentBattle;

        // Ensure it's the current player's turn
        if (battle.type === "pvp" && battle.currentTurn !== userID) {
            const currentTurnUserName = await usersData.getName(battle.currentTurn);
            return api.sendMessage(`It's not your turn, ${userName}! Please wait for ${currentTurnUserName} to make their move.`, threadID);
        }

        if (userInput === "attack") {
            let attacker, defender, attackerName, defenderName, attackerHPKey, defenderHPKey, attackerType, defenderType, attackerAttack;
            let attackingPlayerID, defendingPlayerID;
            let pokemonIndexToUpdate; // For updating HP in user_pokemon.json

            if (battle.type === "ai") {
                // Player is attacking AI
                attacker = { name: battle.playerActivePokemonName, hp: battle.playerActivePokemonHP, type: battle.playerActivePokemonType, attack: battle.playerActivePokemonAttack };
                defender = { name: battle.opponentName, hp: battle.opponentHP, type: battle.opponentType, attack: battle.opponentAttack };
                
                attackerName = attacker.name;
                defenderName = defender.name;
                attackerHPKey = 'playerActivePokemonHP';
                defenderHPKey = 'opponentHP';
                attackerType = attacker.type;
                defenderType = defender.type;
                attackerAttack = attacker.attack;
                attackingPlayerID = userID;
                defendingPlayerID = 'AI'; // Placeholder for AI
                pokemonIndexToUpdate = battle.playerPokemonIndex;

            } else if (battle.type === "pvp") {
                // Determine who is attacking and defending based on currentTurn
                if (battle.currentTurn === userID) { // Current user is attacking (Player 1 or Player 2)
                    if (battle.player1ID === userID) { // Current user is Player 1
                        attacker = { name: battle.player1ActivePokemonName, hp: battle.player1ActivePokemonHP, type: battle.player1ActivePokemonType, attack: battle.player1ActivePokemonAttack };
                        defender = { name: battle.player2ActivePokemonName, hp: battle.player2ActivePokemonHP, type: battle.player2ActivePokemonType, attack: battle.player2ActivePokemonAttack };
                        
                        attackerName = attacker.name;
                        defenderName = defender.name;
                        attackerHPKey = 'player1ActivePokemonHP';
                        defenderHPKey = 'player2ActivePokemonHP';
                        attackerType = attacker.type;
                        defenderType = defender.type;
                        attackerAttack = attacker.attack;
                        attackingPlayerID = battle.player1ID;
                        defendingPlayerID = battle.player2ID;
                        pokemonIndexToUpdate = battle.player1PokemonIndex;

                    } else { // Current user is Player 2
                        attacker = { name: battle.player2ActivePokemonName, hp: battle.player2ActivePokemonHP, type: battle.player2ActivePokemonType, attack: battle.player2ActivePokemonAttack };
                        defender = { name: battle.player1ActivePokemonName, hp: battle.player1ActivePokemonHP, type: battle.player1ActivePokemonType, attack: battle.player1ActivePokemonAttack };

                        attackerName = attacker.name;
                        defenderName = defender.name;
                        attackerHPKey = 'player2ActivePokemonHP';
                        defenderHPKey = 'player1ActivePokemonHP';
                        attackerType = attacker.type;
                        defenderType = defender.type;
                        attackerAttack = attacker.attack;
                        attackingPlayerID = battle.player2ID;
                        defendingPlayerID = battle.player1ID;
                        pokemonIndexToUpdate = battle.player2PokemonIndex;
                    }
                } else {
                    // This case should ideally not be reached due to the currentTurn check
                    return api.sendMessage("It's not your turn.", threadID);
                }
            }

            // Calculate damage
            const typeMultiplier = this.getTypeAdvantage(attackerType, defenderType);
            const damageDealt = Math.max(1, Math.floor(attackerAttack * typeMultiplier));

            battle[defenderHPKey] -= damageDealt; // Update HP in battle state

            api.sendMessage(`💥 ${attackerName} attacked ${defenderName} for ${damageDealt} damage! (Type advantage: x${typeMultiplier})`, threadID);
            
            // Check for win/loss
            if (battle[defenderHPKey] <= 0) {
                // Battle End
                const winnerID = attackingPlayerID;
                const loserID = defendingPlayerID;
                
                const winnerName = await usersData.getName(winnerID);
                const loserName = battle.type === "ai" ? battle.opponentName : await usersData.getName(loserID); // Get AI name or player name

                api.sendMessage(`🎉 ${defenderName} fainted! ${winnerName} won the battle against ${loserName}!`, threadID);

                // Reward winner
                let winnerState = gameStates[winnerID];
                winnerState.coins += 100;
                api.sendMessage(`💰 ${winnerName} earned 100 coins! Total coins: ${winnerState.coins}`, winnerID);
                
                // Clear battle state for both players involved (if PvP)
                if (battle.type === "pvp") {
                    let loserState = gameStates[loserID];
                    loserState.currentBattle = null;
                    await this.saveGameStates(gameStates); // Save loser's state
                }
                
                winnerState.currentBattle = null;
                await this.saveGameStates(gameStates); // Save winner's state
                return;
            } else {
                api.sendMessage(`${defenderName} has ${battle[defenderHPKey]} HP remaining.`, threadID);
            }

            // --- AI Turn (if AI battle) or Switch Turn (if PvP) ---
            if (battle.type === "ai") {
                // AI's Turn
                const opponentAttackPower = battle.opponentAttack;
                const opponentTypeAttacking = battle.opponentType;
                const playerDefendingType = battle.playerActivePokemonType;
                const opponentTypeMultiplier = this.getTypeAdvantage(opponentTypeAttacking, playerDefendingType);
                const opponentDamageDealt = Math.max(1, Math.floor(opponentAttackPower * opponentTypeMultiplier));

                battle[attackerHPKey] -= opponentDamageDealt; // Player's active pokemon HP takes damage
                api.sendMessage(`💢 ${battle.opponentName} attacked ${battle.playerActivePokemonName} for ${opponentDamageDealt} damage!`, threadID);

                if (battle[attackerHPKey] <= 0) {
                    api.sendMessage(`💔 ${battle.playerActivePokemonName} fainted! You lost the battle, ${userName}.`, threadID);
                    userState.currentBattle = null;
                    await this.saveGameStates(gameStates);
                    return;
                } else {
                    api.sendMessage(`${battle.playerActivePokemonName} has ${battle.playerActivePokemonHP} HP remaining.`, threadID);
                }
                
                // Update player's Pokémon HP in user_pokemon.json
                const userPokemonCollections = await this.getUserPokemonCollections();
                const userCurrentCollection = userPokemonCollections[userID] || [];
                if (userCurrentCollection[pokemonIndexToUpdate]) {
                    userCurrentCollection[pokemonIndexToUpdate].hp = battle.playerActivePokemonHP;
                    userPokemonCollections[userID] = userCurrentCollection;
                    await this.saveUserPokemonCollections(userPokemonCollections);
                }

                // Prompt for next player turn (still the player in AI battle)
                const nextTurnMsg = `It's your turn, ${userName}! ${battle.playerActivePokemonName} has ${battle.playerActivePokemonHP} HP. Reply with "attack" to continue attacking.`;
                const nextReplyMsg = await api.sendMessage(nextTurnMsg, threadID);
                global.GoatBot.onReply.set(nextReplyMsg.messageID, {
                    commandName: this.config.name,
                    senderID: userID,
                    type: "battle_move",
                    originalMID: nextReplyMsg.messageID
                });
                userState.currentBattle = battle;
                await this.saveGameStates(gameStates);

            } else if (battle.type === "pvp") {
                // PvP: Switch Turn
                const nextTurnPlayerID = battle.currentTurn === battle.player1ID ? battle.player2ID : battle.player1ID;
                battle.currentTurn = nextTurnPlayerID; // Update turn in battle state
                
                const nextTurnUserName = await usersData.getName(nextTurnPlayerID);
                const otherPlayerID = userID === battle.player1ID ? battle.player2ID : battle.player1ID;

                // Update HPs for the players' active Pokémon in their respective collections
                const userPokemonCollections = await this.getUserPokemonCollections();
                if (userPokemonCollections[userID] && userPokemonCollections[userID][pokemonIndexToUpdate]) {
                    userPokemonCollections[userID][pokemonIndexToUpdate].hp = battle[attackerHPKey]; // Update current user's active pokemon HP
                }
                // Need to update the other player's active pokemon HP as well, based on the defenderHPKey
                if (userPokemonCollections[otherPlayerID] && userPokemonCollections[otherPlayerID][battle.player1ID === otherPlayerID ? battle.player1PokemonIndex : battle.player2PokemonIndex]) { // This needs careful indexing
                    if (battle.player1ID === otherPlayerID) { // If other player is P1, update P1's HP
                         userPokemonCollections[otherPlayerID][battle.player1PokemonIndex].hp = battle.player1ActivePokemonHP;
                    } else { // If other player is P2, update P2's HP
                         userPokemonCollections[otherPlayerID][battle.player2PokemonIndex].hp = battle.player2ActivePokemonHP;
                    }
                }
                await this.saveUserPokemonCollections(userPokemonCollections); // Save changes to collection

                // Update battle state for both players involved
                gameStates[battle.player1ID].currentBattle = battle;
                gameStates[battle.player2ID].currentBattle = battle;
                await this.saveGameStates(gameStates);

                api.sendMessage(`It is now ${nextTurnUserName}'s turn!`, threadID); // Announce turn in current thread

                const nextTurnMsg = `It's your turn, ${nextTurnUserName}! Your active Pokémon: ${battle.currentTurn === battle.player1ID ? battle.player1ActivePokemonName : battle.player2ActivePokemonName} (HP: ${battle.currentTurn === battle.player1ID ? battle.player1ActivePokemonHP : battle.player2ActivePokemonHP}/${battle.currentTurn === battle.player1ID ? battle.player1ActivePokemonMaxHp : battle.player2ActivePokemonMaxHp})\nReply with "attack" to make your move.`;
                const nextReplyMsg = await api.sendMessage(nextTurnMsg, nextTurnPlayerID); // Send prompt to the next player
                global.GoatBot.onReply.set(nextReplyMsg.messageID, {
                    commandName: this.config.name,
                    senderID: nextTurnPlayerID,
                    type: "battle_move",
                    originalMID: nextReplyMsg.messageID
                });
            }

        } else {
            api.sendMessage(`Invalid battle action. Please reply with "attack" to make a move.`, threadID);
            // Re-set onReply to keep the turn active for the current player
            const currentBattleMsg = await api.sendMessage(`It's your turn, ${userName}! Your active Pokémon: ${battle.playerActivePokemonName} (HP: ${battle.playerActivePokemonHP}/${battle.playerActivePokemonMaxHp}). Reply with "attack" to continue.`, threadID);
            global.GoatBot.onReply.set(currentBattleMsg.messageID, {
                commandName: this.config.name,
                senderID: userID,
                type: "battle_move",
                originalMID: currentBattleMsg.messageID
            });
        }
    }
  }
};
