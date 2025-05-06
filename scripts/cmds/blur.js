const axios = require('axios');
const TinyURL = require('tinyurl');

global.api = {
  samirApi: "https://www.samirxpikachu.run.place"
};

module.exports = {
  config: {
    name: "blur",
    aliases: ["bgblur"],
    author: "Abdul Kaiyum",
    version: "1.2",
    countDown: 10,
    role: 0,
    shortDescription: "Blur a replied image with a custom or default strength",
    longDescription: "Blur a replied image and provide a TinyURL download link. Users can set a custom strength (default is 50).",
    category: "image",
    guide: {
      en: "{pn} [--strength] (Reply to an image) \n Example: {pn} --75 (default strength is 50)"
    }
  },

  langs: {
    en: {
      loading: "Applying blur, please wait...",
      error: "An error occurred, please try again later",
      noImage: "You must reply to a message containing an image!",
      invalidUrl: "The image URL is invalid!"
    }
  },

  onStart: async function ({ event, message, getLang, args }) {
    const { threadID, messageReply } = event;

    // Ensure the user is replying to an image
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return message.reply(getLang("noImage"));
    }

    // Get the image URL from the reply
    const attachment = messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return message.reply(getLang("noImage"));
    }

    const imageUrl = attachment.url;

    // Get optional strength from the user's input or default to 50
    const userInput = args.join(" ");
    const strength = userInput ? userInput.split("--")[1]?.trim() || '50' : '50'; // Default strength is 50

    try {
      let msgSend = message.reply(getLang("loading"));

      // Make API call to apply blur with the provided image URL and strength
      const response = await axios({
        method: 'get',
        url: `${global.api.samirApi}/bgblur?url=${encodeURIComponent(imageUrl)}&strength=${strength}`,
        responseType: 'stream' // Get the blurred image as a stream
      });

      // Convert the API image URL to a TinyURL link
      const downloadLink = `${global.api.samirApi}/bgblur?url=${encodeURIComponent(imageUrl)}&strength=${strength}`;
      const tinyUrlLink = await TinyURL.shorten(downloadLink);

      // Unsend the loading message
      await message.unsend((await msgSend).messageID);

      // Send the blurred image and the TinyURL link
      message.reply({
        body: `Here is your blurred image (strength: ${strength}):\nDownload it via TinyURL: ${tinyUrlLink}`,
        attachment: response.data // The blurred image stream from the API
      });

    } catch (err) {
      console.error('Error blurring image:', err);
      return message.reply(getLang("error"));
    }
  }
};
