const translate = require("@iamtraction/google-translate");

module.exports = {
  config: {
    name: "trans",
    version: "1.0",
    description: "Translate text to any language",
    category: "UTILITY",
    role: 0,
    author: "Sheikh"
  },
  onStart: async function ({ args, message, event }) {
    let text;
    if (event.messageReply && event.messageReply.body) {
      text = event.messageReply.body;
    } else {
      text = args.slice(0, -2).join(" ").trim();
    }

    const targetLanguage = args[args.length - 1];

    if (!text || !targetLanguage) {
      return message.reply("Please provide text to translate and the target language code. For example: /translate ami tomake valo bashi | en");
    }

    try {
      const translatedText = await translate(text, { to: targetLanguage });
      message.reply(`Translated text: ${translatedText.text}`);
    } catch (error) {
      console.error("Translation error:", error);
      message.reply("An error occurred while translating the text.");
    }
  }
};