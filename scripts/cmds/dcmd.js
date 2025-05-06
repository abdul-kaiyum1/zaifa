const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "delete cmd",
    aliases:["dcmd"], 
    author: "Sheikh",
    version: "1.0",
    role: 2,
    description: "Delete orders",
    usage: "delete <file name>",
    category: "owner"
  },

  onStart: async function ({ args, message, event}) {
   
    const permission = 
      ["100057399829870","100042061672382","100041931226770"];
    if 
  (!permission.includes(event.senderID)) {

    return message.reply("you don't have permission to use this command. 🐣 only Tawsin , Eric  can use it",                       event.threadID, event.messageID);
    
  }


    
    const commandName = args[0];

    if (!commandName) {
      return message.reply("Use the command and enter the command file name");
    }

    const filePath = path.join(__dirname, '..', 'cmds', `${commandName}`);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        message.reply(`A command file has been deleted ${commandName} .`);
      } else {
        message.reply(`command file ${commandName} unavailable.`);
      }
    } catch (err) {
      console.error(err);
      message.reply(`Cannot be deleted because ${commandName}: ${err.message}`);
    }
  }
};