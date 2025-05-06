const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const TinyURL = require("tinyurl");

module.exports = {
  config: {
    name: "sing",
    aliases: ["song"],
    version: "2.2.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Play songs and manage your playlist."
    },
    longDescription: {
      en: "Search and play songs from YouTube with an interactive selection. Manage your personal playlist (add, play, or remove songs)."
    },
    category: "music",
    guide: {
      en: `Usage:
• {pn} <song name | YouTube URL>
• {pn} playlist -a <song name>    ➜ Add song to playlist
• {pn} playlist -p <index>        ➜ Play song from playlist
• {pn} playlist list              ➜ View your playlist
• {pn} playlist -r <index>        ➜ Remove song from playlist`
    }
  },

  async getPlaylists() {
    try {
      const data = await fs.readFile("playlists.json", "utf8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  },

  async savePlaylists(playlists) {
    await fs.writeFile("playlists.json", JSON.stringify(playlists, null, 2), "utf8");
  },

  onStart: async function ({ api, event, args, usersData }) {
    const userID = event.senderID;
    const userName = await usersData.getName(userID);
    const threadID = event.threadID;
    const attachments = event.messageReply?.attachments || [];

    // Audio/Video recognition
    if (attachments.length > 0) {
      const file = attachments[0];
      if (file.type === "video" || file.type === "audio") {
        api.sendMessage("🔍 Identifying the music...", threadID);
        try {
          const response = await axios.get(`https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(file.url)}`);
          const res = response.data;
          if (!res.title) return api.sendMessage("❌ Could not identify the audio.", threadID);
          return api.sendMessage(`🎧 Song recognized:\n\n🎵 Title: ${res.title}\n🧑‍🎤 Artist: ${res.artist}\n💿 Album: ${res.album}\n📅 Release: ${res.release_date}`, threadID);
        } catch (err) {
          return api.sendMessage("❌ Error identifying the song.", threadID);
        }
      }
    }

    try {
      if (args[0] === "playlist") {
        const action = args[1];
        const playlists = await this.getPlaylists();
        let userPlaylist = playlists[userID] || [];

        if (action === "-a" || action === "add") {
          const songName = args.slice(2).join(" ");
          if (!songName) return api.sendMessage("❌ Provide a song name to add.", threadID);
          userPlaylist.push(songName);
          playlists[userID] = userPlaylist;
          await this.savePlaylists(playlists);
          api.setMessageReaction("✅", event.messageID, () => {}, true);
          return api.sendMessage(`✅ Added "${songName}" to your playlist, ${userName}!`, threadID);
        }

        if (action === "-r" || action === "remove") {
          const index = parseInt(args[2]) - 1;
          if (isNaN(index) || index < 0 || index >= userPlaylist.length) {
            api.setMessageReaction("⚠️", event.messageID, () => {}, true);
            return api.sendMessage("⚠️ Invalid playlist index for removal.", threadID);
          }
          const removed = userPlaylist.splice(index, 1);
          playlists[userID] = userPlaylist;
          await this.savePlaylists(playlists);
          api.setMessageReaction("🗑️", event.messageID, () => {}, true);
          return api.sendMessage(`🗑️ Removed "${removed}" from your playlist.`, threadID);
        }

        if (action === "-p" || action === "play") {
          const index = parseInt(args[2]) - 1;
          if (isNaN(index) || index < 0 || index >= userPlaylist.length) {
            return api.sendMessage("⚠️ Invalid playlist index.", threadID);
          }
          const song = userPlaylist[index];
          api.setMessageReaction("⏳", event.messageID, () => {}, true);
          return await this.playSong(api, threadID, song, userName, event.messageID, userID);
        }

        if (action === "list") {
          if (userPlaylist.length === 0) return api.sendMessage(`📂 Your playlist is empty, ${userName}.`, threadID);
          const list = userPlaylist.map((s, i) => `${i + 1}. ${s}`).join("\n");
          const reply = await api.sendMessage(`🎶 ${userName}, your playlist:\n\n${list}\n\nReply with the number to play.`, threadID);
          global.GoatBot.onReply.set(reply.messageID, {
            commandName: this.config.name,
            userID,
            userPlaylist,
            userName,
            type: "playlist"
          });
          return;
        }

        return api.sendMessage("❌ Invalid playlist action. Use -a, -p, list or -r.", threadID);
      }

      const songQuery = args.join(" ");
      if (!songQuery) return api.sendMessage(`❌ Usage:\n${this.config.guide.en}`, threadID);
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
      return await this.playSong(api, threadID, songQuery, userName, event.messageID, userID);
    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("❌ An error occurred while processing your request.", threadID);
    }
  },

  async playSong(api, threadID, songQuery, userName, messageID, senderID) {
    const urlRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (urlRegex.test(songQuery)) {
      api.sendMessage(`⬇ Downloading from URL, ${userName}...`, threadID);
      return await downloadSong({ url: songQuery, api, threadID });
    }

    let results;
    try {
      results = await searchYT(songQuery);
    } catch {
      return api.sendMessage("❌ Could not fetch YouTube results.", threadID);
    }

    if (!results.length) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ No results found for "${songQuery}".`, threadID);
    }

    if (results.length === 1) {
      const video = results[0];
      return await downloadSong({ url: `https://youtube.com/watch?v=${video.id}`, api, threadID });
    }

    const selection = results.slice(0, 6);
    let msg = `🎵 ${userName}, choose a song by replying with its number:\n\n`;
    const thumbs = [];

    selection.forEach((video, i) => {
      msg += `${i + 1}. ${video.title}\n⏱ ${video.time} | 📺 ${video.channel.name}\n\n`;
      thumbs.push(global.utils.getStreamFromURL(video.thumbnail));
    });

    const replyMessage = await api.sendMessage({ body: msg, attachment: await Promise.all(thumbs) }, threadID);
    global.GoatBot.onReply.set(replyMessage.messageID, {
      commandName: this.config.name,
      senderID,
      results: selection,
      userName,
      type: "search",
      originalMID: replyMessage.messageID
    });
  },

  onReply: async function ({ api, event, Reply }) {
    if (Reply.type === "search") {
      const i = parseInt(event.body.trim());
      if (isNaN(i) || i < 1 || i > Reply.results.length) return api.sendMessage("❌ Invalid choice.", event.threadID);
      await api.unsendMessage(Reply.originalMID);
      const chosen = Reply.results[i - 1];
      return await downloadSong({ url: `https://youtube.com/watch?v=${chosen.id}`, api, threadID: event.threadID });
    }

    if (Reply.type === "playlist") {
      const i = parseInt(event.body.trim());
      if (isNaN(i) || i < 1 || i > Reply.userPlaylist.length) return api.sendMessage("⚠️ Invalid number.", event.threadID);
      return await this.playSong(api, event.threadID, Reply.userPlaylist[i - 1], Reply.userName, event.messageID, Reply.userID);
    }
  }
};

async function downloadSong({ url, api, threadID }) {
  try {
    const { data: config } = await axios.get("https://raw.githubusercontent.com/Tanvir0999/stuffs/refs/heads/main/raw/addresses.json");
    const cookie = fs.readFileSync("cookie.txt", "utf-8");
    const { data } = await axios.post(config.yt, { url, filesize: 20, format: "audio", cookies: cookie });

    const audio = await global.utils.getStreamFromURL(data.url);
    const body = `🎶 ${data.title}\n⏱ ${data.duration}\n📅 ${data.upload_date}\n🔗 [Stream Link](${await TinyURL.shorten(data.url)})`;
    return api.sendMessage({ body, attachment: audio }, threadID);
  } catch (err) {
    console.error("Download error:", err);
    return api.sendMessage("❌ Failed to download the song.", threadID);
  }
}

async function searchYT(query) {
  const { data } = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
  const match = data.match(/ytInitialData\s*=\s*(\{.*?\});/);
  if (!match) throw new Error("YouTube data not found");
  const json = JSON.parse(match[1]);
  const videos = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];

  return videos.filter(v => v.videoRenderer?.videoId).map(v => ({
    id: v.videoRenderer.videoId,
    title: v.videoRenderer.title.runs[0].text,
    thumbnail: v.videoRenderer.thumbnail.thumbnails.pop().url,
    time: v.videoRenderer.lengthText?.simpleText || "Unknown",
    channel: { name: v.videoRenderer.ownerText.runs[0].text }
  }));
}