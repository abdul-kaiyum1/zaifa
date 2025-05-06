const axios = require("axios");

module.exports = {
  config: {
    name: "4k",
    aliases: ["upscale"],
    version: "1.1",
    role: 0,
    author: "Abdul Kaiyum",
    countDown: 5,
    longDescription: "Upscale images to 4K resolution.",
    category: "IMAGE",
    guide: {
      en: "{pn} reply to an image to upscale it to 4K resolution."
    }
  },

  onStart: async function ({ message, event, api }) {
    if (!event.messageReply || !event.messageReply.attachments || !event.messageReply.attachments[0]) {
      return message.reply("Please reply to an image to upscale it.");
    }

    const imgurl = encodeURIComponent(event.messageReply.attachments[0].url);
    const upscaleUrl = `https://smfahim.onrender.com/4k?url=${imgurl}`;

    const processingMessage = await message.reply("🔄 | Processing... Please wait a moment.");

    try {
      const { data } = await axios.get(upscaleUrl);
      const attachment = await global.utils.getStreamFromURL(data.image, "upscaled-image.png");

      await message.reply({
        body: "✅ | Here is your 4K upscaled image:",
        attachment
      });

      if (processingMessage) {
        api.unsendMessage(processingMessage.messageID);
      }
    } catch (error) {
      console.error(error);
      message.reply("❌ | There was an error upscaling your image.");
    }
  }
};