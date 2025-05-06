module.exports = {
  config: {
    name: "pm",
    aliases: [],
    version: "1.0",
    author: "NZ R",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: ""
    },
    longDescription: {
      en: ""
    },
    category: "Owner",
    guide:{
      en: ""
    }
  },
  onStart: async function ({ api, event, args, message }) {
    if (args.length < 2) {
      return message.reply("Nope! Seems like you forgot to specify the recipient or the message. Use: pm [recipient] [message]");
    }

    const recipient = args[0];
    const messageContent = args.slice(1).join(" ");

    api.sendMessage({
      body: ` ${messageContent}`,
      mentions: [{ id: event.senderID, tag: "Agent 007 🕵‍♀  " }]
    }, recipient, (err, info) => {
      if (err) {
        return message.err("The message could not be delivered. It seems like the recipient is a master of encryption!");
      }
      message.reply(`📃 Your personal  message "${messageContent}" has been sent to ${recipient}. Watch out for their reply!`);
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "pm",
        messageID: info.messageID,
        messageIDSender: event.messageID,
        threadID: event.threadID,
        type: "pmReply"
      });
    });
  },

  onReply: async function ({ args, event, api, message, usersData, Reply }) {
    const { type, threadID, messageIDSender } = Reply;
    const senderName = await usersData.getName(event.senderID);

    switch (type) {
      case "pmReply": {
        const formMessage = {
          body: `🔍 message from ${senderName}: ${args.join(" ")}`
        };

        api.sendMessage(formMessage, threadID, (err, info) => {
          if (err) {
            return message.err("The encrypted reply could not be delivered. It seems like the sender is hiding in the shadows!");
          }
          message.reply("");
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "pm",
            messageID: info.messageID,
            messageIDSender: event.messageID,
            threadID: event.threadID,
            type: "pmReply"
          });
        });
        break;
           }
       //NZ R
      default: {
        break;
      }
    }
  }
};