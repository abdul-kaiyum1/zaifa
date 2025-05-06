module.exports = {
  config: {
    name: "avatarwibu5",
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Generate an anime-style avatar",
    longDescription: "Create a custom anime avatar using your main name and a nickname.",
    category: "fun",
    guide: {
      en: "{p}{n} [avatarID] [mainName] [nickname]\n\n📌 *Example:* {p}avatarwibu5 3 Kaiyum Abdul",
    },
  },

  onStart: async function ({ api, args, event }) {
    const defaultApiKey = "8uYBb7zm";

    if (args.length < 3) {
      return api.sendMessage("❌ | Usage: {p}avatarwibu5 [avatarID] [mainName] [nickname]", event.threadID, event.messageID);
    }

    const [avatarID, mainName, nickname] = args;
    const apiUrl = `https://nguyenmanh.name.vn/api/avtWibu5?id=${avatarID}&tenchinh=${encodeURIComponent(mainName)}&tenphu=${encodeURIComponent(nickname)}&apikey=${defaultApiKey}`;

    try {
      api.setMessageReaction("⏳", event.messageID, (err) => {}, true);
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      const filePath = __dirname + `/cache/avatarwibu5.png`;
      fs.writeFileSync(filePath, Buffer.from(response.data, "utf-8"));

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
      api.sendMessage({
          body: `📌 | **Anime Avatar WIBU 5**\n🆔 **Avatar ID:** ${avatarID}\n👤 **Name:** ${mainName}\n🔹 **Nickname:** ${nickname}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID, () => fs.unlinkSync(filePath), event.messageID);
    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", event.messageID, (err) => {}, true);
      api.sendMessage("❌ | Failed to generate Avatar WIBU 5.", event.threadID, event.messageID);
    }
  },
};
