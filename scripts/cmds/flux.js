global.api = {
  samirApi: "https://www.samirxpikachu.run.place"
};

const axios = require('axios');

module.exports = {
  config: {
    name: "flex",
    aliases: ["imagine"],
    author: "Abdul Kaiyum",
    version: "1.1",
    countDown: 10,
    role: 0,
    shortDescription: "Generates an image based on a prompt and style",
    longDescription: "Generates an image based on a prompt and custom style. Default style is 4.",
    category: "ai",
    guide: {
      en: "{pn} prompt [--style] \n Example: {pn} cat --4 (default style is 4)"
    }
  },

  langs: {
    en: {
      loading: "Generating image, please wait...",
      error: "An error occurred, please try again later"
    }
  },

  onStart: async function ({ event, message, getLang, args }) {
    const { threadID } = event;

    // Split the prompt and style
    const userInput = args.join(" ");
    const promptParts = userInput.split("--");
    const prompt = promptParts[0].trim();
    const style = promptParts[1] ? promptParts[1].trim() : '4'; // Default style is 4

    if (!prompt) {
      return message.reply("- You must provide a prompt!");
    }

    try {
      let msgSend = message.reply(getLang("loading"));

      // Make API call to generate the image
      const response = await axios({
        method: 'get',
        url: `${global.api.samirApi}/ArcticFL?prompt=${encodeURIComponent(prompt)}--styles+${style}`,
        responseType: 'stream' // Get the image as a stream
      });

      // Unsend the loading message
      await message.unsend((await msgSend).messageID);

      // Send the image as an attachment
      message.reply({
        body: `Here's your AI generated image for prompt "${prompt}"`,
        attachment: response.data // The image stream from the API
      });

    } catch (err) {
      console.error('Error generating image:', err);
      return message.reply(getLang("error"));
    }
  }
};
