const axios = require('axios');
const TinyURL = require('tinyurl');

module.exports = {
  config: {
    name: "getlink",
    aliases: ["gl"],
    version: "1.0",
    author: "Abdul Kaiyum",
    shortDescription: "Provides download URLs for attachments",
    longDescription: "Provides download URLs for attachments such as images, videos, audios, and GIFs when replied to a message containing these attachments.",
    category: "utility",
    guide: "{pn} (reply to a message with an attachment)"
  },

  onStart: async function ({ message, event }) {
    if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
      return message.reply("Please reply to a message containing an attachment.");
    }

    const attachment = event.messageReply.attachments[0];

    if (!attachment.url) {
      return message.reply("No valid attachment URL found.");
    }

    try {
      const shortenedUrl = await TinyURL.shorten(attachment.url);
      message.reply(`Here is your download link: ${shortenedUrl}`);
    } catch (error) {
      console.error(`Error shortening URL: ${error.message}`);
      message.reply("An error occurred while generating the download link. Please try again later.");
    }
  }
};
