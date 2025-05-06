const fs = require("fs-extra");

module.exports = {
  config: {
    name: "roulette",
    aliases: ["rl"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 20,
    role: 0,
    shortDescription: {
      en: "Play Roulette and test your luck!",
    },
    longDescription: {
      en: "Experience the thrill of the Roulette wheel. Place your bets and see if you can win big!",
    },
    category: "Game",
    guide: {
      en: "{pn} <bet type> <amount>\n\nBet types:\n- number (0-36)\n- red\n- black\n- odd\n- even\n\nExamples:\n{pn} red 100\n{pn} 17 50\n{pn} odd 200",
    },
  },
  langs: {
    en: {
      invalid_amount: "Please enter a valid and positive amount to bet.",
      not_enough_money: "Sorry, you don't have enough money to place that bet.",
      invalid_bet: "Invalid bet type. Please bet on a number (0-36), red, black, odd, or even.",
      bet_message: "You placed a bet of $%1 on %2.",
      win_message: "Congratulations! The ball landed on %1. You won $%2.",
      lose_message: "Sorry, the ball landed on %1. You lost $%2.",
    },
  },
  onStart: async function ({ args, message, event, usersData, getLang }) {
    const betType = args[0];
    const betAmount = parseInt(args[1]);

    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply(getLang("invalid_amount"));
    }

    const userData = await usersData.get(event.senderID);
    if (betAmount > userData.money) {
      return message.reply(getLang("not_enough_money"));
    }

    const validBetTypes = ["red", "black", "odd", "even", ...Array.from({ length: 37 }, (_, i) => i.toString())];
    if (!validBetTypes.includes(betType)) {
      return message.reply(getLang("invalid_bet"));
    }

    const wheelResult = spinRouletteWheel();
    const winnings = calculateWinnings(betType, betAmount, wheelResult);

    userData.money += winnings;
    await usersData.set(event.senderID, userData);

    const resultMessage = winnings > 0
      ? getLang("win_message", wheelResult, winnings)
      : getLang("lose_message", wheelResult, betAmount);

    return message.reply(resultMessage);
  },
};

function spinRouletteWheel() {
  const numbers = Array.from({ length: 37 }, (_, i) => i);
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  const result = numbers[Math.floor(Math.random() * numbers.length)];
  const color = redNumbers.includes(result) ? "red" : blackNumbers.includes(result) ? "black" : "green";

  return { number: result, color };
}

function calculateWinnings(betType, betAmount, wheelResult) {
  const { number, color } = wheelResult;

  if (betType === "red" && color === "red") return betAmount * 2;
  if (betType === "black" && color === "black") return betAmount * 2;
  if (betType === "odd" && number % 2 !== 0) return betAmount * 2;
  if (betType === "even" && number % 2 === 0) return betAmount * 2;
  if (betType === number.toString()) return betAmount * 35;

  return -betAmount;
}