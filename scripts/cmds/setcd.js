module.exports = {
  config: {
    name: "setcountdown",
    aliases: ["setcd"],
    version: "1.0",
    author: "sheikh farid",
    countDown: 10,
    role: 2,
    shortDescription: {
      en: ""
    },
    longDescription: {
      en: ""
    },
    category: "BOX CHAT",
    guide: {
      en: ""
    }
  },
  langs: {
    en: {
      gg: ""
    }
  },
  onStart: async function({ message, args, api }) {
    if (args.length < 2 || isNaN(args[1])) {
      return message.reply("Invalid syntax! Please use `setcountdown [commandName] [countDown]`");
    }

    const commandName = args[0];
    const countDown = parseInt(args[1]);

    try {
      const command = require(`./${commandName}`);
      command.config.countDown = countDown;
      
      const fs = require("fs");
      fs.writeFileSync(`./${commandName}.js`, `module.exports = ${JSON.stringify(command, null, 2)};`, "utf8");
      
      message.reply(`Countdown of ${commandName} command updated to ${countDown}`);
    } catch (error) {
      message.reply(`An error occurred: ${error}`);
    }
  }
};