const axios = require('axios');
 
module.exports = {
  config: {
    name: "gta",
    version: "1.0",
    author: "Samir Œ",
    countDown: 30,
    role: 0,
    shortDescription: {
      en: "Generate art from an image "
    },
    longDescription: {
      en: "Generate art from an image."
    },
    category: "𝗔𝗜-𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗘𝗗",
    guide: {
      en: `[
]
`
    }
  },
 
  onStart: async function ({ api, args, event }) {
    try {
      const imageLink = event.messageReply?.attachments?.[0]?.url;
 
      if (!imageLink) {
        return api.sendMessage('Please reply to an image.', event.threadID, event.messageID);
      }
 
      try {
        const imgurResponse = await axios.get(`https://www.samirxpikachu.run.place/telegraph?url=${encodeURIComponent(imageLink)}&senderId=${event.senderID}`);
 
        if (!imgurResponse.data.success) {
          const errorMessage = imgurResponse.data.error;
 
          if (errorMessage === 'Limit Exceeded') {
            return api.sendMessage('Limit exceeded, try again after 2 hours.', event.threadID, event.messageID);
          } else if (errorMessage === 'Access Forbidden') {
            return api.sendMessage('You are banned because of trying to change credits. Contact admin: [Admin ID](https://www.facebook.com/samir.oe70)', event.threadID, event.messageID);
          }
        }
 
        const imgur = imgurResponse.data.result.link;
        const filter = args[0];
        const apiUrl = `https://www.samirxpikachu.run.place/gta?url=${encodeURIComponent(imgur)}`;
        const imageStream = await global.utils.getStreamFromURL(apiUrl);
 
        if (!imageStream) {
          return api.sendMessage('Something happened to Server will be fixed within 48 hours', event.threadID, event.messageID);
        }
 
        return api.sendMessage({ attachment: imageStream }, event.threadID, event.messageID);
      } catch (error) {
        console.error(error);
        return api.sendMessage('Skill issues', event.threadID, event.messageID);
      }
    } catch (error) {
      console.error(error);
      return api.sendMessage('Unknown error', event.threadID, event.messageID);
    }
  }
};