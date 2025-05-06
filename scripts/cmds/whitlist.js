const { config } = global.GoatBot;
const { client } = global;
const fs = require('fs');

module.exports = {
  config: {
    name: "whitelistuser",
    aliases: ["wlu", "wu"],
    version: "1.0",
    author: "Abdul Kaiyum",
    role: 2,
    description: {
      en: "Add, delete, or list user IDs from whitelistuser"
    },
    category: "𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥",
    guide: {
      en: "{pn} [add | del | list | enable | disable]",
    }
  },
  onStart: async function ({ message, args, usersData }) {
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync(client.dirConfig));
    } catch (err) {
      console.error('', err);
    }

    const whiteListMode = config.whiteListMode || { enable: false, whiteListIds: [] };
    const whiteListIds = whiteListMode.whiteListIds;
    const action = args[0];
    const userId = args[1];

    if (action === "add") {
      if (!whiteListIds.includes(userId)) {
        const userData = await usersData.get(userId);
        const userName = userData.name;
        whiteListIds.push(userId);
        whiteListMode.whiteListIds = whiteListIds;
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        message.reply(`• ${userName} (${userId}) has been added to WhiteListIds ✅`);
      } else {
        const userData = await usersData.get(userId);
        const userName = userData.name;
        message.reply(`• ${userName} (${userId}) is already in the WhiteListIds ✅`);
      }
    } else if (action === "del") {
      const index = whiteListIds.indexOf(userId);
      if (index >= 0) {
        const userData = await usersData.get(userId);
        const userName = userData.name;
        whiteListIds.splice(index, 1);
        whiteListMode.whiteListIds = whiteListIds;
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        message.reply(`• ${userName} (${userId}) has been removed from WhiteListIds ✅`);
      } else {
        const userData = await usersData.get(userId);
        const userName = userData.name;
        message.reply(`• ${userName} (${userId}) is not in the WhiteListIds ❌`);
      }
    } else if (action === "list") {
      if (whiteListIds.length === 0) {
        message.reply("No user IDS in WhiteListIds ❌");
      } else {
        const userNames = await Promise.all(
          whiteListIds.map(userId => usersData.get(userId).then(data => data.name))
        );
        const userList = whiteListIds.map((id, index) => `${index+1}. ${userNames[index]} (${id})`).join('\n');
        message.reply(`User IDS in WhiteListIds:\n${userList}`);
      }
    } else if (action === "enable") {
      whiteListMode.enable = true;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      message.reply(`WhiteListUserMode has been Enabled ✅`);
    } else if (action === "disable") {
      whiteListMode.enable = false;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      message.reply(`WhiteListUserMode has been Disabled ✅`);
    } else {
      message.reply("Invalid action. Usage: /whitelistuser [add/del/list/enable/disable] [user ID]");
    }
  }
};
