const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "fbcover2",
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Generate a custom Facebook cover (style 2)",
    longDescription: "Create a stylish Facebook cover image with your name and custom ID.",
    category: "fun",
    guide: {
      en: "{p}{n} [mainName] [subName] [coverID]\n\n📌 *Example:* {p}fbcover2 JohnDoe JD 5\n\n🔹 *mainName* → Your primary name\n🔹 *subName* → A secondary name or nickname\n🔹 *coverID* → Select a cover design by entering an ID (e.g., 5)",
    },
  },

  onStart: async function ({ api, args, event }) {
    const defaultApiKey = "8uYBb7zm"; // Default API key

    if (args.length < 3) {
      return api.sendMessage(
        "❌ | Please provide all required parameters:\n\n⚡ Usage: {p}fbcover2 [mainName] [subName] [coverID]\n\nExample: {p}fbcover2 JohnDoe JD 5",
        event.threadID,
        event.messageID
      );
    }

    const [mainName, subName, coverID] = args;
    const apiUrl = `https://nguyenmanh.name.vn/api/fbcover2?name=${encodeURIComponent(mainName)}&id=${coverID}&subname=${encodeURIComponent(subName)}&apikey=${defaultApiKey}`;

    try {
      api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      const filePath = __dirname + `/cache/fbcover2.png`;
      fs.writeFileSync(filePath, Buffer.from(response.data, "utf-8"));

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
      api.sendMessage(
        {
          body: `📌 | Here is your **Facebook Cover 2**!\n\n👤 **Main Name:** ${mainName}\n📌 **Sub Name:** ${subName}\n🆔 **Cover ID:** ${coverID}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID,
        () => fs.unlinkSync(filePath),
        event.messageID
      );
    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", event.messageID, (err) => {}, true);
      api.sendMessage("❌ | Failed to generate Facebook Cover 2. Please try again later.", event.threadID, event.messageID);
    }
  },
};
