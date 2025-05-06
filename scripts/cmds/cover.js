const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "cover",
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Generate a custom Facebook cover (style 1)",
    longDescription: "Create a stylish Facebook cover image with your details such as name, address, email, phone number, and user ID.",
    category: "fun",
    guide: {
      en: "{p}{n} [name] [subname] [userID] [address] [email] [phone]\n\n📌 *Example:* {p}fbcover1 JohnDoe JD 1000123456789 NewYork johndoe@gmail.com 1234567890\n\n🔹 *name* → Your main name\n🔹 *subname* → A secondary name or nickname\n🔹 *userID* → Your Facebook User ID\n🔹 *address* → Your location\n🔹 *email* → Your email address\n🔹 *phone* → Your phone number",
    },
  },

  onStart: async function ({ api, args, event }) {
    const defaultApiKey = "8uYBb7zm"; // Default API key

    if (args.length < 6) {
      return api.sendMessage(
        "❌ | Please provide all required parameters:\n\n⚡ Usage: {p}fbcover1 [name] [subname] [userID] [address] [email] [phone]\n\nExample: {p}fbcover1 JohnDoe JD 1000123456789 NewYork johndoe@gmail.com 1234567890",
        event.threadID,
        event.messageID
      );
    }

    const [name, subname, userID, address, email, phone] = args;
    const apiUrl = `https://nguyenmanh.name.vn/api/fbcover1?name=${encodeURIComponent(name)}&uid=${userID}&address=${encodeURIComponent(address)}&email=${encodeURIComponent(email)}&subname=${encodeURIComponent(subname)}&sdt=${phone}&apikey=${defaultApiKey}`;

    try {
      api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
      const filePath = __dirname + `/cache/fbcover1.png`;
      fs.writeFileSync(filePath, Buffer.from(response.data, "utf-8"));

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
      api.sendMessage(
        {
          body: `📌 | Here is your **Facebook Cover 1**!\n\n👤 **Name:** ${name}\n📌 **Sub Name:** ${subname}\n🆔 **User ID:** ${userID}\n📍 **Address:** ${address}\n📧 **Email:** ${email}\n📞 **Phone:** ${phone}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID,
        () => fs.unlinkSync(filePath),
        event.messageID
      );
    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", event.messageID, (err) => {}, true);
      api.sendMessage("❌ | Failed to generate Facebook Cover 1. Please try again later.", event.threadID, event.messageID);
    }
  },
};