const axios = require("axios");
const fs = require("fs-extra");
const tinyurl = require("tinyurl");

async function shortenURL(url) {
  try {
    return await tinyurl.shorten(url);
  } catch (error) {
    console.error(error);
    return url; // If shortening fails, return original URL
  }
}

// Fetch the latest API base URL dynamically
const baseApiUrl = async () => {
  const base = await axios.get(
    `https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`
  );
  return base.data.api;
};

module.exports = {
  config: {
    name: "alldl",
    version: "5.2",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Download videos from various platforms using one API",
    longDescription: "Supports TikTok, Facebook, Instagram, YouTube, and more.",
    category: "media",
    guide: {
      en: "{p}{n} [reply to a message containing a link] or {p}{n} [video link]",
    },
  },

  onStart: async function ({ api, args, event }) {
    const userInput = event.messageReply?.body || args[0];

    if (!userInput) {
      return api.sendMessage("❌ | Please provide a valid video link.", event.threadID, event.messageID);
    }

    try {
      api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

      // Fetch API URL dynamically
      const apiUrl = `${await baseApiUrl()}/alldl?url=${encodeURIComponent(userInput)}`;
      const { data } = await axios.get(apiUrl);
      
      if (!data.result) {
        return api.sendMessage("❌ | Unable to retrieve video data.", event.threadID, event.messageID);
      }

      const filePath = __dirname + `/cache/video.mp4`;
      if (!fs.existsSync(__dirname + "/cache")) fs.mkdirSync(__dirname + "/cache");

      // Download the video
      const videoData = (await axios.get(data.result, { responseType: "arraybuffer" })).data;
      fs.writeFileSync(filePath, Buffer.from(videoData, "utf-8"));

      // Shorten URL
      const shortUrl = await shortenURL(data.result);

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
      api.sendMessage(
        {
          body: `🎬 **Video Title:** ${data.Title || "Unknown"}\n🔗 **Download URL:** ${shortUrl}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID,
        () => fs.unlinkSync(filePath),
        event.messageID
      );

    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", event.messageID, (err) => {}, true);
      api.sendMessage("❌ | Failed to download the video. Please try again later.", event.threadID, event.messageID);
    }
  },
};
