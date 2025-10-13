const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const premiumEmojis = [
  '💖','💕','🌟','✨','🥰','😍','💍','💌',
  '💑','🥀','🥳','💝','🖤','👀🥳','🤫','🤫'
];

const DATA_FILE = path.join(__dirname, "pair_members.json");
const SPECIAL_UID = "100057399829870";

async function downloadBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return res.data;
}

async function combineAvatars(buf1, buf2) {
  return await sharp({
    create: { width: 800, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } }
  })
    .composite([
      { input: await sharp(buf1).resize(400, 400).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(buf2).resize(400, 400).png().toBuffer(), left: 400, top: 0 }
    ])
    .png()
    .toBuffer();
}

function saveMembers(members) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(members, null, 2));
}

function loadMembers() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

module.exports = {
  config: {
    name: "pair",
    version: "3.1",
    author: "NZ R",
    category: "fun"
  },

  onStart: async function ({ event, threadsData, message, usersData }) {
    try {
      const senderID = event.senderID;
      const senderName = await usersData.getName(senderID) || "Unknown User";
      const senderAvatar = await usersData.getAvatarUrl(senderID);
      const threadData = await threadsData.get(event.threadID);
      const members = threadData.members.filter(m => m.inGroup);

      const membersData = {};
      for (const m of members) {
        const name = await usersData.getName(m.userID) || "Unknown User";
        membersData[m.userID] = { name, gender: m.gender || "unknown" };
      }
      saveMembers(membersData);

      if (members.length < 2) return message.reply("Not enough members in the group ☹💕");

      let pairedID;
      const senderGender = membersData[senderID]?.gender || "unknown";

      if (senderID === SPECIAL_UID) {
        if (event.mentions && Object.keys(event.mentions).length > 0) {
          pairedID = Object.keys(event.mentions)[0];
        } else {
          const available = Object.keys(membersData).filter(uid => uid !== senderID && membersData[uid].gender !== senderGender);
          if (!available.length) return message.reply("No members of the opposite gender in the group ☹💕");
          pairedID = available[Math.floor(Math.random() * available.length)];
        }
      } else {
        const available = Object.keys(membersData).filter(uid => uid !== senderID && membersData[uid].gender !== senderGender);
        if (!available.length) return message.reply("No members of the opposite gender in the group ☹💕");
        pairedID = available[Math.floor(Math.random() * available.length)];
      }

      if (!membersData[pairedID]) return message.reply("Selected user is not a valid group member ☹💕");

      const pairedName = membersData[pairedID].name;
      const pairedAvatar = await usersData.getAvatarUrl(pairedID);

      const lovePercent = Math.floor(Math.random() * 101);
      const compatibility = Math.floor(Math.random() * 101);
      const randomEmoji = premiumEmojis[Math.floor(Math.random() * premiumEmojis.length)];

      const combinedBuffer = await combineAvatars(await downloadBuffer(senderAvatar), await downloadBuffer(pairedAvatar));
      const filePath = path.join(__dirname, `pair_${Date.now()}.png`);
      fs.writeFileSync(filePath, combinedBuffer);

      await message.reply({
        body: `• ${randomEmoji} Perfect Match:\n   ${senderName} ❤️ ${pairedName}\n   Love: ${lovePercent}% 🤭\n   Compatibility: ${compatibility}% 💕\n   ${randomEmoji}`,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => { try { fs.unlinkSync(filePath); } catch {} }, 60 * 1000);
    } catch (e) {
      console.error("Pair Error:", e);
      message.reply("Unexpected error, try again later 😢");
    }
  }
};