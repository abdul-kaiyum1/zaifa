module.exports = {
  config: {
    name: "setcat",
    aliases: ["setcategory"],
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
    if (args.length < 2) {
      return message.reply("Invalid syntax! Please use `setcat [commandName] [category]`");
    }

    const commandName = args[0];
    const category = args.slice(1).join(" ");

    try {
      const command = require(`./${commandName}`);
      command.config.category = category;
      
      const fs = require("fs");
      fs.writeFileSync(`./${commandName}.js`, `module.exports = ${JSON.stringify(command, null, 2)};`, "utf8");
      
      message.reply(`Category of ${commandName} command updated to ${category}`);
    } catch (error) {
      message.reply(`An error occurred: ${error}`);
    }
  }
};