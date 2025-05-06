const fs = require('fs');

function formatText(text) {
    return text.normalize("NFD").toLowerCase();
}

function addToPocket(userID, gadgetName) {
    try {
        let pocketData = [];
        if (fs.existsSync('pocket.json')) {
            pocketData = JSON.parse(fs.readFileSync('pocket.json'));
        }
        const existingUserIndex = pocketData.findIndex(entry => entry.uid === userID);
        if (existingUserIndex !== -1) {
            if (pocketData[existingUserIndex].gadgets[gadgetName]) {
                pocketData[existingUserIndex].gadgets[gadgetName]++;
            } else {
                pocketData[existingUserIndex].gadgets[gadgetName] = 1;
            }
        } else {
            pocketData.push({ uid: userID, gadgets: { [gadgetName]: 1 } });
        }
        fs.writeFileSync('pocket.json', JSON.stringify(pocketData, null, 2));
    } catch (error) {
        console.error('Error adding data to pocket:', error);
    }
}

async function onStart({ message, event, commandName }) {
    if (config.author !== "sheikh | Samir Œ") {
        message.reply("You're not the author. Access denied.");
    } else {
        const json = JSON.parse(fs.readFileSync('dora2.json'));
        const characterData = json[Math.floor(Math.random() * json.length)];

        const characterName = characterData.name;
        const characterImageLink = characterData.link;

        const imageBuffer = await global.utils.getStreamFromURL(characterImageLink);

        message.reply({
            body: `${langs.en.reply}`,
            attachment: imageBuffer
        }, (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
                commandName,
                messageID: info.messageID,
                author: event.senderID,
                answer: formatText(characterName)
            });
        });
    }
}

async function onReply({ message, Reply, event, getLang, usersData, envCommands, commandName }) {
    const { author, messageID, answer } = Reply;

    if (formatText(event.body) === answer) {
        global.GoatBot.onReply.delete(messageID);
        message.unsend(event.messageReply.messageID);
        await message.reply(getLang("correct"));
   const { senderID } = event;
const mew = Math.floor(Math.random() * 10) + 1
		const userData = await usersData.get(senderID);
await usersData.set(senderID, {
			money: 100 + userData.money
				});
		
           addToPocket(event.senderID, answer);
    } else {
        message.reply(getLang("wrong"));
    }
}

const config = {
    name: "doremon",
    aliases: ["doraemon"],
    version: "1.0",
    author: "sheikh | Samir Œ",
    countDown: 5,
    role: 0,
    shortDescription: {
        vi: "",
        en: "Guess the name of Doraemon tools"
    },
    longDescription: {
        vi: "",
        en: "A game to guess the name of Doraemon tools."
    },
    category: "games",
    guide: {
        en: "{pn}"
    },
    envConfig: {
        reward: 100
    }
};

const getReward = (envConfig) => {
  return envConfig.reward || 100; 
};

const langs = {
    en: {
        reply: "Guess the name of this\nDoraemon tools 🛠️:",
        correct: `Congratulations you won ${getReward(config.envConfig)}$ 🙀`, 
        wrong: `baka! Wrong answer🐣 `
    }
};

module.exports = {
    config,
    langs,
    onStart,
    onReply
};