const fs = require("fs-extra");

const spamStatesFile = "spam.json";
const messageCountsFile = "messageCounts.json";
const spamThreshold = 7;
const warningThreshold = 5;
const spamInterval = 10000;

let spamStates = loadSpamStates();
let messageCounts = loadMessageCounts();

function loadSpamStates() {
  try {
    const data = fs.readFileSync(spamStatesFile, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

function saveSpamStates(states) {
  fs.writeFileSync(spamStatesFile, JSON.stringify(states, null, 2));
}

function loadMessageCounts() {
  try {
    const data = fs.readFileSync(messageCountsFile, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

function saveMessageCounts(counts) {
  fs.writeFileSync(messageCountsFile, JSON.stringify(counts, null, 2));
}

module.exports = {
  config: {
    name: "spamkick",
    version: "1.1",
    author: "NZ R",
    countDown: 5,
    role: 1,
    description: {
      en: "Automatically kick spamming members out of chat box"
    },
    category: "box chat",
    guide: {
      en: "{pn}"
    }
  },

  langs: {
    en: {
      needAdmin: "Please add the bot as an admin before using this feature.",
      warning: "⚠ %username%, you are sending messages too quickly. If you continue, you will be removed from the group. 🛑",
      kicked: "🚫 User %username% has been removed for spamming."
    }
  },

  onStart: async function ({ api, event, threadsData, getLang, message }) {
    const threadID = event.threadID;

    if (!spamStates[threadID]) {
      spamStates[threadID] = 'off';
      saveSpamStates(spamStates);
    }

    const adminIDs = await threadsData.get(event.threadID, "adminIDs");
    if (!adminIDs.includes(api.getCurrentUserID()))
      return message.reply(getLang("needAdmin"));

    if (event.body.toLowerCase().includes('spamkick off')) {
      spamStates[threadID] = 'off';
      saveSpamStates(spamStates);
      return message.reply("SpamKick has been disabled for this chat. 🙅‍♂");
    } else if (event.body.toLowerCase().includes('spamkick on')) {
      spamStates[threadID] = 'on';
      saveSpamStates(spamStates);
      return message.reply("SpamKick has been enabled for this chat! ✅");
    }
  },

  onChat: async function ({ api, event, threadsData, getLang, message }) {
    const { threadID, senderID } = event;

    if (spamStates[threadID] !== 'on') return;

    if (!messageCounts[threadID]) {
      messageCounts[threadID] = {};
    }

    if (!messageCounts[threadID][senderID]) {
      messageCounts[threadID][senderID] = { count: 1, warned: false };
      setTimeout(() => {
        delete messageCounts[threadID][senderID];
        saveMessageCounts(messageCounts);
      }, spamInterval);
    } else {
      messageCounts[threadID][senderID].count++;
      if (messageCounts[threadID][senderID].count > spamThreshold) {
        try {
          const userInfo = await api.getUserInfo(senderID);
          const username = userInfo[senderID].name;
          await api.removeUserFromGroup(senderID, threadID);
          return message.reply(getLang("kicked").replace('%username%', username));
        } catch (error) {
          return message.reply(getLang("needAdmin"));
        }
      } else if (messageCounts[threadID][senderID].count > warningThreshold && !messageCounts[threadID][senderID].warned) {
        const userInfo = await api.getUserInfo(senderID);
        const username = userInfo[senderID].name;
        message.reply(getLang("warning").replace('%username%', username));
        messageCounts[threadID][senderID].warned = true;
      }
    }

    saveMessageCounts(messageCounts);
  }
};
