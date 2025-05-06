const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { exec } = require("child_process");

module.exports = {
  config: {
    name: "video2audio",
    aliases: ["v2a"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Convert video to audio"
    },
    longDescription: {
      en: "Converts a sent video into an MP3 audio file"
    },
    category: "media",
    guide: {
      en: "{pn} (reply to a video)"
    }
  },

  onStart: async function ({ event, message, api }) {
    const { messageReply, threadID, messageID } = event;

    // Check for video reply
    if (!messageReply || !messageReply.attachments[0] || messageReply.attachments[0].type !== "video") {
      return message.reply("❌ Please reply to a video to convert it to audio.");
    }

    const url = messageReply.attachments[0].url;
    const videoPath = path.join(__dirname, "cache", `${Date.now()}.mp4`);
    const audioPath = videoPath.replace(".mp4", ".mp3");

    try {
      const response = await axios.get(url, { responseType: "stream" });
      const writer = fs.createWriteStream(videoPath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        exec(`ffmpeg -i "${videoPath}" -vn -ar 44100 -ac 2 -b:a 192k "${audioPath}"`, async (err) => {
          if (err) {
            console.error("FFmpeg Error:", err);
            return message.reply("❌ Error converting video.");
          }

          await message.reply({
            body: "✅ Here's the audio from the video:",
            attachment: fs.createReadStream(audioPath)
          });

          // Clean up
          fs.unlinkSync(videoPath);
          fs.unlinkSync(audioPath);
        });
      });

      writer.on("error", () => message.reply("❌ Failed to download video."));

    } catch (error) {
      console.error(error);
      return message.reply("❌ Error downloading the video.");
    }
  }
};