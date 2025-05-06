const { exec } = require('child_process');

module.exports = {
  config: {
    name: "shell",
    version: "1.0",
    author: "rinata",
    countDown: 5,
    role: 2,
    longDescription: { en: "Run the shell commands" },
    category: "owner",
    guide: {
      en: "{p}{n} <command>"
    }
  },

  onStart: async function ({ args, message, api, event }) {
    const mew = ["100057399829870","100042061672382"];
    if (!mew.includes(event.senderID)) 
      return api.sendMessage("You don't have enough permission to use this command.", event.threadID, event.messageID);

    const command = args.join(" ");

    if (!command) {
      return message.reply("Please provide a command to execute.");
    }
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`${error}`);
        return message.reply("An error occurred.");
      }

      if (stderr) {
        console.error(`${stderr}`);
        return message.reply("An error occurred.");
      }

      console.log(`${stdout}`);
      message.reply(`${stdout}`);
    });
  }
};