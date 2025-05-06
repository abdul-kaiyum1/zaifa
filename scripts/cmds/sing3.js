const axios = require("axios");
const fs = require("fs-extra");
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "sing",
    version: "1.1.0",
    author: "NZ R | tanvir",
    countDown: 5,
    role: 0,
    shortDescription: "",
    longDescription: {
      en: ""
    },
    category: "media",
    guide: {
      en: ""
    }
  },

  langs: {
    en: {
      error: "❌ An error occurred: %1",
      networkError: "❌ Network error: %1",
      noResult: "⭕ No search results match the keyword %1",
      choose: "%1Reply with a number to choose, or type 'cancel' to cancel.",
      downloading: "⬇ Downloading \"%1\"",
      usage: "Usage:\n- {pn} <song name|song link>",
      recognizing: "🎵 Recognizing the song...",
      noRecognition: "❌ Couldn't recognize the song from the audio"
    }
  },

  onStart: async function ({ args, message, event, commandName, getLang }) {
    if (event.messageReply && event.messageReply.attachments?.length > 0) {
      const attachment = event.messageReply.attachments[0];
      const recognizingMessage = await message.reply(getLang("recognizing"));

      try {
        const musicRecognitionResponse = await axios.get(
          `https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(attachment.url)}`
        );

        if (!musicRecognitionResponse.data.title) {
          await message.unsend(recognizingMessage.messageID);
          return message.reply(getLang("noRecognition"));
        }

        const title = musicRecognitionResponse.data.title;
        const results = await searchYT(title);

        if (results.length === 0) {
          await message.unsend(recognizingMessage.messageID);
          return message.reply(getLang("noResult", title));
        }

        const someResults = results.slice(0, 6);
        let msg = "";
        let i = 1;
        const thumbnails = [];

        for (const video of someResults) {
          thumbnails.push(getStreamFromURL(video.thumbnail));
          msg += `${i++}. ${video.title}\n• Duration: ${video.time}\n• Channel: ${video.channel.name}\n\n`;
        }

        await message.unsend(recognizingMessage.messageID);

        message.reply(
          {
            body: getLang("choose", msg),
            attachment: await Promise.all(thumbnails)
          },
          (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              messageID: info.messageID,
              author: event.senderID,
              results: someResults
            });
          }
        );
        return;
      } catch (err) {
        await message.unsend(recognizingMessage.messageID);
        return message.reply(getLang("networkError", err.message));
      }
    }

    const urlRegex =
      /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w|-]{11})(?:\S+)?$/;
    const isUrl = urlRegex.test(args[0]);

    if (isUrl) {
      const url = args[0].match(urlRegex)[0];
      message.reply(getLang("downloading", url)).then(async (msgInfo) => {
        await downloadSong({ url, message, getLang });
        message.unsend(msgInfo.messageID);
      });
      return;
    }

    const query = args.join(" ");
    if (!query) return message.reply(getLang("usage", { pn: commandName }));

    try {
      const results = await searchYT(query);

      if (results.length === 0) {
        return message.reply(getLang("noResult", query));
      }

      const someResults = results.slice(0, 6);
      let msg = "";
      let i = 1;
      const thumbnails = [];

      for (const video of someResults) {
        thumbnails.push(getStreamFromURL(video.thumbnail));
        msg += `${i++}. ${video.title}\n• Duration: ${video.time}\n• Channel: ${video.channel.name}\n\n`;
      }

      message.reply(
        {
          body: getLang("choose", msg),
          attachment: await Promise.all(thumbnails)
        },
        (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID,
            results: someResults
          });
        }
      );
    } catch (err) {
      return message.reply(getLang("networkError", err.message));
    }
  },

  onReply: async ({ event, api, Reply, message, getLang }) => {
    const { results } = Reply;
    const choice = event.body.trim().toLowerCase();

    if (choice === "cancel") {
      api.unsendMessage(Reply.messageID);
      return message.reply("Operation cancelled.");
    }

    const choiceNumber = parseInt(choice);

    if (!isNaN(choiceNumber) && choiceNumber > 0 && choiceNumber <= results.length) {
      const selected = results[choiceNumber - 1];
      const url = `https://youtube.com/watch?v=${selected.id}`;
      api.unsendMessage(Reply.messageID);

      message.reply(getLang("downloading", selected.title)).then(async (msgInfo) => {
        await downloadSong({ url, message, getLang });
        message.unsend(msgInfo.messageID);
      });
    } else {
      api.unsendMessage(Reply.messageID);
      return message.reply("Invalid choice. Operation cancelled.");
    }
  }
};

async function downloadSong({ url, message, getLang }) {
  try {
    const d = (await axios.get("https://raw.githubusercontent.com/Tanvir0999/stuffs/refs/heads/main/raw/addresses.json")).data.yt;
    const { data } = await axios.post(d, {
      url,
      filesize: 20,
      format: "audio",
      cookies: fs.readFileSync("cookie.txt", "utf-8")
    });

    await message.reply({
      body: `• ${data.title}\n• Duration: ${data.duration}\n• Upload Date: ${data.upload_date}\n• Stream: ${data.url}`,
      attachment: await getStreamFromURL(data.url)
    });
  } catch (err) {
    return message.reply(getLang("error", err.response?.data || err.message));
  }
}

async function searchYT(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url);
  const match = data.match(/ytInitialData\s*=\s*(\{.*?\});/);

  if (!match) throw new Error("Failed to parse YouTube results");

  const json = JSON.parse(match[1]);
  const videos = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;

  return videos
    .filter((item) => item.videoRenderer?.videoId)
    .map((video) => ({
      id: video.videoRenderer.videoId,
      title: video.videoRenderer.title.runs[0].text,
      thumbnail: video.videoRenderer.thumbnail.thumbnails.pop().url,
      time: video.videoRenderer.lengthText?.simpleText || "Unknown",
      channel: {
        name: video.videoRenderer.ownerText.runs[0].text
      }
    }));
}
