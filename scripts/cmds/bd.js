const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "botdetector",
    aliases: ["bd"],
    version: "1.0",
    role:"2",
    author: "Abdul Kaiyum",
    shortDescription: "Manage bot detector lists",
    longDescription: "Add or remove user IDs from antibotBypass.json and botData.json",
    category: "admin",
    guide: "{pn} anti add/remove uid\n{pn} botd add/remove uid"
  },

  onStart: async function ({ message, args }) {
    const action = args[0]; // "anti" or "botd"
    const operation = args[1]; // "add" or "remove"
    const uid = args[2]; // User ID to add or remove

    if (!action || !operation || !uid) {
      return message.reply("Usage: {pn} anti/botd add/remove uid");
    }

    const validActions = ["anti", "botd"];
    const validOperations = ["add", "remove"];

    if (!validActions.includes(action) || !validOperations.includes(operation)) {
      return message.reply("Invalid action or operation. Usage: {pn} anti/botd add/remove uid");
    }

    const filePaths = {
      anti: path.join(__dirname, '../events/antibotBypass.json'),
      botd: path.join(__dirname, '../events/botData.json')
    };

    const filePath = filePaths[action];

    // Read the JSON file
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      return message.reply(`Failed to read ${action} data: ${error.message}`);
    }

    if (operation === "add") {
      if (!data.includes(uid)) {
        data.push(uid);
      } else {
        return message.reply(`UID ${uid} is already in the ${action} list.`);
      }
    } else if (operation === "remove") {
      const index = data.indexOf(uid);
      if (index > -1) {
        data.splice(index, 1);
      } else {
        return message.reply(`UID ${uid} is not found in the ${action} list.`);
      }
    }

    // Write the updated JSON data back to the file
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      message.reply(`Successfully ${operation}ed UID ${uid} in the ${action} list.`);
    } catch (error) {
      return message.reply(`Failed to write ${action} data: ${error.message}`);
    }
  }
};