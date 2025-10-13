// scripts/cmds/casino.js
// Author: Abdul Kaiyum

const fs = require('fs');
const path = require('path');

// --- DATA MANAGEMENT ---
const dataPath = path.join(__dirname, 'casino_data.json');

function readData() {
    if (!fs.existsSync(dataPath)) {
        // FIX: Adjusted default prize pool
        fs.writeFileSync(dataPath, JSON.stringify({ users: {}, luckydraw: { tickets: [], prizePool: 200, lastDraw: Date.now() } }, null, 2));
    }
    try {
        const rawData = fs.readFileSync(dataPath);
        return JSON.parse(rawData);
    } catch (error) {
        console.error("[CASINO] Error reading data file:", error);
        return { users: {}, luckydraw: { tickets: [], prizePool: 200, lastDraw: Date.now() } };
    }
}

function writeData(data) {
    try {
        const tempPath = dataPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
        fs.renameSync(tempPath, dataPath);
    } catch (error) {
        console.error("[CASINO] Error writing to data file:", error);
    }
}

// --- CONFIGURATION ---
module.exports.config = {
    name: "casino",
    version: "5.2", // Incremented for reward adjustment
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
        en: "The ultimate all-in-one casino experience"
    },
    longDescription: {
        en: "A full-featured casino with Slots, Blackjack, Roulette, Hi-Lo, Poker, Dice Duels, a Bar with special drinks, Daily Bonuses, and a Weekly Lucky Draw."
    },
    category: "economy",
    guide: {
        en: `🎰💎 𝗔𝗶𝗸𝗼 𝗥𝗼𝘆𝗮𝗹𝗲 💎🎰
━━━━━━━━━━━━━━━━━━━
💰 𝗕𝗮𝗻𝗸 & 𝗖𝗵𝗶𝗽𝘀:
    � {pn} balance — Check 💵 money & 🎟 chips
    💳 {pn} buy [amount] — Convert 💵 → 🎟
    💳 {pn} sell [amount] — Convert 🎟 → 💵

🎮 𝗚𝗮𝗺𝗲𝘀:
    🎰 {pn} slots [bet] — Spin & win big!
    🃏 {pn} blackjack [bet] — Beat 21 to win
    🎯 {pn} roulette [bet] [type] — Red, Black, Even, Odd, 0-36
    🔼 {pn} hilo [bet] — Guess if next card is higher/lower
    ♠️ {pn} poker [bet] — Simple 5-card draw
    🎲 {pn} dice [bet] [opponent?] — Roll the dice & duel!

🍹 𝗖𝗮𝘀𝗶𝗻𝗼 𝗕𝗮𝗿:
    🍺 {pn} bar — View menu
    🥃 {pn} bar buy [drink] — Drinks give special effects!

🎟 𝗟𝘂𝗰𝗸𝘆 𝗗𝗿𝗮𝘄:
    📜 {pn} luckydraw info — Jackpot & time left
    🎫 {pn} luckydraw buy [tickets] — 1 ticket = 50 💵
    🏆 {pn} luckydraw draw (admin) — Pick winner 🎉

📊 𝗖𝗼𝗺𝗽𝗲𝘁𝗶𝘁𝗶𝗼𝗻𝘀:
    🏆 {pn} leaderboard — Top richest players
    🎁 {pn} daily — Claim daily chips & bonus streak
━━━━━━━━━━━━━━━━━━━
💡 Tip: Drinks can boost win rate or payouts for 10 mins!
✨ Become the next 💎 𝗖𝗮𝘀𝗶𝗻𝗼 𝗞𝗶𝗻𝗴! ✨`
    }
};

// --- MAIN COMMAND ROUTER ---
module.exports.onStart = async function({ api, event, args, usersData, message }) {
    const subCommand = args[0]?.toLowerCase();
    const { senderID } = event;

    const data = readData();
    if (!data.users[senderID]) {
        data.users[senderID] = { 
            chips: 0, 
            luck: { active: false, expires: 0, multiplier: 1 },
            daily: { lastClaim: 0, streak: 0 }
        };
        writeData(data);
    }

    switch (subCommand) {
        case "slots": case "slot":
            return handleSlots({ event, args, message });
        case "blackjack": case "bj":
            return handleBlackjack.onStart({ api, event, args, message });
        case "roulette":
            return handleRoulette({ event, args, message });
        case "hilo":
            return handleHilo.onStart({ api, event, args, message });
        case "poker":
            return handlePoker.onStart({ api, event, args, message });
        case "dice":
            return handleDice.onStart({ api, event, args, message, usersData });
        case "bar":
            return handleBar({ event, args, message });
        case "luckydraw":
            return handleLuckyDraw({ api, event, args, message, usersData });
        case "daily":
            return handleDaily({ event, message });
        case "leaderboard":
            return handleLeaderboard({ event, message, usersData });
        case "balance": case "bal":
            {
                const userMoney = await usersData.get(senderID, 'money');
                const casinoData = readData();
                const userChips = casinoData.users[senderID]?.chips || 0;
                message.reply(`Balance for ${await usersData.getName(senderID)}:\n\n💵 Money: $${userMoney.toLocaleString()}\n🎟️ Chips: ${userChips.toLocaleString()}`);
                break;
            }
        case "buy":
            {
                const amount = parseInt(args[1]);
                if (isNaN(amount) || amount <= 0) return message.reply("Please provide a valid amount of chips to buy.");
                const cost = amount * 10;
                const userMoney = await usersData.get(senderID, 'money');
                if (userMoney < cost) return message.reply(`You don't have enough money. You need $${cost.toLocaleString()} to buy ${amount.toLocaleString()} chips.`);
                await usersData.set(senderID, { money: userMoney - cost });
                const data = readData();
                data.users[senderID].chips += amount;
                writeData(data);
                message.reply(`✅ Successfully bought ${amount.toLocaleString()} chips for $${cost.toLocaleString()}.`);
                break;
            }
        case "sell":
            {
                const amount = parseInt(args[1]);
                if (isNaN(amount) || amount <= 0) return message.reply("Please provide a valid amount of chips to sell.");
                const data = readData();
                const userChips = data.users[senderID]?.chips || 0;
                if (userChips < amount) return message.reply(`You don't have enough chips. You only have ${userChips.toLocaleString()}.`);
                const revenue = amount * 10;
                data.users[senderID].chips -= amount;
                writeData(data);
                const currentUserMoney = await usersData.get(senderID, 'money');
                await usersData.set(senderID, { money: currentUserMoney + revenue });
                message.reply(`✅ Successfully sold ${amount.toLocaleString()} chips for $${revenue.toLocaleString()}.`);
                break;
            }
        case "guide":
        default:
            let prefix = "!"; try { if (global.utils && typeof global.utils.getPrefix === 'function') { const tp = await global.utils.getPrefix(event.threadID); if (tp) prefix = tp; } else if (global.config && global.config.PREFIX) { prefix = global.config.PREFIX; } else if (api && api.PREFIX) { prefix = api.PREFIX; }} catch(e){}
            message.reply(this.config.guide.en.replace(/{pn}/g, `${prefix}casino`));
            break;
    }
};

module.exports.onReply = async function({ api, event, message, Reply }) {
    if (Reply.author !== event.senderID) return; 
    if (Reply.commandName !== this.config.name) return;

    if (Reply.game === 'blackjack') {
        return handleBlackjack.onReply({ api, event, message, Reply });
    }
    if (Reply.game === 'hilo') {
        return handleHilo.onReply({ api, event, message, Reply });
    }
    if (Reply.game === 'poker') {
        return handlePoker.onReply({ api, event, message, Reply });
    }
    if (Reply.game === 'dice') {
        return handleDice.onReply({ api, event, message, Reply });
    }
};

// --- GAME: SLOT MACHINE ---
function handleSlots({ event, args, message }) {
    const { senderID } = event;
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount <= 0) return message.reply("Please enter a valid amount of chips to bet.");
    const data = readData();
    const userChips = data.users[senderID]?.chips || 0;
    if (userChips < betAmount) return message.reply(`You don't have enough chips! You only have ${userChips.toLocaleString()} 🎟️.`);
    data.users[senderID].chips -= betAmount;

    const reels = ['🍒', '🍊', '🍋', '🍇', '🍉', '⭐', '💎', '7️⃣'];
    let weights = { '🍒': 30, '🍊': 25, '🍋': 20, '🍇': 15, '🍉': 10, '⭐': 4, '💎': 2, '7️⃣': 1 };

    const luckEffect = data.users[senderID]?.luck;
    if (luckEffect && luckEffect.active && Date.now() < luckEffect.expires) {
        weights['⭐'] += 5; weights['💎'] += 3; weights['7️⃣'] += 2;
        data.users[senderID].luck.active = false;
        message.reply("✨ Your Liquid Luck potion gives you a good feeling about this spin!");
    }

    const spinReel = () => {
        const weightedReel = [];
        for (const symbol of reels) { for (let i = 0; i < weights[symbol]; i++) weightedReel.push(symbol); }
        return weightedReel[Math.floor(Math.random() * weightedReel.length)];
    };

    const result = [spinReel(), spinReel(), spinReel()];
    let winnings = 0;
    let winMessage = "Better luck next time! 😢";

    const payout = { '7️⃣7️⃣7️⃣': 1000, '💎💎💎': 500, '⭐⭐⭐': 200, '🍉🍉🍉': 80, '🍇🍇🍇': 40, '🍋🍋🍋': 20, '🍊🍊🍊': 10, '🍒🍒🍒': 5 };
    const resultString = result.join('');

    if (payout[resultString]) {
        winnings = betAmount * payout[resultString];
        winMessage = `JACKPOT! You won ${winnings.toLocaleString()} chips! 🎉`;
    } else if (result[0] === result[1] || result[1] === result[2]) {
        winnings = betAmount * 2;
        winMessage = `You matched two and doubled your bet! You get ${winnings.toLocaleString()} chips! 👍`;
    }

    if (winnings > 0) data.users[senderID].chips += winnings;
    writeData(data);
    message.reply(`🎰 Slot Machine 🎰\nBet: ${betAmount.toLocaleString()} 🎟️\n\n[ ${result.join(' | ')} ]\n\n${winMessage}\nYour new balance: ${data.users[senderID].chips.toLocaleString()} 🎟️`);
}

// --- GAME: BLACKJACK ---
const handleBlackjack = {
    onStart: async function({ api, event, args, message }) {
        const betAmount = parseInt(args[1]);
        const { senderID } = event;
        if (isNaN(betAmount) || betAmount <= 0) return message.reply("Please enter a valid bet.");
        const data = readData();
        const userChips = data.users[senderID]?.chips || 0;
        if (userChips < betAmount) return message.reply(`You don't have enough chips! You have ${userChips.toLocaleString()} 🎟️.`);
        data.users[senderID].chips -= betAmount;
        writeData(data);

        const deck = this.createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        const gameState = { deck, playerHand, dealerHand, bet: betAmount, playerValue: this.getHandValue(playerHand), dealerValue: this.getHandValue(dealerHand) };
        
        const replyMsg = `🃏 Blackjack | Bet: ${betAmount} 🎟️ 🃏\n\n` +
            `Dealer's Hand: ${dealerHand[0].value}${dealerHand[0].suit} [ ? ]\n` +
            `Your Hand: ${this.handToString(playerHand)} (Value: ${gameState.playerValue})\n\n` +
            `Reply "hit" or "stand". (You have 2 minutes)`;

        message.reply(replyMsg, (err, msgInfo) => {
            if (err) return console.error(err);
            const timeout = setTimeout(() => {
                const replyData = global.GoatBot.onReply.get(msgInfo.messageID);
                if (replyData) {
                    api.sendMessage("⏰ You took too long to reply. Automatically standing for you.", event.threadID, msgInfo.messageID);
                    this.onReply({ api, event: { body: 'stand', senderID: senderID }, message, Reply: replyData });
                }
            }, 120000);

            global.GoatBot.onReply.set(msgInfo.messageID, {
                commandName: 'casino', game: 'blackjack',
                author: senderID, timeout: timeout,
                messageID: msgInfo.messageID, ...gameState
            });
        });
    },

    onReply: async function({ api, event, message, Reply }) {
        clearTimeout(Reply.timeout);
        global.GoatBot.onReply.delete(Reply.messageID); 

        let gameState = { ...Reply };
        const playerID = Reply.author;
        const choice = event.body.trim().toLowerCase();

        if (choice === 'hit') {
            gameState.playerHand.push(gameState.deck.pop());
            gameState.playerValue = this.getHandValue(gameState.playerHand);

            if (gameState.playerValue > 21) {
                api.sendMessage(`BUST! 💥\n\nYour Hand: ${this.handToString(gameState.playerHand)} (Value: ${gameState.playerValue})\nYou went over 21 and lose ${gameState.bet} chips.`, event.threadID, event.messageID);
                return;
            }

            const updatedMsg = `🃏 Blackjack | Bet: ${gameState.bet} 🎟️ 🃏\n\n` +
                `Dealer's Hand: ${gameState.dealerHand[0].value}${gameState.dealerHand[0].suit} [ ? ]\n` +
                `Your Hand: ${this.handToString(gameState.playerHand)} (Value: ${gameState.playerValue})\n\n` +
                `Reply "hit" or "stand".`;

            api.sendMessage(updatedMsg, event.threadID, (err, msgInfo) => {
                if (err) return console.error(err);
                const timeout = setTimeout(() => {
                    const replyData = global.GoatBot.onReply.get(msgInfo.messageID);
                    if (replyData) {
                        api.sendMessage("⏰ You took too long to reply. Automatically standing for you.", event.threadID, msgInfo.messageID);
                        this.onReply({ api, event: { body: 'stand', senderID: playerID }, message, Reply: replyData });
                    }
                }, 120000);
                global.GoatBot.onReply.set(msgInfo.messageID, { ...gameState, messageID: msgInfo.messageID, timeout: timeout });
            });
            return;
        }

        if (choice === 'stand') {
            while (this.getHandValue(gameState.dealerHand) < 17) {
                gameState.dealerHand.push(gameState.deck.pop());
            }
            gameState.dealerValue = this.getHandValue(gameState.dealerHand);

            let finalMsg = `🃏 Blackjack Results 🃏\n\n` +
                `Dealer's Hand: ${this.handToString(gameState.dealerHand)} (Value: ${gameState.dealerValue})\n` +
                `Your Hand: ${this.handToString(gameState.playerHand)} (Value: ${gameState.playerValue})\n\n`;

            let winnings = 0;
            if (gameState.playerValue > 21) { finalMsg += `You busted! You lose your bet.`; } 
            else if (gameState.dealerValue > 21 || gameState.playerValue > gameState.dealerValue) { winnings = gameState.bet * 2; finalMsg += `You win! You get ${winnings.toLocaleString()} chips!`; } 
            else if (gameState.dealerValue > gameState.playerValue) { finalMsg += `Dealer wins! You lose your bet.`; } 
            else { winnings = gameState.bet; finalMsg += `It's a push! Your bet of ${gameState.bet} chips is returned.`; }
            
            const data = readData();
            if (!data.users[playerID]) data.users[playerID] = { chips: 0 };
            data.users[playerID].chips += winnings;
            writeData(data);

            finalMsg += `\n\nYour new balance: ${data.users[playerID].chips.toLocaleString()} 🎟️`;
            api.sendMessage(finalMsg, event.threadID, event.messageID);
        } else {
            api.sendMessage("Invalid choice. Please reply with 'hit' or 'stand'.", event.threadID, (err, msgInfo) => {
                if (err) return;
                const timeout = setTimeout(() => {
                    const replyData = global.GoatBot.onReply.get(msgInfo.messageID);
                    if (replyData) {
                        api.sendMessage("⏰ You took too long to reply. Automatically standing for you.", event.threadID, msgInfo.messageID);
                        this.onReply({ api, event: { body: 'stand', senderID: playerID }, message, Reply: replyData });
                    }
                }, 120000);
                global.GoatBot.onReply.set(msgInfo.messageID, { ...gameState, messageID: msgInfo.messageID, timeout: timeout });
            });
        }
    },
    createDeck: function() { const s=['♠️','♥️','♣️','♦️'],v=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];let d=[];for(const suit of s){for(const val of v)d.push({suit,value:val});}return d.sort(()=>Math.random()-0.5);},
    getHandValue: function(h) {let val=h.reduce((sum,c)=>sum+(['J','Q','K'].includes(c.value)?10:c.value==='A'?11:parseInt(c.value)),0);let a=h.filter(c=>c.value==='A').length;while(val>21&&a-->0)val-=10;return val;},
    handToString: function(h) { return h.map(c => `${c.value}${c.suit}`).join(' '); }
};

// --- GAME: ROULETTE ---
function handleRoulette({ event, args, message }) {
    const { senderID } = event;
    const betAmount = parseInt(args[1]);
    const betType = args[2]?.toLowerCase();
    if (isNaN(betAmount) || betAmount <= 0) return message.reply("Please provide a valid bet amount.");
    if (!betType) return message.reply("Please provide a bet type. Options: red, black, even, odd, or a number from 0-36.");
    const data = readData();
    const userChips = data.users[senderID]?.chips || 0;
    if (userChips < betAmount) return message.reply(`You don't have enough chips! You only have ${userChips.toLocaleString()} 🎟️.`);
    data.users[senderID].chips -= betAmount;

    const numbers = {
        0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
        11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
        21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
        31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
    };
    const winningNumber = Math.floor(Math.random() * 37);
    const winningColor = numbers[winningNumber];
    const winningParity = winningNumber === 0 ? 'none' : (winningNumber % 2 === 0 ? 'even' : 'odd');

    let winnings = 0;
    let winMessage = "Sorry, you lost this round.";

    const betOnNumber = parseInt(betType);
    if (!isNaN(betOnNumber) && betOnNumber >= 0 && betOnNumber <= 36) {
        if (betOnNumber === winningNumber) { winnings = betAmount * 35; winMessage = `Incredible! You hit the number! You win ${winnings.toLocaleString()} chips!`; }
    } else {
        switch (betType) {
            case 'red': if (winningColor === 'red') { winnings = betAmount * 2; } break;
            case 'black': if (winningColor === 'black') { winnings = betAmount * 2; } break;
            case 'even': if (winningParity === 'even') { winnings = betAmount * 2; } break;
            case 'odd': if (winningParity === 'odd') { winnings = betAmount * 2; } break;
            default: message.reply("Invalid bet type."); data.users[senderID].chips += betAmount; writeData(data); return;
        }
        if (winnings > 0) winMessage = `You won! Payout is ${winnings.toLocaleString()} chips!`;
    }

    if (winnings > 0) data.users[senderID].chips += winnings;
    writeData(data);
    message.reply(`🎡 Roulette 🎡\nYou bet ${betAmount.toLocaleString()} 🎟️ on ${betType}.\n\nThe ball lands on... **${winningNumber} ${winningColor.toUpperCase()}**!\n\n${winMessage}\nYour new balance: ${data.users[senderID].chips.toLocaleString()} 🎟️`);
}

// --- FEATURE: CASINO BAR ---
function handleBar({ event, args, message }) {
    const drinks = {
        "beer": { price: 5, description: "A simple, refreshing beer." },
        "wine": { price: 10, description: "A classy glass of red wine." },
        "whiskey": { price: 25, description: "A strong shot of whiskey for luck." },
        "cocktail": { price: 30, description: "A fancy cocktail, shaken not stirred." },
        "luck": { price: 200, description: "A shimmering 'Liquid Luck' potion. Boosts odds on your next game!" }
    };
    const subCommand = args[1]?.toLowerCase();
    const drinkName = args[2]?.toLowerCase();
    const { senderID } = event;

    if (subCommand === 'buy' && drinks[drinkName]) {
        const drink = drinks[drinkName];
        const data = readData();
        const userChips = data.users[senderID]?.chips || 0;
        if (userChips < drink.price) return message.reply(`You don't have enough chips for a ${drinkName}. You need ${drink.price} 🎟️.`);
        data.users[senderID].chips -= drink.price;
        let confirmationMsg = `You bought a ${drinkName} for ${drink.price} 🎟️. Cheers! 🍻`;
        if (drinkName === 'luck') {
            data.users[senderID].luck = { active: true, expires: Date.now() + (10 * 60 * 1000), multiplier: 1.5 }; // Luck lasts 10 mins
            confirmationMsg = `You bought a Liquid Luck potion for ${drink.price} 🎟️. Your next game in the casino within 10 minutes will have better odds! ✨`;
        }
        writeData(data);
        message.reply(confirmationMsg);
    } else {
        let menu = "Welcome to the Aiko Bar! 🍸\n\n--- Menu ---\n";
        for (const [name, details] of Object.entries(drinks)) { menu += `\n- ${name.charAt(0).toUpperCase() + name.slice(1)}: ${details.price} 🎟️\n  "${details.description}"`; }
        menu += `\n\nTo buy, use \`casino bar buy [drink_name]\``;
        message.reply(menu);
    }
}

// --- FEATURE: LUCKY DRAW ---
function handleLuckyDraw({ api, event, args, message, usersData }) {
    const subCommand = args[1]?.toLowerCase();
    const { senderID } = event;
    const data = readData();

    switch (subCommand) {
        case "buy":
            const numTickets = parseInt(args[2]);
            if (isNaN(numTickets) || numTickets <= 0) return message.reply("Please enter a valid number of tickets to buy.");
            const cost = numTickets * 50; // Cost is in money
            usersData.get(senderID, 'money').then(userMoney => {
                if (userMoney < cost) return message.reply(`You need $${cost.toLocaleString()} to buy ${numTickets} tickets.`);
                usersData.set(senderID, { money: userMoney - cost });
                for (let i = 0; i < numTickets; i++) { data.luckydraw.tickets.push(senderID); }
                data.luckydraw.prizePool += cost * 0.20; // 20% of ticket cost goes to prize pool
                writeData(data);
                message.reply(`You successfully bought ${numTickets} tickets for the lucky draw!`);
            });
            break;
        case "draw":
            const adminIDs = global.GoatBot.config.adminBot;
            if (!adminIDs.includes(senderID)) return message.reply("You are not authorized to perform this action.");
            if (data.luckydraw.tickets.length === 0) return message.reply("No tickets have been sold for the draw.");
            const winnerID = data.luckydraw.tickets[Math.floor(Math.random() * data.luckydraw.tickets.length)];
            const prize = data.luckydraw.prizePool;
            if (!data.users[winnerID]) data.users[winnerID] = { chips: 0 };
            data.users[winnerID].chips += prize;
            data.luckydraw = { tickets: [], prizePool: 200, lastDraw: Date.now() }; // Reset with new base prize
            writeData(data);
            usersData.getName(winnerID).then(winnerName => {
                const announcement = `🎉 The Weekly Lucky Draw Winner is... ${winnerName}! 🎉\n\n` +
                    `They have won the grand prize of ${prize.toLocaleString()} chips! Congratulations!`;
                api.sendMessage(announcement, event.threadID);
            });
            break;
        case "info":
        default:
            const userTickets = data.luckydraw.tickets.filter(id => id === senderID).length;
            const nextDraw = new Date((data.luckydraw.lastDraw || Date.now()) + 7 * 24 * 60 * 60 * 1000);
            message.reply(
                `🎟️ Weekly Lucky Draw Info 🎟️\n\n` +
                `Current Prize Pool: ${Math.floor(data.luckydraw.prizePool).toLocaleString()} chips\n` +
                `Total Tickets Sold: ${data.luckydraw.tickets.length}\n` +
                `Your Tickets: ${userTickets}\n` +
                `Next Draw: ${nextDraw.toLocaleString()}\n\n` +
                `Buy tickets for 50 💵 each with 'casino luckydraw buy [amount]'`
            );
            break;
    }
}

// --- NEW GAME: HI-LO ---
const handleHilo = {
    deck: [],
    onStart: async function({ api, event, args, message }) {
        const betAmount = parseInt(args[1]);
        const { senderID } = event;
        if (isNaN(betAmount) || betAmount <= 0) return message.reply("Please enter a valid bet.");
        const data = readData();
        if ((data.users[senderID]?.chips || 0) < betAmount) return message.reply("You don't have enough chips.");
        data.users[senderID].chips -= betAmount;
        writeData(data);

        this.deck = handleBlackjack.createDeck();
        const currentCard = this.deck.pop();
        const msg = `🔼 Hi-Lo | Bet: ${betAmount} 🎟️ 🔽\n\n` +
                    `The card is: [ ${currentCard.value}${currentCard.suit} ]\n\n` +
                    `Will the next card be higher or lower? (Aces are high)\n` +
                    `Reply "higher" or "lower".`;
        message.reply(msg, (err, msgInfo) => {
            if (err) return console.error(err);
            global.GoatBot.onReply.set(msgInfo.messageID, {
                commandName: 'casino', game: 'hilo', 
                author: senderID, bet: betAmount,
                currentCard: currentCard, deck: this.deck,
                messageID: msgInfo.messageID
            });
        });
    },
    onReply: async function({ api, event, message, Reply }) {
        global.GoatBot.onReply.delete(Reply.messageID);
        const choice = event.body.trim().toLowerCase();
        if (choice !== 'higher' && choice !== 'lower') return message.reply("Invalid choice. Please reply 'higher' or 'lower'.");
        
        const nextCard = Reply.deck.pop();
        const cardValues = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
        const currentValue = cardValues[Reply.currentCard.value];
        const nextValue = cardValues[nextCard.value];

        let result = '';
        if (nextValue > currentValue) result = 'higher';
        else if (nextValue < currentValue) result = 'lower';
        else result = 'push';

        let winnings = 0;
        let resultMsg = `The next card is [ ${nextCard.value}${nextCard.suit} ].\n\n`;
        if (result === 'push') { winnings = Reply.bet; resultMsg += `It's a tie! Your bet of ${winnings.toLocaleString()} 🎟️ is returned.`;
        } else if (choice === result) { winnings = Reply.bet * 2; resultMsg += `You were right! You win ${winnings.toLocaleString()} 🎟️!`;
        } else { resultMsg += `Sorry, you were wrong. You lose your bet.`; }

        const data = readData();
        data.users[event.senderID].chips += winnings;
        writeData(data);
        resultMsg += `\nYour new balance: ${data.users[event.senderID].chips.toLocaleString()} 🎟️`;
        message.reply(resultMsg);
    }
};

// --- NEW GAME: POKER ---
const handlePoker = {
    onStart: async function({ api, event, args, message }) {
        const betAmount = parseInt(args[1]);
        const { senderID } = event;
        if (isNaN(betAmount) || betAmount <= 0) return message.reply("Please enter a valid bet.");
        const data = readData();
        if ((data.users[senderID]?.chips || 0) < betAmount) return message.reply("You don't have enough chips.");
        data.users[senderID].chips -= betAmount;
        writeData(data);

        const deck = handleBlackjack.createDeck();
        const playerHand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
        
        let msg = `♠️ 5-Card Draw Poker | Bet: ${betAmount} 🎟️ ♥️\n\n` +
                  `Your hand:\n` +
                  `1. ${playerHand[0].value}${playerHand[0].suit}\n` +
                  `2. ${playerHand[1].value}${playerHand[1].suit}\n` +
                  `3. ${playerHand[2].value}${playerHand[2].suit}\n` +
                  `4. ${playerHand[3].value}${playerHand[3].suit}\n` +
                  `5. ${playerHand[4].value}${playerHand[4].suit}\n\n` +
                  `Reply with the numbers of cards to discard (e.g., "1 3 5"), or reply "none" to keep your hand.`;

        message.reply(msg, (err, msgInfo) => {
            if (err) return console.error(err);
            global.GoatBot.onReply.set(msgInfo.messageID, {
                commandName: 'casino', game: 'poker',
                author: senderID, bet: betAmount,
                hand: playerHand, deck: deck,
                messageID: msgInfo.messageID
            });
        });
    },
    onReply: async function({ api, event, message, Reply }) {
        global.GoatBot.onReply.delete(Reply.messageID);
        const { senderID } = event;
        const choices = event.body.trim().toLowerCase().split(' ').filter(c => c);
        let hand = Reply.hand;
        let deck = Reply.deck;

        if (choices[0] !== 'none') {
            const indicesToDiscard = choices.map(c => parseInt(c) - 1).filter(i => !isNaN(i) && i >= 0 && i < 5);
            if (indicesToDiscard.length > 5) return message.reply("You can only discard up to 5 cards.");
            const uniqueIndices = [...new Set(indicesToDiscard)].sort((a, b) => b - a);
            for (const index of uniqueIndices) {
                hand.splice(index, 1);
            }
            for (let i = 0; i < uniqueIndices.length; i++) {
                hand.push(deck.pop());
            }
        }

        const evaluation = this.evaluateHand(hand);
        let winnings = 0;
        let resultMsg = `Your final hand: ${handleBlackjack.handToString(hand)}\n\n` +
                        `You have: **${evaluation.name}**!\n\n`;

        if (evaluation.rank > 0) {
            winnings = Reply.bet * evaluation.payout;
            resultMsg += `Congratulations! You win ${winnings.toLocaleString()} 🎟️.`;
        } else {
            resultMsg += `Sorry, that's not a winning hand. You lose your bet.`;
        }

        const data = readData();
        data.users[senderID].chips += winnings;
        writeData(data);
        resultMsg += `\nYour new balance: ${data.users[senderID].chips.toLocaleString()} 🎟️`;
        message.reply(resultMsg);
    },
    evaluateHand: function(hand) {
        const ranks = '23456789TJQKA'.replace('T', '10');
        const suits = hand.map(c => c.suit);
        const values = hand.map(c => ranks.indexOf(c.value)).sort((a, b) => a - b);
        const counts = values.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
        const valueCounts = Object.values(counts).sort((a, b) => b - a);

        const isFlush = new Set(suits).size === 1;
        const isStraight = values[4] - values[0] === 4 && new Set(values).size === 5;
        
        if (isStraight && isFlush && values[4] === 12) return { name: 'Royal Flush', rank: 9, payout: 250 };
        if (isStraight && isFlush) return { name: 'Straight Flush', rank: 8, payout: 50 };
        if (valueCounts[0] === 4) return { name: 'Four of a Kind', rank: 7, payout: 25 };
        if (valueCounts[0] === 3 && valueCounts[1] === 2) return { name: 'Full House', rank: 6, payout: 9 };
        if (isFlush) return { name: 'Flush', rank: 5, payout: 6 };
        if (isStraight) return { name: 'Straight', rank: 4, payout: 4 };
        if (valueCounts[0] === 3) return { name: 'Three of a Kind', rank: 3, payout: 3 };
        if (valueCounts[0] === 2 && valueCounts[1] === 2) return { name: 'Two Pair', rank: 2, payout: 2 };
        if (valueCounts[0] === 2 && values.some(v => v >= 9)) return { name: 'Jacks or Better', rank: 1, payout: 1 };
        
        return { name: 'High Card', rank: 0, payout: 0 };
    }
};

// --- NEW GAME: DICE DUEL ---
const handleDice = {
    onStart: async function({ api, event, args, message, usersData }) {
        const betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0) return message.reply("Please enter a valid bet amount.");
        const data = readData();
        if ((data.users[event.senderID]?.chips || 0) < betAmount) return message.reply("You don't have enough chips.");

        const opponentMention = Object.keys(event.mentions)[0];
        if (!opponentMention) { // Duel against bot
            data.users[event.senderID].chips -= betAmount;
            writeData(data);
            const playerRoll = Math.floor(Math.random() * 6) + 1;
            const botRoll = Math.floor(Math.random() * 6) + 1;
            let resultMsg = `🎲 Dice Duel vs Bot 🎲\n\n` +
                            `You rolled a ${playerRoll}.\n` +
                            `The Bot rolled a ${botRoll}.\n\n`;
            let winnings = 0;
            if (playerRoll > botRoll) {
                winnings = betAmount * 2;
                resultMsg += `You win! You get ${winnings.toLocaleString()} 🎟️.`;
            } else if (botRoll > playerRoll) {
                resultMsg += `The Bot wins! You lose your bet.`;
            } else {
                winnings = betAmount;
                resultMsg += `It's a tie! Your bet is returned.`;
            }
            data.users[event.senderID].chips += winnings;
            writeData(data);
            resultMsg += `\nYour new balance: ${data.users[event.senderID].chips.toLocaleString()} 🎟️`;
            return message.reply(resultMsg);
        }
        // PvP Duel logic
        const opponentID = opponentMention;
        if (opponentID === event.senderID) return message.reply("You can't duel yourself!");
        const opponentChips = data.users[opponentID]?.chips || 0;
        if (opponentChips < betAmount) return message.reply(`${event.mentions[opponentID]} doesn't have enough chips for this duel.`);
        
        const challengerName = await usersData.getName(event.senderID);
        const opponentName = event.mentions[opponentID];

        const msg = `🎲 @${opponentName}, ${challengerName} has challenged you to a Dice Duel for ${betAmount.toLocaleString()} 🎟️!\n\n` +
                    `Reply "accept" to roll the dice.`;
        
        message.reply({ body: msg, mentions: [{ tag: `@${opponentName}`, id: opponentID }] }, (err, msgInfo) => {
            if (err) return console.error(err);
            global.GoatBot.onReply.set(msgInfo.messageID, {
                commandName: 'casino', game: 'dice',
                author: opponentID, challenger: event.senderID, bet: betAmount
            });
        });
    },
    onReply: async function({ api, event, message, Reply, usersData }) {
        if (event.body.trim().toLowerCase() !== 'accept') return;
        
        const challengerID = Reply.challenger;
        const opponentID = Reply.author;
        const bet = Reply.bet;

        const data = readData();
        data.users[challengerID].chips -= bet;
        data.users[opponentID].chips -= bet;
        writeData(data);

        const challengerRoll = Math.floor(Math.random() * 6) + 1;
        const opponentRoll = Math.floor(Math.random() * 6) + 1;

        const challengerName = await usersData.getName(challengerID);
        const opponentName = await usersData.getName(opponentID);

        let resultMsg = `🎲 Dice Duel: ${challengerName} vs ${opponentName} 🎲\n\n` +
                        `${challengerName} rolled a ${challengerRoll}.\n` +
                        `${opponentName} rolled a ${opponentRoll}.\n\n`;
        
        let winnerID;
        if (challengerRoll > opponentRoll) {
            winnerID = challengerID;
            resultMsg += `${challengerName} wins!`;
        } else if (opponentRoll > challengerRoll) {
            winnerID = opponentID;
            resultMsg += `${opponentName} wins!`;
        } else {
            resultMsg += `It's a tie! Both players get their bets back.`;
            data.users[challengerID].chips += bet;
            data.users[opponentID].chips += bet;
        }

        if (winnerID) {
            const winnings = bet * 2;
            data.users[winnerID].chips += winnings;
            resultMsg += ` They win ${winnings.toLocaleString()} 🎟️!`;
        }
        writeData(data);
        message.reply(resultMsg);
        global.GoatBot.onReply.delete(Reply.messageID);
    }
};

// --- NEW FEATURE: DAILY BONUS ---
function handleDaily({ event, message }) {
    const { senderID } = event;
    const data = readData();
    const userData = data.users[senderID];
    const now = Date.now();
    const lastClaim = userData.daily.lastClaim || 0;
    const timeSinceLastClaim = now - lastClaim;

    if (timeSinceLastClaim < 22 * 60 * 60 * 1000) { // 22 hours cooldown
        const timeLeft = (22 * 60 * 60 * 1000) - timeSinceLastClaim;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply(`You've already claimed your daily bonus. Please wait ${hours}h ${minutes}m.`);
    }

    const isConsecutive = timeSinceLastClaim < 48 * 60 * 60 * 1000;
    userData.daily.streak = isConsecutive ? (userData.daily.streak || 0) + 1 : 1;
    userData.daily.lastClaim = now;

    const baseBonus = 6; // FIX: Adjusted daily bonus
    const streakBonus = userData.daily.streak * 1; // FIX: Adjusted streak bonus
    const totalBonus = baseBonus + streakBonus;
    userData.chips += totalBonus;
    writeData(data);

    let dailyMsg = `🎁 Daily Bonus Claimed! 🎁\n` +
                   `You received ${baseBonus} 🎟️.\n` +
                   `Streak Bonus: ${streakBonus} 🎟️ (Day ${userData.daily.streak})!\n` +
                   `Total: ${totalBonus} 🎟️.\n\n` +
                   `Your new balance is ${userData.chips.toLocaleString()} 🎟️. Come back tomorrow for a bigger streak bonus!`;
    message.reply(dailyMsg);
}

// --- NEW FEATURE: LEADERBOARD ---
async function handleLeaderboard({ event, message, usersData }) {
    const data = readData();
    const sortedUsers = Object.entries(data.users)
        .filter(([id, userData]) => userData.chips > 0)
        .sort(([, a], [, b]) => b.chips - a.chips)
        .slice(0, 10);

    if (sortedUsers.length === 0) return message.reply("The casino leaderboard is empty!");

    let lbMsg = "🏆 Richest Players in Aiko Royale 🏆\n\n";
    for (let i = 0; i < sortedUsers.length; i++) {
        const [userID, userData] = sortedUsers[i];
        try {
            const name = await usersData.getName(userID);
            lbMsg += `${i + 1}. ${name}: ${userData.chips.toLocaleString()} 🎟️\n`;
        } catch (e) {
            lbMsg += `${i + 1}. User ${userID.slice(0,6)}: ${userData.chips.toLocaleString()} 🎟️\n`;
        }
    }
    message.reply(lbMsg);
}

