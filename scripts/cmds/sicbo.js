const axios = require('axios');

// Sleep function for suspense
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  config: {
    name: "sicbo",
    aliases: ['bet', 'slot'],
    version: "2.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    category: "game",
    shortDescription: {
      en: "🎲 Try your luck in Sic Bo!",
    },
    longDescription: {
      en: "Test your fate in this thrilling Sic Bo game and see if fortune smiles upon you!",
    },
    guide: {
      en: `
💡 How to Play:
1️⃣ Type {pn} sicbo <amount> to place your bet.
2️⃣ Aiko will roll the dice for you!
3️⃣ Win big or lose it all—are you ready?

🎲 Example:
{pn} sicbo 500
      `,
    },
  },

  onStart: async function ({ message, event, usersData, args }) {
    const { senderID } = event;

    
    await sleep(800);

  
    const userData = await usersData.get(senderID);
    let balance = parseFloat(userData.money || "0");

    if (balance <= 0) {
      return message.reply("🛑 Aiko sighs: You're broke! Come back when you have some cash to bet.");
    }

    // Validate bet input
    const betInput = args[0];
    if (!/^\d+(\.\d+)?$/.test(betInput)) {
      return message.reply("⚠️ Aiko says: That's not a valid bet! Please enter a number.");
    }

    let betAmount = parseFloat(betInput);
    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply("⚠️ Aiko says: Your bet must be a positive number. Try again!");
    }

    const maxMoney = 1e104;
    if (balance >= maxMoney) {
      return message.reply("💰 Aiko cheers: You've already hit the wealth limit! Time to retire as a legend.");
    }

    if (betAmount > balance) {
      return message.reply("❌ Aiko frowns: You don’t have enough money for this bet.");
    }

    // Sic Bo dice roll
    const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1);
    const total = dice.reduce((sum, d) => sum + d, 0);
    const resultMsg = `🎲 Dice Roll: [${dice.join(", ")}] (Total: ${total})`;

    const winPercentage = 0.5;
    const isWin = Math.random() <= winPercentage;

    let resultMessage = "\n✨ **Welcome to Aiko's Sic Bo Table!** ✨\n";
    resultMessage += "----------------------\n";
    resultMessage += `${resultMsg}\n`;
    resultMessage += "----------------------\n";

    let reward = 0;

    if (isWin) {
      reward = betAmount * 2;
      if (balance + reward > maxMoney) {
        return message.reply("💰 Aiko exclaims: You've hit the wealth cap! You're unstoppable.");
      }

      balance += reward;
      await usersData.set(senderID, { money: balance.toString() });

      resultMessage += `🎉 **Aiko smiles:** You won!\n`;
      resultMessage += `💸 Bet: ${formatNumberWithFullForm(betAmount)}\n`;
      resultMessage += `💰 Reward: ${formatNumberWithFullForm(reward)}\n`;
      resultMessage += `💼 New Balance: ${formatNumberWithFullForm(balance)}\n`;
      resultMessage += "----------------------\n";
      resultMessage += `🥳 Aiko whispers: "Luck is on your side! Keep going or cash out."`;
    } else {
      let lostAmount = Math.min(betAmount, balance);
      balance -= lostAmount;
      await usersData.set(senderID, { money: balance.toString() });

      resultMessage += `❌ **Aiko sighs:** You lost!\n`;
      resultMessage += `💸 Bet: ${formatNumberWithFullForm(betAmount)}\n`;
      resultMessage += `💔 Lost: ${formatNumberWithFullForm(lostAmount)}\n`;
      resultMessage += `💼 Remaining Balance: ${formatNumberWithFullForm(balance)}\n`;
      resultMessage += "----------------------\n";
      resultMessage += `😔 Aiko says: "Tough luck! Maybe next time you'll win big."`;
    }

    // Final message
    return message.reply(resultMessage);
  },
};

// Format numbers with units
function formatNumberWithFullForm(number) {
  const units = [
    "", "Thousand", "Million", "Billion", "Trillion", "Quadrillion",
    "Quintillion", "Sextillion", "Septillion", "Octillion", "Nonillion",
    "Decillion", "Undecillion", "Duodecillion", "Tredecillion",
    "Quattuordecillion", "Quindecillion", "Sexdecillion", "Septendecillion",
    "Octodecillion", "Novemdecillion", "Vigintillion", "Unvigintillion", "Duovigintillion",
    "Tresvigintillion", "Quattuorvigintillion", "Quinvigintillion", "Sesvigintillion",
    "Septemvigintillion", "Octovigintillion", "Novemvigintillion", "Trigintillion"
  ];

  let unitIndex = 0;
  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }

  return `${number.toFixed(2)} ${units[unitIndex]}`;
}
