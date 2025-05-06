const axios = require("axios");

module.exports = {
  config: {
    name: "miko",
    version: "1.1",
    author: "Rishad",
    countDown: 5,
    role: 0,
    shortDescription: {
      vi: "chat with miko",
      en: "chat with miko"
    },
    longDescription: {
      vi: "chat with miko",
      en: "chat with miko"
    },
    category: "chat",
    guide: {
      en: "{pn} 'prompt'\nexample:\n{pn} hi there \nyou can reply to chat"
    }
  },
  onStart: async function ({ message, event, args, commandName }) {
    const prompt = args.join(" ");
    const defaultp = "hello there";

    try {
      const uid = event.senderID;
      const imageUrl = extractImageUrlFromMessage(event);
      const response = await callMikoAPI(prompt || defaultp, uid, imageUrl);

      if (response && response.result) {
        let formSend = {
          body: response.result
        };

        if (response.imageUrl && response.imageUrl.length > 0) {
          const imageStream = await global.utils.getStreamFromURL(response.imageUrl[0]);
          formSend.attachment = imageStream;
        }

        message.reply(formSend, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID
          });
        });
      } else {
        console.error("API Error:", response);
        sendErrorMessage(message, "Server not responding ❌");
      }
    } catch (error) {
      console.error("Request Error:", error.message);
      sendErrorMessage(message, "Server not responding ❌");
    }
  },
  onReply: async function ({ message, event, Reply, args }) {
    if (event.senderID != Reply.author) return message.reply('🐸 Who are you ?');

    let { author, commandName } = Reply;
    if (event.senderID !== author) return;
    const prompt = args.join(" ");

    try {
      const uid = event.senderID;
      const imageUrl = extractImageUrlFromMessage(event);
      const response = await callMikoAPI(prompt, uid, imageUrl);

      if (response && response.result) {
        let formSend = {
          body: response.result
        };

        if (response.imageUrl && response.imageUrl.length > 0) {
          const imageStream = await global.utils.getStreamFromURL(response.imageUrl[0]);
          formSend.attachment = imageStream;
        }

        message.reply(formSend, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID
          });
        });
      } else {
        console.error("API Error:", response);
        sendErrorMessage(message, "Server not responding ❌");
      }
    } catch (error) {
      console.error("Request Error:", error.message);
      sendErrorMessage(message, "Server not responding ❌");
    }
  }
};

function sendErrorMessage(message, errorMessage) {
  message.reply({ body: errorMessage });
}

async function callMikoAPI(prompt, uid, imageUrl) {
  try {
    const apiUrl = `https://for-devs.onrender.com/api/miko?query=${encodeURIComponent(prompt)}&uid=${uid}&apikey=rishadboss`;
    const apiUrlWithImage = imageUrl ? `${apiUrl}&vision=${encodeURIComponent(imageUrl)}` : apiUrl;
    const response = await axios.get(apiUrlWithImage);
    return response.data;
  } catch (error) {
    throw new Error("Failed to call Miko API");
  }
}

function extractImageUrlFromMessage(event) {
  if (event.type === "message_reply" && event.messageReply.attachments[0]?.type === "photo") {
    return event.messageReply.attachments[0]?.url;
  }
  return null;
}