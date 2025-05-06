const axios = require('axios');

module.exports = {
  config: {
    name: "gemini",
    aliases: [],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    longDescription: {
      vi: '',
      en: "Gmenimi ai, Api by dipto"
    },
    category: "ai",
    guide: {
      vi: '',
      en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ api, commandName, event, args }) {
    if (!args.length) {
      return api.sendMessage("Please provide a prompt. Usage: {pn} <prompt>", event.threadID, event.messageID);
    }

    const text = args.join(" ").trim();
    const senderID = event.senderID;

    const options = {
      method: 'GET',
      url: 'https://noobs-api2.onrender.com/dipto/llama',
      params: { text, senderID },
      headers: { accept: '*/*' }
    };

    try {
      api.setMessageReaction('⏳', event.messageID, () => {}, true);

      const { data } = await axios.request(options);

      return api.sendMessage(data.data, event.threadID, (error, message) => {
        if (!error) {
          global.GoatBot.onReply.set(message.messageID, {
            commandName,
            author: event.senderID,
            prompt: text,
            conversation: [data.data]
          });
        }
      }, event.messageID);

    } catch (error) {
      return api.sendMessage("Error: " + error.message, event.threadID, event.messageID) && api.setMessageReaction('⚠️', event.messageID, () => {}, true);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const text = event.body;
    const senderID = event.senderID;

    const options = {
      method: 'GET',
      url: 'https://noobs-api2.onrender.com/dipto/llama',
      params: { text, senderID },
      headers: { accept: '*/*' }
    };

    try {
      api.setMessageReaction('⏳', event.messageID, () => {}, true);

      const { data } = await axios.request(options);

      const updatedConversation = [...Reply.conversation, data.data];

      return api.sendMessage(data.data, event.threadID, (error, message) => {
        if (!error) {
          global.GoatBot.onReply.set(message.messageID, {
            commandName: Reply.commandName,
            author: Reply.author,
            prompt: text,
            conversation: updatedConversation
          });
        }
      }, event.messageID);

    } catch (error) {
      return api.sendMessage("Error: " + error.message, event.threadID, event.messageID) && api.setMessageReaction('⚠️', event.messageID, () => {}, true);
    }
  }
};