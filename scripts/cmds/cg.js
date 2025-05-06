const fs = require('fs');

module.exports = {
  config: {
    name: "shuffle-cup",
    aliases: ["cupGame", "shufflecup", "cg"],
    version: "1.0",
    author: "Sheikh Farid",
    role: 0,
    countdown: 10,
    reward: Math.floor(Math.random() * (100 - 50 + 1) + 50),
    category: "games",
    shortDescription: {
      en: "Guess which cup the ball is under"
    },
    longDescription: {
      en: "A game where you have to guess which cup the ball is under to win a prize"
    },
    guide: {
      en: "{prefix}shuffleCup - Start the cup shuffling game"
    }
  },

  onStart: async function ({ message, event, commandName, api }) {
    const cups = ["⚫", "🔴", "🟠", "🟡", "🟢", "🔵", "🟤"];
    let shuffledCups = shuffleArray(cups).slice(0, 3);
    const balls = shuffledCups.join(" ");
    const sentMessage = await message.reply(`Shuffling cups...\n${balls}`);

    for (let i = 0; i < 4; i++) {
      await editWithDelay(api, sentMessage.messageID, shuffleCupsText(shuffledCups), 500);
      shuffledCups = shuffleArray(shuffledCups);
    }

    const winningIndex = Math.floor(Math.random() * 3);
    const ballCup = winningIndex;

    global.GoatBot.onReply.set(sentMessage.messageID, {
      commandName,
      messageID: sentMessage.messageID,
      author: event.senderID,
      ballCup,
      shuffledCups
    });

    setTimeout(async () => {
      const question = `Which cup is the ball under? ${balls}`;
      await api.editMessage(question, sentMessage.messageID);
    }, 1500);
  },

  onReply: async function ({ message, Reply, event, usersData, envCommands, commandName, api }) {
    const { author, messageID, ballCup, shuffledCups } = Reply;
  if (author !== event.senderID) return;
    const userChoice = parseInt(event.body);
message.unsend(messageID);
    if (userChoice >= 1 && userChoice <= 3) {
      const isWinner = Math.random() <= 0.9; 
      if (userChoice === ballCup + 1 && isWinner) { 
        const reward = Math.floor(Math.random() * (100 - 50 + 1) + 50);
        await usersData.addMoney(event.senderID, reward);
        const winningCups = shuffledCups.map((cup, index) => `${cup}`);
        await message.reply(`Congratulations! You found the ball and win ${reward} coins!`);
      } else {
        await message.reply(`Sorry, the ball was not under your chosen cup. You lose.`);
      }
    } else {
      await message.reply(`Invalid choice. Please choose a cup number between 1 and 3.`);
    }
  }
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function editWithDelay(api, uid, text, delay) {
  await new Promise(resolve => setTimeout(resolve, delay));
  await api.editMessage(text, uid);
}

function shuffleCupsText(cups) {
  return `Shuffling cups...\n${cups.join("")}`;
}