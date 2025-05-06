module.exports = {
  config: {
    name: "avatarwibu2",
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Generate an anime-style avatar",
    longDescription: "Create a custom anime avatar using your main name, Facebook name, and a nickname.",
    category: "fun",
    guide: {
      en: "{p}{n} [avatarID] [mainName] [facebookName] [nickname]\n\n📌 *Example:* {p}avatarwibu2 535 Kaiyum Kai Abdul",
    },
  },

  onStart: async function ({ api, args, event }) {
    const defaultApiKey = "8uYBb7zm"; 

    if (args.length < 4) {
      return api.sendMessage("❌ | Usage: {p}avatarwibu2 [avatarID] [mainName] [facebookName] [nickname]", event.threadID, event.messageID);
    }

    const [avatarID, mainName, facebookName, nickname] = args;
    const apiUrl = `https://nguyenmanh.name.vn/api/avtWibu2?id=${avatarID}&tenchinh=${encodeURIComponent(mainName)}&fb=${encodeURIComponent(facebookName)}&tenphu=${encodeURIComponent(nickname)}&apikey=${defaultApiKey}`;

    try {
      api.setMessageReaction("⏳", event.messageID, (err) => {}, true);
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      const filePath = __dirname + `/cache/avatarwibu2.png`;
      fs.writeFileSync(filePath, Buffer.from(response.data, "utf-8"));

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
      api.sendMessage({
          body: `📌 | **Anime Avatar WIBU 2**\n🆔 **Avatar ID:** ${avatarID}\n👤 **Name:** ${mainName}\n📌 **Facebook Name:** ${facebookName}\n🔹 **Nickname:** ${nickname}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID, () => fs.unlinkSync(filePath), event.messageID);
    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", event.messageID, (err) => {}, true);
      api.sendMessage("❌ | Failed to generate Avatar WIBU 2.", event.threadID, event.messageID);
    }
  },
};
