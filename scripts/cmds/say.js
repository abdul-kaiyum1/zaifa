const { createReadStream, unlinkSync, createWriteStream } = require("fs-extra");
const { resolve } = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "say",
    aliases: ["tts"],
    version: "1.5",
    author: "TawsiN",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Convert text to speech with language support",
    },
    longDescription: {
      en: "Converts provided text or replied message to speech in the specified language",
    },
    category: "fun",
    guide: {
      en: "/say [language] [text] or reply to a message with /say [language]: Convert text to speech. Default language is English.\nExample usages:\n/say bn hi baby\n/say ja (reply to a message)",
    },
  },

  onStart: async function ({ api, event, args }) {
    try {
      // Check if the user replied to a message
      const isReply = event.type === "message_reply";
      const content = isReply ? event.messageReply.body : args.join(" ");

      // List of supported languages (200 languages)
      const supportedLanguages = [
        "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "ca", "ceb", "zh", "zh-CN", "zh-TW", "co", "hr", "cs",
        "da", "nl", "en", "eo", "et", "fi", "fr", "fy", "gl", "ka", "de", "el", "gu", "ht", "ha", "haw", "he", "hi", "hmn", "hu",
        "is", "ig", "id", "ga", "it", "ja", "jv", "kn", "kk", "km", "rw", "ko", "ku", "ky", "lo", "la", "lv", "lt", "lb", "mk",
        "mg", "ms", "ml", "mt", "mi", "mr", "mn", "my", "ne", "no", "ny", "or", "ps", "fa", "pl", "pt", "pa", "ro", "ru", "sm",
        "gd", "sr", "st", "sn", "sd", "si", "sk", "sl", "so", "es", "su", "sw", "sv", "tg", "ta", "tt", "te", "th", "tr", "tk",
        "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi", "yo", "zu", "ace", "afh", "aka", "als", "arc", "arg", "av", "ay", "bat",
        "bh", "bik", "bjn", "bm", "bug", "ch", "chn", "cho", "chp", "cr", "csb", "dak", "din", "dsb", "dv", "efi", "fij", "fon",
        "gaa", "gil", "gor", "grc", "hsb", "iba", "ii", "ilo", "jbo", "kab", "kg", "koi", "kr", "kv", "lez", "lkt", "lua", "mad",
        "men", "mni", "mus", "nia", "nog", "pag", "ppl", "rar", "rif", "sga", "sh", "srn", "suk", "syr", "tem", "tpi", "tvl",
        "wa", "wbp", "zap", "zbl", "zza" // Many more can be added as required.
      ];

      const defaultLanguage = "en"; // Default language

      // Check if the first word is a language code and in the supported languages list
      const languageToSay = supportedLanguages.includes(args[0]) ? args[0] : defaultLanguage;
      const msg = isReply ? content : (languageToSay === defaultLanguage ? content : args.slice(1).join(" "));

      // Alert if no text is provided
      if (!msg) return api.sendMessage("Please provide text to convert to speech.", event.threadID);

      // Generate TTS URL
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(msg)}&tl=${languageToSay}&client=tw-ob`;
      
      // Path for saving the TTS audio file
      const path = resolve(__dirname, "cache", `${event.threadID}_${event.senderID}.mp3`);

      // Fetch the audio and write to a file
      const response = await axios({
        method: "GET",
        url,
        responseType: "stream",
      });
      const writer = response.data.pipe(createWriteStream(path));
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Send the TTS audio as an attachment
      api.sendMessage(
        { attachment: createReadStream(path) },
        event.threadID,
        () => unlinkSync(path) // Delete the audio file after sending
      );
    } catch (error) {
      console.error("Error occurred during TTS:", error);
      api.sendMessage("Sorry, there was an error processing your request.", event.threadID);
    }
  },
};
