const fs = require('fs');
const path = require('path');
const axios = require('axios');

const countryDataPath = path.join(__dirname, 'country_data.json');
const userDataPath = path.join(__dirname, 'user_data.json');

let countryData = [];
let userData = {};

try {
  userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
} catch (error) {
  console.error('Error loading user data:', error);
}

async function fetchCountryData() {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all');
    countryData = response.data;
    fs.writeFileSync(countryDataPath, JSON.stringify(countryData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error fetching country data:', error);
  }
}

async function getCountryData() {
  try {
    countryData = JSON.parse(fs.readFileSync(countryDataPath, 'utf8'));
  } catch (error) {
    console.error('Country data not found, fetching new data...');
    await fetchCountryData();
  }
}

module.exports = {
  config: {
    name: "flag",
    version: "1.2",
    author: "Abdul Kaiyum",
    role: 0,
    countDown: 30,
    shortDescription: { en: "Guess the country from the flag" },
    longDescription: { en: "A game where users guess the country based on the flag shown" },
    category: "games",
    guide: { en: "{pn}" },
  },

  onStart: async function ({ message, event, getLang, api }) {
    const userId = event.senderID;

    if (!userData[userId]) {
      userData[userId] = {
        earnings: 0,
      };
    }

    await getCountryData();

    const randomCountry = countryData[Math.floor(Math.random() * countryData.length)];
    const countryName = randomCountry.name.common;
    const flagImageUrl = randomCountry.flags.png;

    try {
      const flagImageResponse = await axios.get(flagImageUrl, { responseType: 'stream' });

      message.reply({
        body: `Guess the country:`,
        attachment: flagImageResponse.data
      }, (err, info) => {
        if (err) {
          console.error('Error sending flag image:', err);
          return message.reply("Failed to fetch the flag image. Please try again.");
        }

        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          countryName
        });

        // Set timer to unsend the message after 40 seconds
        setTimeout(() => {
          api.unsendMessage(info.messageID, (err) => {
            if (err) console.error('Error unsending message:', err);
          });
          global.GoatBot.onReply.delete(info.messageID);
        }, 40000); // 40 seconds
      });
    } catch (error) {
      console.error('Error fetching flag image:', error);
      message.reply("Failed to fetch the flag image. Please try again.");
    }
  },

  onReply: async function ({ message, Reply, event, usersData }) {
    const { author, countryName, messageID } = Reply;

    if (event.senderID !== author) {
      return message.reply("⚠️ You are not the player of this question");
    }

    if (event.body.toLowerCase().trim() === countryName.toLowerCase().trim()) {
      global.GoatBot.onReply.delete(messageID);
      const earnings = Math.floor(Math.random() * 700);
      userData[event.senderID].earnings += earnings;
      await usersData.addMoney(event.senderID, earnings);
      message.reply(`🎉 Congratulations, you have answered correctly and received $${earnings}. Your total earnings are $${userData[event.senderID].earnings}.`);
    } else {
      message.reply(`⚠️ You have answered incorrectly.`);
    }

    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8');
  }
};
