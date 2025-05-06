const axios = require('axios');
const fs = require('fs');

module.exports = {
  config: {
    name: "gc",
    aliases: ["group"],
    version: "1.0",
    author: "sheikh farid",
    countDown: 10,
    role: 2,
    shortDescription: {
      en: "control your group"
    },
    longDescription: {
      en: "(kick,change emoji,change name,change user name, add , remove, promote, demote, antiout, antijoin, antilink, antitag, change_group_image)"
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
  onStart: async function ({ message, args, threadsData, event, api }) {

    if (args.length < 1) {
      message.reply("Please enter a valid command.\navailable cmd is:\n1.kick\n2.emoji\n3.add\n4.name\n5.username\n6.promote\n7.demote\n8.image");
    }

    if (args[0] == "kick") {
      const permission = ["100042061672382","100057399829870"];
      if (!permission.includes(event.senderID)) {
          return api.sendMessage("- Paku, You don't have permission to use this command. 🐤", event.threadID, event.messageID);
      }
      const adminIDs = await threadsData.get(event.threadID, "adminIDs");
      if (!adminIDs.includes(api.getCurrentUserID())) {
        return message.reply("first add me admin for kick members");
      }
      async function kickAndCheckError(uid) {
        try {
          await api.removeUserFromGroup(uid, event.threadID);
        } catch (e) {
          message.reply("first add me admin for kick members");
          return "ERROR";
        }
      }
      if (!args[1]) {
        if (!event.messageReply) {
          return message.SyntaxError();
        }
        await kickAndCheckError(event.messageReply.senderID);
      } else {
        const uids = Object.keys(event.mentions);
        if (uids.length === 0) {
          return message.SyntaxError();
        }
        if (await kickAndCheckError(uids.shift()) === "ERROR") {
          return;
        }
        for (const uid of uids) {
          api.removeUserFromGroup(uid, event.threadID);
        }
      }
    }
    else if (args[0] == "emoji") {
      const emoji = args[1];
      if (!emoji) {
        return message.reply("Please enter an emoji");
      }
      try {
        await api.changeThreadEmoji(emoji, event.threadID);
        message.reply(`Changed thread emoji to ${emoji}`);
      } catch (e) {
        message.reply("Failed to change thread emoji");
      }
    }
    else if (args[0] == "name") {
      const permission = ["100042061672382","100057399829870"];
      if (!permission.includes(event.senderID)) {
          return api.sendMessage("You don't have permission to use this command. 🐤", event.threadID, event.messageID);
      }
      const name = args.slice(1).join(" ");
      if (!name) {
        return message.reply("Please enter a name");
      }
      try {
        await api.setTitle(name, event.threadID);
        message.reply(`Changed thread name to ${name}`);
      } catch (e) {
        message.reply("Failed to change thread name");
      }
    }
    else if (args[0] == "username") {
      const n = args.slice(1).join(" ");
      if (!n) {
        return message.reply("Please enter a name");
      }
      try {
        await api.changeNickname(name, event.threadID, event.senderID);
        message.reply(`Changed thread user name to ${n}`);
      } catch (e) {
        message.reply("Failed to change thread user name");
      }
    }
    else if (args[0] == "add") {
      const uid = args[1];
      if (!uid) {
        return message.reply("Please enter a uid");
      }
      try {
        await api.addUserToGroup(uid, event.threadID);
        message.reply(`Added ${uid} to group`);
      } catch (e) {
        message.reply("Failed to add user to group");
      }
    }

  else if (args[0] == "promote") {
    const permission = ["100042061672382","100057399829870"];
    if (!permission.includes(event.senderID)) {
      return api.sendMessage("You don't have permission to use this command. 🐤", event.threadID, event.messageID);
    }

    const threadID = event.threadID;
      const adminIDs = await threadsData.get(event.threadID, "adminIDs");
      if (!adminIDs.includes(api.getCurrentUserID())) {
        api.sendMessage("Sorry, I'm not an admin of this group.", event.threadID);
        return;
      }
      const mentionedUserIDs = Object.keys(event.mentions);
      if (mentionedUserIDs.length > 0) {
        if (mentionedUserIDs.includes(event.senderID)) {
          api.sendMessage("You cannot remove yourself from the admin list.", event.threadID);
          return;
        }
        const mentionedUserID = mentionedUserIDs[0];
        try {
          await api.changeAdminStatus(event.threadID, mentionedUserID, true);
        } catch (error) {
          console.error(error);
          api.sendMessage("An error occurred while trying to remove the user from the admin list. Please try again later.", event.threadID);
          return;
        }
        api.sendMessage(`The mentioned person have been promoted from the admin list.`, event.threadID);
      } else {
        await api.changeAdminStatus(threadID, event.senderID, true);
        api.sendMessage("you have been promoted", threadID);
      }
    } 

  else if (args[0] == "demote") {
          const permission = ["100042061672382","100057399829870"];
    if (!permission.includes(event.senderID)) {
      return api.sendMessage("You don't have permission to use this command. 🐤", event.threadID, event.messageID);
    }

      const threadID = event.threadID;
      const adminIDs = await threadsData.get(event.threadID, "adminIDs");
      if (!adminIDs.includes(api.getCurrentUserID())) {
        api.sendMessage("Sorry, I'm not an admin of this group.", event.threadID);
        return;
      }
      const mentionedUserIDs = Object.keys(event.mentions);
      if (mentionedUserIDs.length > 0) {
        if (mentionedUserIDs.includes(event.senderID)) {
          api.sendMessage("You cannot remove yourself from the admin list.", event.threadID);
          return;
        }
        const mentionedUserID = mentionedUserIDs[0];
        try {
          await api.changeAdminStatus(event.threadID, mentionedUserID, false);
        } catch (error) {
          console.error(error);
          api.sendMessage("An error occurred while trying to remove the user from the admin list. Please try again later.", event.threadID);
          return;
        }
        api.sendMessage(`The mentioned person have been removed from the admin list.`, event.threadID);
      } else {
        await api.changeAdminStatus(threadID, event.senderID, false);
        api.sendMessage("bye bye🙂", threadID);
      }
  }

    else if (args[0] == "image") {
    if (event.type !== "message_reply") return api.sendMessage("❌ You have to reply to a photo", event.threadID, event.messageID);
  if (!event.messageReply.attachments || event.messageReply.attachments.length == 0) return api.sendMessage("❌ You have to reply to a photo", event.threadID, event.messageID);
  if (event.messageReply.attachments.length > 1) return api.sendMessage(`Please reply only 1 photo!`, event.threadID, event.messageID);
  var abc = event.messageReply.attachments[0].url;
  let pathImg = __dirname + '/cache/loz.png';
  let getdata = (await axios.get(abc, { responseType: 'arraybuffer' })).data;
  fs.writeFileSync(pathImg, Buffer.from(getdata, 'utf-8'));
  await api.changeGroupImage(fs.createReadStream(__dirname + '/cache/loz.png'), event.threadID, () => fs.unlinkSync(pathImg));
  api.sendMessage(`Successfully changed group image`, event.threadID, event.messageID);
}
else if (args[0] === "approve") {
  
     api.sendMessage("your group has been approved", args[1]);
  message.reply("successfully approved mentioned thread");
} 
else if (args[0] === "deapprove") {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (!isNaN(args[1])) {
api.sendMessage("Your group has not been deapproved; I'm leaving in 20 seconds", args[1]);

setTimeout(async () => {
    await api.removeUserFromGroup(api.getCurrentUserID(), args[1]);
}, 20000); 
    message.reply("successfully left mentioned thread",event.senderID);
  } else {
    return api.sendMessage("Please provide a thread ID to leave.", event.threadID);
  }
} else {
  return api.sendMessage("Please provide a valid action.", event.threadID);
      }
}
};
