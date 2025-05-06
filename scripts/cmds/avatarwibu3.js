const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "avatarwibu3",
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Generate an anime-style avatar",
    longDescription: "Create a custom anime avatar using your main name and a nickname.",
    category: "fun",
    guide: {
      en: "{p}{n} [avatarID] [mainName] [nickname]\n\n📌 *Example:* {p}avatarwibu3 20 Kaiyum Abdul",
    },
  },

  onStart: async function ({ api, args, event }) {
    const defaultApiKey = "8uYBb7zm";

    if (args.length < 3) {
      return api.sendMessage("❌ | Usage: {p}avatarwibu3 [avatarID] [mainName] [nickname]", event.threadID, event.messageID);
    }

    const [avatarID, mainName, nickname] = args;
    const apiUrl = `https://nguyenmanh.name.vn/api/avtWibu3?id=${avatarID}&tenchinh=${encodeURIComponent(mainName)}&tenphu=${encodeURIComponent(nickname)}&apikey=${defaultApiKey}`;

    try {
      api.setMessageReaction("⏳", event.messageID, (err) => {}, true);
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      const filePath = __dirname + `/cache/avatarwibu3.png`;
      fs.writeFileSync(filePath, Buffer.from(response.data, "utf-8"));

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
      api.sendMessage({
          body: `📌 | **Anime Avatar WIBU 3**\n🆔 **Avatar ID:** ${avatarID}\n👤 **Name:** ${mainName}\n🔹 **Nickname:** ${nickname}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID, () => fs.unlinkSync(filePath), event.messageID);
    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", event.messageID, (err) => {}, true);
      api.sendMessage("❌ | Failed to generate Avatar WIBU 3.", event.threadID, event.messageID);
    }
  },
};
