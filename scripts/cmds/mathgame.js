const fs = require('fs');

module.exports = {
  config: {
    name: "mathgame",
aliases: ["math","mg"],
    version: "1.0",
    author: "Sheikh",
    role: 0,
    countdown: 10,
    reward: Math.floor(Math.random() * (100 - 50 + 1) + 50),
    category: "games",
    shortDescription: {
      en: "Solve a challenging math problem within a time limit"
    },
    longDescription: {
      en: "A game where you have to solve a difficult math problem within a given time limit to win a prize"
    },
    guide: {
      en: "{prefix}mathgame - Start the challenging math problem-solving game"
    }
  },

  onStart: async function ({ message, event, commandName }) {
    const num1 = Math.floor(Math.random() * 100); // Adjust the range for more difficulty
    const num2 = Math.floor(Math.random() * 100);
    const operator = generateRandomOperator();

    const question = `${num1} ${operator} ${num2}`;
    const answer = calculateAnswer(num1, num2, operator);

    message.reply(`Solve this challenging math problem:\n"${question}" ?`, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName,
        messageID: info.messageID,
        author: event.senderID,
        answer
      });
    });
  },

  onReply: async function ({ message, Reply, event, usersData, envCommands, commandName }) {
    const { author, messageID, answer } = Reply;

    if (parseInt(event.body) === answer) {
      global.GoatBot.onReply.delete(messageID);
      message.unsend(event.messageReply.messageID);
      const reward = Math.floor(Math.random() * (100 - 50 + 1) + 50);
      await usersData.addMoney(event.senderID, reward);
      message.reply(`You win ${reward} coins!`);
    } else {
      message.reply("Sorry, that's incorrect.");
    }
  }
};

function generateRandomOperator() {
  const operators = ["+", "-", "*", "/", "^"]; // Add more complex operators
  const randomIndex = Math.floor(Math.random() * operators.length);
  return operators[randomIndex];
}

function calculateAnswer(num1, num2, operator) {
  switch (operator) {
    case "+":
      return num1 + num2;
    case "-":
      return num1 - num2;
    case "*":
      return num1 * num2;
    case "/":
      return num1 / num2;
    case "^":
      return Math.pow(num1, num2); 
default:
      return 0;
  }
}