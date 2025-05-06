const { config } = global.GoatBot;
const { client } = global;
const fs = require('fs');

module.exports = {
  config: {
    name: "whitelistthread",
    aliases: ["wltmt","wt"],
    version: "1.0",
    author: "tanvir | Mesbah Bb'e",
    role: 2,
    description: {
      en: "Add, delete, or list thread IDs from whitelistthread"
    },
    category: "𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥",
    guide: {
      en: "{pn} [add | del | list | enable | disable]",
    }
  },
  onStart: async function ({ message, args, threadsData }) {
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync(client.dirConfig));
    } catch (err) {
      console.error('', err);
    }

    const whiteListModeThread = config.whiteListModeThread || { enable: false, whiteListThreadIds: [] };
    const whiteListThreadIds = whiteListModeThread.whiteListThreadIds;
    const action = args[0];
    const threadId = args[1];

    if (action === "add") {
      if (!whiteListThreadIds.includes(threadId)) {
        const threadData = await threadsData.get(threadId);
        const threadName = threadData.threadName;
        whiteListThreadIds.push(threadId);
        whiteListModeThread.whiteListThreadIds = whiteListThreadIds;
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        message.reply(`• ${threadName} (${threadId}) has been added to WhiteListThreadIds ✅`);
      } else {
        const threadData = await threadsData.get(threadId);
        const threadName = threadData.threadName;
        message.reply(`• ${threadName} (${threadId}) is already in the WhiteListThreadIds ✅`);
      }
    } else if (action === "del") {
      const index = whiteListThreadIds.indexOf(threadId);
      if (index >= 0) {
        const threadData = await threadsData.get(threadId);
        const threadName = threadData.threadName;
        whiteListThreadIds.splice(index, 1);
        whiteListModeThread.whiteListThreadIds = whiteListThreadIds;
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        message.reply(`• ${threadName} (${threadId}) has been removed from WhiteListThreadIds ✅`);
      } else {
        const threadData = await threadsData.get(threadId);
        const threadName = threadData.threadName;
        message.reply(`• ${threadName} (${threadId}) is not in the WhiteListThreadIds ❌`);
      }
    } else if (action === "list") {
      if (whiteListThreadIds.length === 0) {
        message.reply("No thread IDS in WhiteListThreadIds ❌");
      } else {
        const threadNames = await Promise.all(
          whiteListThreadIds.map(threadId => threadsData.get(threadId).then(data => data.threadName))
        );
        const threadList = whiteListThreadIds.map((id, index) => `${index+1}. ${threadNames[index]} (${id})`).join('\n');
        message.reply(`Thread IDS in whiteListThreadIds:\n${threadList}`);
      }
    } else if (action === "enable") {
      whiteListModeThread.enable = true;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      message.reply(`whiteListThreadMode has been Enabled ✅`);
    } else if (action === "disable") {
        whiteListModeThread.enable = false;
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        message.reply(`whiteListThreadMode has been Disabled ✅`);
      } else {
        message.reply("Invalid action. Usage: /whitelistthread [add/del/list/enable/disable] [thread ID]");
      }
  }
};