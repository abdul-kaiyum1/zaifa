const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "avatarwibu1",
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Generate an anime-style avatar",
    longDescription: "Create a custom anime avatar using a signature and a title.",
    category: "fun",
    guide: {
      en: "{p}{n} [avatarID] [title] [signature]\n\n📌 *Example:* {p}avatarwibu1 557 Kaiyum ICT\n\n🔹 *avatarID* → Choose an avatar style by entering an ID (e.g., 557)\n🔹 *title* → Your custom title\n🔹 *signature* → Your signature text",
    },
  },

  onStart: async function ({ api, args, event }) {
    const defaultApiKey = "8uYBb7zm"; // Default API key

    if (args.length < 3) {
      return api.sendMessage(
        "❌ | Please provide all required parameters:\n\n⚡ Usage: {p}avatarwibu1 [avatarID] [title] [signature]\n\nExample: {p}avatarwibu1 557 Kaiyum ICT",
        event.threadID,
        event.messageID
      );
    }

    const [avatarID, title, signature] = args;
    const apiUrl = `https://nguyenmanh.name.vn/api/avtWibu?id=${avatarID}&chunen=${encodeURIComponent(title)}&chuky=${encodeURIComponent(signature)}&apikey=${defaultApiKey}`;

    try {
      api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      const filePath = __dirname + `/cache/avatarwibu1.png`;
      fs.writeFileSync(filePath, Buffer.from(response.data, "utf-8"));

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
      api.sendMessage(
        {
          body: `📌 | Here is your **Anime Avatar WIBU 1**!\n\n🆔 **Avatar ID:** ${avatarID}\n🏷 **Title:** ${title}\n✍ **Signature:** ${signature}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID,
        () => fs.unlinkSync(filePath),
        event.messageID
      );
    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", event.messageID, (err) => {}, true);
      api.sendMessage("❌ | Failed to generate Avatar WIBU 1. Please try again later.", event.threadID, event.messageID);
    }
  },
};
