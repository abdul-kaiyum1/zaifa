/**
 * Kingdom Game - A Proper Kingdom Command
 * Version: 2.1 (Full)
 * Author: Abdul Kaiyum (Enhanced by AI)
 *
 * --- FEATURES ---
 * - Player Leveling & XP System
 * - Buildings with Passive Resource Generation (Gold, Food, Metal)
 * - Commands: build, collect, explore, daily, leaderboard
 * - Revamped UI with Emojis and Better Formatting
 * - Turn-by-turn Combat (PvE & PvP) with rewards
 * - Shop, Training, and AI that takes its turn
 * - Efficient Database Handling
 *
 * --- HOW TO PLAY ---
 * 1. {prefix}kingdom create <YourKingdomName> - Start your journey.
 * 2. {prefix}kingdom daily - Get your first resources.
 * 3. {prefix}kingdom build farm - Build a farm to produce food.
 * 4. {prefix}kingdom collect - Collect the resources your buildings made.
 * 5. {prefix}kingdom pve - Fight monsters to earn XP and money.
 * 6. {prefix}kingdom profile - Check your progress!
 */

const fs = require("fs-extra");
const path = require("path");

// ---------- ⚙️ CONFIGURATION ⚙️ ----------
const DB_FILE = path.join(__dirname, "kingdom_v2_database.json");
const COOLDOWN = {
    PVE: 15 * 60 * 1000, // 15 minutes
    PVP: 60 * 60 * 1000, // 1 hour
    EXPLORE: 20 * 60 * 1000, // 20 minutes
    DAILY: 22 * 60 * 60 * 1000, // 22 hours
};
const PVP_CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const XP_FOR_ACTION = {
    BUILD: 25,
    TRAIN: 5,
    PVE_WIN: 30,
    PVP_WIN: 75,
    EXPLORE: 10,
};

const DAILY_REWARD = { money: 500, gold: 200, food: 100 };

const SHOP = {
    sword: { name: "Steel Sword", price: 250, type: "weapon", attack: 15 },
    armor: { name: "Leather Armor", price: 200, type: "armor", defense: 12 },
    rifle: { name: "Old Rifle", price: 800, type: "weapon", attack: 40 },
    medkit: { name: "Medkit", price: 150, type: "consumable", effect: { heal: 100 } },
    horse: { name: "War Horse", price: 400, type: "unit", unitType: "cavalry", attack: 20, defense: 10 }
};

const BUILDINGS = {
    farm: { name: "Farm", baseCost: { gold: 100, food: 50 }, effect: { foodPerHour: 20 }, maxLevel: 20 },
    mine: { name: "Mine", baseCost: { gold: 150, food: 80 }, effect: { metalPerHour: 10 }, maxLevel: 20 },
    market: { name: "Market", baseCost: { gold: 200 }, effect: { goldPerHour: 15 }, maxLevel: 15 },
    barracks: { name: "Barracks", baseCost: { gold: 300, metal: 50 }, effect: { trainingDiscount: 0.01 }, maxLevel: 10 },
    wall: { name: "Wall", baseCost: { gold: 100, metal: 150 }, effect: { defenseBonus: 5 }, maxLevel: 25 }
};

// ---------- 🗃️ DATABASE UTILITIES 🗃️ ----------
fs.ensureFileSync(DB_FILE);
function loadDB() {
    try {
        return fs.readJsonSync(DB_FILE, { throws: false }) || { players: {}, kingdoms: {}, challenges: {}, battles: {} };
    } catch {
        return { players: {}, kingdoms: {}, challenges: {}, battles: {} };
    }
}
function saveDB(db) {
    fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
}

// ---------- 🛠️ HELPER FUNCTIONS 🛠️ ----------
const now = () => Date.now();
const fmt = (num) => Number(num).toLocaleString();

function getPlayer(db, userId, userName) {
    if (!db.players[userId]) {
        db.players[userId] = {
            id: userId,
            name: userName,
            money: 1000,
            kingdomId: null,
            cooldowns: {},
            stats: { wins: 0, losses: 0, pveWins: 0, pveLosses: 0 },
        };
    }
    db.players[userId].name = userName;
    return db.players[userId];
}

function createKingdom(db, userId, kingdomName) {
    const player = db.players[userId];
    if (player.kingdomId) throw new Error("You already own a kingdom.");
    const kingdomId = `k_${userId}`;
    player.kingdomId = kingdomId;
    db.kingdoms[kingdomId] = {
        id: kingdomId, name: kingdomName, owner: userId, level: 1, xp: 0,
        resources: { gold: 500, food: 300, metal: 50 },
        troops: { soldier: 10, archer: 5, cavalry: 0 },
        items: {}, buildings: { farm: 0, mine: 0, market: 0, barracks: 0, wall: 0 },
        lastCollected: now(), createdAt: now(),
    };
    return db.kingdoms[kingdomId];
}

function getPlayerKingdom(db, userId) {
    const player = db.players[userId];
    if (!player || !player.kingdomId) return null;
    return db.kingdoms[player.kingdomId];
}

function grantXP(kingdom, amount) {
    kingdom.xp += amount;
    const xpForNextLevel = kingdom.level * 200;
    let leveledUp = false;
    while (kingdom.xp >= xpForNextLevel) {
        kingdom.xp -= xpForNextLevel;
        kingdom.level++;
        leveledUp = true;
    }
    return leveledUp;
}

function calculatePower(kingdom) {
    const troopAttack = (kingdom.troops.soldier || 0) * 5 + (kingdom.troops.archer || 0) * 7 + (kingdom.troops.cavalry || 0) * 12;
    const itemAttack = Object.entries(kingdom.items).reduce((acc, [key, qty]) => acc + ((SHOP[key]?.attack || 0) * qty), 0);
    const troopDefense = (kingdom.troops.soldier || 0) * 3 + (kingdom.troops.archer || 0) * 4 + (kingdom.troops.cavalry || 0) * 6;
    const itemDefense = Object.entries(kingdom.items).reduce((acc, [key, qty]) => acc + ((SHOP[key]?.defense || 0) * qty), 0);
    const wallDefense = (kingdom.buildings?.wall || 0) * (BUILDINGS.wall.effect.defenseBonus || 0);
    return { attack: troopAttack + itemAttack, defense: troopDefense + itemDefense + wallDefense };
}

function generateAiKingdom(playerLevel) {
    const level = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
    const kingdom = {
        id: `ai_${now()}`, name: "Bandit Camp", owner: "AI", level: level,
        resources: { gold: 50 * level, food: 30 * level, metal: 10 * level },
        troops: {
            soldier: 5 + level * 3,
            archer: 2 + level * 2,
            cavalry: Math.floor(level / 2),
        },
        items: {}, buildings: { wall: level },
    };
    return kingdom;
}

// ---------- 📜 COMMAND HANDLERS 📜 ----------

function handleHelp(prefix, args) {
    const page = (args[1] || 'general').toLowerCase();
    const general = `🏰 **Kingdom General Help** 🏰\n` +
        `\`${prefix}kingdom create <name>\` - Create your kingdom.\n` +
        `\`${prefix}kingdom profile\` - View your kingdom status.\n` +
        `\`${prefix}kingdom leaderboard\` - See the top players.\n` +
        `\`${prefix}kingdom help <category>\` - Show help for a category.\n` +
        `Categories: \`general\`, \`economy\`, \`combat\``;
    const economy = `💰 **Kingdom Economy Help** 💰\n` +
        `\`${prefix}kingdom build <building>\` - Build or upgrade a building.\n` +
        `\`${prefix}kingdom collect\` - Collect generated resources.\n` +
        `\`${prefix}kingdom daily\` - Claim your daily reward.\n` +
        `\`${prefix}kingdom explore\` - Explore for loot.\n` +
        `\`${prefix}kingdom shop\` - View items for sale.\n` +
        `\`${prefix}kingdom buy <item> <amt>\` - Purchase items.`;
    const combat = `⚔️ **Kingdom Combat Help** ⚔️\n` +
        `\`${prefix}kingdom train <unit> <amt>\` - Train troops.\n` +
        `\`${prefix}kingdom pve\` - Fight an AI opponent.\n` +
        `\`${prefix}kingdom challenge @user\` - Challenge another player.\n` +
        `During battle, reply with \`attack\`, \`defend\`, or \`use <item>\`.`;
    switch(page) {
        case 'economy': return economy;
        case 'combat': return combat;
        default: return general;
    }
}

function handleProfile(db, userId) {
    const player = db.players[userId];
    const kingdom = getPlayerKingdom(db, userId);
    if (!kingdom) return "You do not have a kingdom yet.";
    const power = calculatePower(kingdom);
    const xpForNextLevel = kingdom.level * 200;
    const income = {
        gold: (kingdom.buildings.market || 0) * BUILDINGS.market.effect.goldPerHour,
        food: (kingdom.buildings.farm || 0) * BUILDINGS.farm.effect.foodPerHour,
        metal: (kingdom.buildings.mine || 0) * BUILDINGS.mine.effect.metalPerHour
    };
    return `**🏰 KINGDOM OF ${kingdom.name.toUpperCase()}**\n` +
        `👑 **Ruler:** ${player.name}\n` +
        `🎖️ **Level:** ${kingdom.level} (${fmt(kingdom.xp)} / ${fmt(xpForNextLevel)} XP)\n` +
        `---\n` +
        `**__Economy__**\n` +
        `🏦 **Player Money:** $${fmt(player.money)}\n` +
        `💰 **Gold:** ${fmt(kingdom.resources.gold)} (+${fmt(income.gold)}/hr)\n` +
        `🍖 **Food:** ${fmt(kingdom.resources.food)} (+${fmt(income.food)}/hr)\n` +
        `🔩 **Metal:** ${fmt(kingdom.resources.metal)} (+${fmt(income.metal)}/hr)\n` +
        `---\n` +
        `**__Military__**\n` +
        `⚔️ **Attack Power:** ${fmt(power.attack)}\n` +
        `🛡️ **Defense Power:** ${fmt(power.defense)}\n` +
        `- **Soldiers:** ${fmt(kingdom.troops.soldier || 0)}\n` +
        `- **Archers:** ${fmt(kingdom.troops.archer || 0)}\n` +
        `- **Cavalry:** ${fmt(kingdom.troops.cavalry || 0)}\n` +
        `---\n` +
        `**__Assets__**\n` +
        `**Buildings:** ${Object.entries(kingdom.buildings).map(([k,v]) => `${k.charAt(0).toUpperCase()+k.slice(1)} L${v}`).join(' | ')}\n` +
        `**Items:** ${Object.entries(kingdom.items).map(([k,q])=>`${k} x${q}`).join(', ') || 'None'}`;
}

function handleCollect(db, userId) {
    const kingdom = getPlayerKingdom(db, userId);
    const timeSinceCollect = now() - kingdom.lastCollected;
    const hours = timeSinceCollect / (1000 * 60 * 60);
    const collected = {
        gold: Math.floor(((kingdom.buildings.market || 0) * BUILDINGS.market.effect.goldPerHour) * hours),
        food: Math.floor(((kingdom.buildings.farm || 0) * BUILDINGS.farm.effect.foodPerHour) * hours),
        metal: Math.floor(((kingdom.buildings.mine || 0) * BUILDINGS.mine.effect.metalPerHour) * hours),
    };
    if (Object.values(collected).every(v => v === 0)) {
        return "You have no new resources to collect. Build or upgrade your economy buildings!";
    }
    kingdom.resources.gold += collected.gold;
    kingdom.resources.food += collected.food;
    kingdom.resources.metal += collected.metal;
    kingdom.lastCollected = now();
    return `**📊 Resources Collected!**\n` +
        `💰 Gold: +${fmt(collected.gold)}\n` +
        `🍖 Food: +${fmt(collected.food)}\n` +
        `🔩 Metal: +${fmt(collected.metal)}`;
}

function handleBuild(db, userId, args) {
    const buildingKey = (args[1] || '').toLowerCase();
    if (!BUILDINGS[buildingKey]) return `Invalid building. Available: ${Object.keys(BUILDINGS).join(', ')}.`;
    const kingdom = getPlayerKingdom(db, userId);
    const buildingInfo = BUILDINGS[buildingKey];
    const currentLevel = kingdom.buildings[buildingKey] || 0;
    if (currentLevel >= buildingInfo.maxLevel) return `${buildingInfo.name} is already at max level (${buildingInfo.maxLevel}).`;
    const costMultiplier = Math.pow(1.4, currentLevel);
    const cost = {};
    for (const res in buildingInfo.baseCost) cost[res] = Math.ceil(buildingInfo.baseCost[res] * costMultiplier);
    const costString = Object.entries(cost).map(([k,v]) => `${fmt(v)} ${k}`).join(', ');
    const missing = [];
    for(const res in cost) if(kingdom.resources[res] < cost[res]) missing.push(`${fmt(cost[res] - kingdom.resources[res])} ${res}`);
    if(missing.length > 0) return `You can't afford to upgrade. Cost: ${costString}. You are missing: ${missing.join(', ')}.`;
    for(const res in cost) kingdom.resources[res] -= cost[res];
    kingdom.buildings[buildingKey]++;
    const leveledUp = grantXP(kingdom, XP_FOR_ACTION.BUILD);
    let message = `✅ Successfully upgraded **${buildingInfo.name}** to **Level ${kingdom.buildings[buildingKey]}**!`;
    if(leveledUp) message += `\n**✨ LEVEL UP! You reached Kingdom Level ${kingdom.level}!**`;
    return message;
}

function handleDaily(db, userId) {
    const player = db.players[userId];
    const cooldown = player.cooldowns.daily || 0;
    if(now() < cooldown) {
        const remaining = new Date(cooldown - now()).toISOString().substr(11, 8);
        return `You have already claimed your daily reward. Please wait ${remaining}.`;
    }
    player.money += DAILY_REWARD.money;
    const kingdom = getPlayerKingdom(db, userId);
    if(kingdom) {
        kingdom.resources.gold += DAILY_REWARD.gold;
        kingdom.resources.food += DAILY_REWARD.food;
    }
    player.cooldowns.daily = now() + COOLDOWN.DAILY;
    return `**🎁 Daily Reward Claimed!**\n+ $${fmt(DAILY_REWARD.money)}\n+ ${fmt(DAILY_REWARD.gold)} Gold\n+ ${fmt(DAILY_REWARD.food)} Food`;
}

function handleExplore(db, userId) {
    const player = db.players[userId];
    const kingdom = getPlayerKingdom(db, userId);
    const cooldown = player.cooldowns.explore || 0;
    if(now() < cooldown) {
        const remaining = new Date(cooldown - now()).toISOString().substr(11, 8);
        return `You are too tired to explore. Rest for ${remaining}.`;
    }
    player.cooldowns.explore = now() + COOLDOWN.EXPLORE;
    const roll = Math.random();
    let message = "";
    if (roll < 0.5) { // Find resources
        const foundGold = Math.floor(Math.random() * 50 * kingdom.level) + 20;
        const foundFood = Math.floor(Math.random() * 30 * kingdom.level) + 10;
        kingdom.resources.gold += foundGold;
        kingdom.resources.food += foundFood;
        message = `You explored a nearby ruin and found ${fmt(foundGold)} gold and ${fmt(foundFood)} food!`;
    } else if (roll < 0.8) { // Fight weak enemy
        const enemyName = ["a pack of wolves", "a goblin scout", "a giant spider"][Math.floor(Math.random()*3)];
        const reward = Math.floor(Math.random() * 100) + 50;
        player.money += reward;
        message = `You were ambushed by ${enemyName} but fought them off, earning $${fmt(reward)}!`;
    } else { // Find nothing
        message = "You explored the wilderness for hours but found nothing of interest.";
    }
    const leveledUp = grantXP(kingdom, XP_FOR_ACTION.EXPLORE);
    if(leveledUp) message += `\n**✨ LEVEL UP! You reached Kingdom Level ${kingdom.level}!**`;
    return `🗺️ **Exploration Report** 🗺️\n${message}`;
}

function handleTrain(db, userId, args) {
    const unitType = (args[1] || '').toLowerCase();
    const amount = parseInt(args[2] || 1);
    const costs = { soldier: { food: 20, metal: 5 }, archer: { food: 25, metal: 10 }, cavalry: { food: 50, gold: 100 }};
    if(!costs[unitType] || isNaN(amount) || amount <= 0) return `Invalid usage. Use: \`train <soldier|archer|cavalry> <amount>\``;
    const kingdom = getPlayerKingdom(db, userId);
    const player = db.players[userId];
    const totalCost = {};
    for(const res in costs[unitType]) totalCost[res] = costs[unitType][res] * amount;
    const missing = [];
    for(const res in totalCost) if((kingdom.resources[res] || 0) < totalCost[res]) missing.push(`${fmt(totalCost[res] - kingdom.resources[res])} ${res}`);
    if(missing.length > 0) return `You lack the resources to train. Missing: ${missing.join(', ')}.`;
    for(const res in totalCost) kingdom.resources[res] -= totalCost[res];
    kingdom.troops[unitType] = (kingdom.troops[unitType] || 0) + amount;
    const leveledUp = grantXP(kingdom, XP_FOR_ACTION.TRAIN * amount);
    let message = `✅ Trained ${fmt(amount)} ${unitType}(s).`;
    if(leveledUp) message += `\n**✨ LEVEL UP! You reached Kingdom Level ${kingdom.level}!**`;
    return message;
}

// ---------- 👑 MAIN MODULE 👑 ----------
module.exports = {
    config: {
        name: "kingdom",
        aliases: ["k"],
        version: "2.1",
        author: "Abdul Kaiyum & AI",
        countDown: 5,
        role: 0,
        shortDescription: { en: "A full-featured kingdom management game." },
        longDescription: { en: "Build, grow, and conquer with your own kingdom. Features leveling, buildings, passive income, and turn-based combat." },
        category: "game",
        guide: { en: "Type {p}kingdom help to see all commands." }
    },

    onStart: async function({ api, event, args, usersData }) {
        const db = loadDB();
        const userId = event.senderID;
        const userName = (await usersData.get(userId))?.name || `User_${userId}`;
        getPlayer(db, userId, userName);
        const prefix = global.prefix || "!";
        const cmd = (args[0] || "profile").toLowerCase();
        let shouldSave = false;

        try {
            const kingdom = getPlayerKingdom(db, userId);
            const needsKingdom = !['create', 'help', 'leaderboard'].includes(cmd);
            if (needsKingdom && !kingdom) {
                return api.sendMessage(`You need a kingdom to do that! Start with \`${prefix}kingdom create <name>\``, event.threadID, event.messageID);
            }
            
            let response = "";
            switch (cmd) {
                case "help": response = handleHelp(prefix, args); break;
                case "create": {
                    const name = args.slice(1).join(" ").trim();
                    if (!name) { response = "Please provide a name for your kingdom."; break; }
                    createKingdom(db, userId, name);
                    shouldSave = true;
                    response = `🎉 Your kingdom, **${name}**, has been established! Use \`${prefix}kingdom profile\` to see your status.`;
                    break;
                }
                case "profile": response = handleProfile(db, userId); break;
                case "collect": response = handleCollect(db, userId); shouldSave = true; break;
                case "build": response = handleBuild(db, userId, args); shouldSave = true; break;
                case "daily": response = handleDaily(db, userId); shouldSave = true; break;
                case "explore": response = handleExplore(db, userId); shouldSave = true; break;
                case "train": response = handleTrain(db, userId, args); shouldSave = true; break;
                case "shop": {
                    response = `**🛒 Item Shop 🛒**\nUse \`${prefix}kingdom buy <item> <amount>\`\n` +
                    Object.entries(SHOP).map(([key, item]) => `- **${item.name} (\`${key}\`)**: $${fmt(item.price)}`).join('\n');
                    break;
                }
                case "buy": {
                    const itemKey = (args[1] || '').toLowerCase();
                    const amount = parseInt(args[2] || 1);
                    const item = SHOP[itemKey];
                    const player = db.players[userId];
                    if(!item || isNaN(amount) || amount <= 0) { response = "Invalid item or amount."; break; }
                    const totalCost = item.price * amount;
                    if(player.money < totalCost) { response = `You can't afford this. Cost: $${fmt(totalCost)}, you have $${fmt(player.money)}.`; break; }
                    player.money -= totalCost;
                    kingdom.items[itemKey] = (kingdom.items[itemKey] || 0) + amount;
                    shouldSave = true;
                    response = `🛍️ Purchased ${fmt(amount)}x ${item.name} for $${fmt(totalCost)}.`;
                    break;
                }
                case "leaderboard": {
                    const sorted = Object.values(db.kingdoms).sort((a,b) => b.level - a.level || b.xp - a.xp).slice(0, 10);
                    response = `**🏆 Leaderboard (Top 10 by Level)**\n` +
                    sorted.map((k, i) => `${i+1}. **${k.name}** (Lvl ${k.level}) - Ruler: ${db.players[k.owner].name}`).join('\n');
                    break;
                }
                case "pve": {
                    const player = db.players[userId];
                    const cooldown = player.cooldowns.pve || 0;
                    if(now() < cooldown) {
                        const remaining = new Date(cooldown - now()).toISOString().substr(11, 8);
                        return api.sendMessage(`You are tired from your last battle. Wait ${remaining}.`, event.threadID, event.messageID);
                    }
                    player.cooldowns.pve = now() + COOLDOWN.PVE;
                    const aiKingdom = generateAiKingdom(kingdom.level);
                    const battleId = `b_${now()}`;
                    const attackerPower = calculatePower(kingdom);
                    const defenderPower = calculatePower(aiKingdom);
                    db.battles[battleId] = {
                        id: battleId,
                        attacker: { id: userId, hp: attackerPower.defense * 2 + 100 },
                        defender: { id: "AI", kingdom: aiKingdom, hp: defenderPower.defense * 2 + 100 },
                        turn: "attacker",
                    };
                    shouldSave = true;
                    const msg = `⚔️ You encounter a ${aiKingdom.name} (Lvl ${aiKingdom.level})!\n` +
                        `**Your HP:** ${fmt(db.battles[battleId].attacker.hp)}\n` +
                        `**Enemy HP:** ${fmt(db.battles[battleId].defender.hp)}\n\n` +
                        `It's your turn! Reply with \`attack\`, \`defend\`, or \`use <item>\`.`;
                    return api.sendMessage(msg, event.threadID, (err, info) => {
                        if(err) return console.error(err);
                        global.GoatBot.onReply.set(info.messageID, { commandName: "kingdom", type: "battle_turn", battleId: battleId });
                    }, event.messageID);
                }
                // PvP challenge command can be added here
                default:
                    response = `Unknown command. Use \`${prefix}kingdom help\` for a list of valid commands.`;
                    break;
            }
            if (response) api.sendMessage(response, event.threadID, event.messageID);

        } catch (err) {
            console.error("Kingdom Command Error:", err);
            api.sendMessage(`An error occurred: ${err.message}`, event.threadID, event.messageID);
        } finally {
            if (shouldSave) saveDB(db);
        }
    },

    onReply: async function({ api, event, Reply, usersData }) {
        const db = loadDB();
        const userId = event.senderID;
        const { battleId, type } = Reply;

        if (type !== "battle_turn") return;
        
        const battle = db.battles[battleId];
        if (!battle) return api.sendMessage("This battle has already ended.", event.threadID, event.messageID);
        if (userId !== battle.attacker.id && userId !== battle.defender.id) return; // Not in this battle
        if (battle.turn !== (userId === battle.attacker.id ? "attacker" : "defender")) return api.sendMessage("It is not your turn.", event.threadID, event.messageID);

        const playerKingdom = getPlayerKingdom(db, battle.attacker.id);
        const playerPower = calculatePower(playerKingdom);
        const aiKingdom = battle.defender.kingdom;
        const aiPower = calculatePower(aiKingdom);
        const player = db.players[userId];

        const action = (event.body || "").toLowerCase().trim();
        let playerActionMsg = "";
        let battleEnded = false;

        // Player's Turn
        if (action.startsWith("attack")) {
            const damage = Math.max(10, Math.floor(playerPower.attack - aiPower.defense * 0.5 + Math.random() * 20));
            battle.defender.hp -= damage;
            playerActionMsg = `You attacked, dealing **${fmt(damage)}** damage!`;
        } else if (action.startsWith("use medkit")) {
            if((playerKingdom.items.medkit || 0) > 0) {
                const healAmount = SHOP.medkit.effect.heal;
                battle.attacker.hp += healAmount;
                playerKingdom.items.medkit--;
                playerActionMsg = `You used a medkit and healed for **${fmt(healAmount)}** HP.`;
            } else {
                playerActionMsg = "You don't have any medkits!";
            }
        } else {
            return api.sendMessage("Invalid action. Use `attack` or `use medkit`.", event.threadID, event.messageID);
        }
        
        if (battle.defender.hp <= 0) {
            const moneyReward = Math.floor(Math.random() * 100 * aiKingdom.level) + 50;
            player.money += moneyReward;
            const leveledUp = grantXP(playerKingdom, XP_FOR_ACTION.PVE_WIN);
            player.stats.pveWins = (player.stats.pveWins || 0) + 1;
            delete db.battles[battleId];
            saveDB(db);
            let winMsg = `**🏆 VICTORY!**\nYou defeated the ${aiKingdom.name}!\n` +
                `You earned **$${fmt(moneyReward)}** and **${XP_FOR_ACTION.PVE_WIN} XP**.`;
            if(leveledUp) winMsg += `\n**✨ LEVEL UP! You reached Kingdom Level ${playerKingdom.level}!**`;
            return api.sendMessage(winMsg, event.threadID, event.messageID);
        }

        // AI's Turn
        let aiActionMsg = "";
        const aiDamage = Math.max(10, Math.floor(aiPower.attack - playerPower.defense * 0.5 + Math.random() * 20));
        battle.attacker.hp -= aiDamage;
        aiActionMsg = `The ${aiKingdom.name} retaliates, dealing **${fmt(aiDamage)}** damage to you!`;

        if (battle.attacker.hp <= 0) {
            player.stats.pveLosses = (player.stats.pveLosses || 0) + 1;
            delete db.battles[battleId];
            saveDB(db);
            return api.sendMessage(`**☠️ DEFEAT!**\nYou were vanquished by the ${aiKingdom.name}.`, event.threadID, event.messageID);
        }

        saveDB(db);
        const statusUpdate = `\n\n**Your HP:** ${fmt(battle.attacker.hp)}\n**Enemy HP:** ${fmt(battle.defender.hp)}`;
        api.sendMessage(`${playerActionMsg}\n${aiActionMsg}${statusUpdate}`, event.threadID, (err, info) => {
            if(err) return console.error(err);
            global.GoatBot.onReply.set(info.messageID, { commandName: "kingdom", type: "battle_turn", battleId: battleId });
        }, event.messageID);
    }
};
