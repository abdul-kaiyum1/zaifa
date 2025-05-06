const axios = require('axios');
const jimp = require("jimp");
const { createCanvas, loadImage, Image } = require('canvas');
const fs = require("fs");

module.exports = {
  config: {
    name: "makepair",
    aliases: ["makecouple"],
    version: "1.1",
    author: "Abdul Kaiyum",
    countDown: 60,
    role: 0,
    shortDescription: "Make a pair",
    longDescription: "Make a pair with someone",
    category: "fun",
    guide: {
      en: "{pn} @mention",
    }
  },

  onStart: async function ({ message, args, api, event }) {
    const mention = Object.keys(event.mentions);
    if (mention.length == 0) {
      return message.reply("Please mention a person to make a pair with.");
    }

    const userId = event.senderID;
    const mentionedId = mention[0];

    const userInfo = await getUserInfo(api, userId);
    const mentionedUserInfo = await getUserInfo(api, mentionedId);

    if (userInfo.gender === mentionedUserInfo.gender) {
      return message.reply("Why are you gay? 😂");
    }

    const loveMessage = await fetchLoveMessage();

    const imagePath = await createPairImage(userId, mentionedId, loveMessage);
    message.reply({ body: loveMessage, attachment: fs.createReadStream(imagePath) });
  }
};

async function getUserInfo(api, uid) {
  return new Promise((resolve, reject) => {
    api.getUserInfo(uid, (err, result) => {
      if (err) return reject(err);
      const user = result[uid];
      resolve({ name: user.name, gender: user.gender });
    });
  });
}

async function createPairImage(userId, mentionedId, loveMessage) {
  try {
    const background = await loadImage("https://i.ibb.co/mGGZHHt/Celestia.jpg");
    const canvasWidth = background.width;
    const canvasHeight = background.height;

    const userAvatarConfig = {
      size: 250,
      x: 108,
      y: canvasHeight / 2 - 377
    };

    const mentionedAvatarConfig = {
      size: 250,
      x: canvasWidth - 337,
      y: canvasHeight / 2 - 377
    };

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(background, 0, 0);

    // Get user and mentioned avatars
    const userAvatar = await loadAndRoundImage(`https://graph.facebook.com/${userId}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
    const mentionedAvatar = await loadAndRoundImage(`https://graph.facebook.com/${mentionedId}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);

    // Draw avatars
    ctx.drawImage(userAvatar, userAvatarConfig.x, userAvatarConfig.y, userAvatarConfig.size, userAvatarConfig.size);
    ctx.drawImage(mentionedAvatar, mentionedAvatarConfig.x, mentionedAvatarConfig.y, mentionedAvatarConfig.size, mentionedAvatarConfig.size);

    // Add love message
    ctx.font = '15px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText(loveMessage, canvasWidth / 2 - ctx.measureText(loveMessage).width / 2, canvasHeight - 50);

    // Save image to file
    const imagePath = "pair.png";
    const out = fs.createWriteStream(imagePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    await new Promise((resolve, reject) => {
      out.once('finish', resolve);
      out.once('error', reject);
    });

    return imagePath;
  } catch (error) {
    console.error(`Failed to generate image: ${error.message}`);
    throw error;
  }
}

async function loadAndRoundImage(url) {
  const avatar = await jimp.read(url);
  avatar.circle(); // Apply circular mask to avatar
  const roundedImageBuffer = await avatar.getBufferAsync(jimp.MIME_PNG);

  // Use the Image constructor to load from buffer for canvas
  const img = new Image();
  img.src = roundedImageBuffer;
  return img;
}

async function fetchLoveMessage() {
  try {
    const response = await axios.get("https://rizzapi.vercel.app/random");
    const { text: pickupLine } = response.data;
    return pickupLine;
  } catch (error) {
    console.error(`Failed to fetch love message: ${error.message}`);
    return "You are my everything!";
  }
}
