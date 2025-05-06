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
      en: "Play songs, get lyrics, and manage your playlist."
    },
    longDescription: {
      en: "Search and play songs from YouTube with an interactive selection, fetch lyrics, and manage your personal playlist (add, play, or remove songs)."
    },
    category: "music",
    guide: {
      en: `Usage:
• {pn} <song name | YouTube URL>
• {pn} lyrics <song name>
• {pn} playlist -a <song name>    ➜ Add song to playlist
• {pn} playlist -p <index>        ➜ Play song from playlist
• {pn} playlist list            ➜ View your playlist
• {pn} playlist -r <index>        ➜ Remove song from playlist`
    }
  },

  async getPlaylists() {
    try {
      const playlistsData = await fs.readFile("playlists.json", "utf8");
      return JSON.parse(playlistsData);
    } catch (error) {
      return {};
    }
  },

  async savePlaylists(playlists) {
    await fs.writeFile("playlists.json", JSON.stringify(playlists, null, 2), "utf8");
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const userID = event.senderID;
    const userName = await usersData.getName(userID);
    const threadID = event.threadID;

    try {
      if (args[0] === "playlist") {
        const action = args[1];
        const playlists = await this.getPlaylists();
        let userPlaylist = playlists[userID] || [];

        if (action === "-a" || action === "add") {
          const songName = args.slice(2).join(" ");
          if (!songName) return api.sendMessage("❌ Please provide the song name to add.", threadID);
          userPlaylist.push(songName);
          playlists[userID] = userPlaylist;
          await this.savePlaylists(playlists);
          api.setMessageReaction("✅", event.messageID, () => {}, true);
          return api.sendMessage(`🎵 Added \"${songName}\" to your playlist, ${userName}!`, threadID);
        } else if (action === "-r" || action === "remove") {
          const index = parseInt(args[2]) - 1;
          if (isNaN(index) || index < 0 || index >= userPlaylist.length) {
            api.setMessageReaction("⚠️", event.messageID, () => {}, true);
            return api.sendMessage("⚠️ Invalid playlist index for removal.", threadID);
          }
          const removedSong = userPlaylist.splice(index, 1);
          playlists[userID] = userPlaylist;
          await this.savePlaylists(playlists);
          api.setMessageReaction("🗑️", event.messageID, () => {}, true);
          return api.sendMessage(`🗑️ Removed \"${removedSong}\" from your playlist, ${userName}.\`, threadID);
        } else if (action === "-p" || action === "play") {
          const index = parseInt(args[2]) - 1;
          if (isNaN(index) || index < 0 || index >= userPlaylist.length) {
            api.setMessageReaction("⚠️", event.messageID, () => {}, true);
            return api.sendMessage("⚠️ Invalid playlist index.", threadID);
          }
          const songName = userPlaylist[index];
          api.setMessageReaction("⏳", event.messageID, () => {}, true);
          return await this.playSong(api, threadID, songName, userName, event.messageID, userID);
        } else if (action === "list") {
          if (userPlaylist.length === 0) {
            return api.sendMessage(`🎵 Your playlist is empty, ${userName}.\`, threadID);
          }
          let reply = `🎵 ${userName}, here is your playlist:\n\n` +
                      userPlaylist.map((song, i) => `${i + 1}. ${song}`).join("\n");
          reply += "\n\nReply with the number to play that song.";
          const replyMessage = await api.sendMessage(reply, threadID);
          api.setMessageReaction("📜", event.messageID, () => {}, true);
          global.GoatBot.onReply.set(replyMessage.messageID, {
            commandName: this.config.name,
            userID,
            userPlaylist,
            userName,
            messageID: replyMessage.messageID
          });
          return;
        } else {
          api.setMessageReaction("❌", event.messageID, () => {}, true);
          return api.sendMessage("❌ Invalid playlist action. Use -a (add), -p (play), list, or -r (remove).", threadID);
        }
      } else if (args[0] === "lyrics") {
        const songName = args.slice(1).join(" ");
        if (!songName) return api.sendMessage("❌ Please provide a song name for lyrics.", threadID);
        api.setMessageReaction("⏳", event.messageID, () => {}, true);
        return await this.fetchLyrics(api, threadID, songName, userName, event.messageID);
      } else {
        const songQuery = args.join(" ");
        if (!songQuery) return api.sendMessage(`❌ Usage: ${this.config.guide.en}", threadID);
        api.setMessageReaction("⏳", event.messageID, () => {}, true);
        return await this.playSong(api, threadID, songQuery, userName, event.messageID, userID);
      }
    } catch (error) {
      console.error("Error processing command:", error);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("❌ An error occurred while processing your request.", threadID);
    }
  },

  async playSong(api, threadID, songQuery, userName, messageID, senderID) {
    const urlRegex = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})(?:\S+)?$/;
    if (urlRegex.test(songQuery)) {
      const url = songQuery.match(urlRegex)[0];
      api.sendMessage(`⬇ Downloading your song from URL, ${userName}...`, threadID);
      return await downloadSong({ url, api, threadID });
    }

    let results;
    try {
      results = await searchYT(songQuery);
    } catch (err) {
      console.error("Error during YouTube search:", err);
      return api.sendMessage("❌ Failed to fetch search results.", threadID);
    }
    if (!results.length) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ No videos found for \"${songQuery}\".", threadID);
    }

    if (results.length === 1) {
      const selected = results[0];
      const url = `https://youtube.com/watch?v=${selected.id}`;
      api.sendMessage(`⬇ Downloading \"${selected.title}\" for you, ${userName}...`, threadID);
      return await downloadSong({ url, api, threadID });
    }

    const someResults = results.slice(0, 6);
    let msg = `🎵 Hi ${userName}, please choose a song by replying with its number:\n\n`;
    let i = 1;
    const thumbnails = [];
    for (const video of someResults) {
      msg += `${i++}. ${video.title}\n   ⏱ Duration: ${video.time}\n   📺 Channel: ${video.channel.name}\n\n`;
      thumbnails.push(global.utils.getStreamFromURL(video.thumbnail));
    }

    return api.sendMessage({
      body: msg,
      attachment: await Promise.all(thumbnails)
    }, threadID, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        senderID,
        results: someResults,
        userName,
        messageID: info.messageID
      });
    });
  },

  async fetchLyrics(api, threadID, songName, userName, messageID) {
    try {
      const apiUrl = `https://lyrist-woad.vercel.app/api/${encodeURIComponent(songName)}`;
      const response = await axios.get(apiUrl);
      if (response.data.lyrics) {
        api.setMessageReaction("📒", messageID, () => {}, true);
        return api.sendMessage(`🎤 Lyrics for \"${response.data.title}\" by ${response.data.artist}:\n\n${response.data.lyrics}`, threadID);
      } else {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ No lyrics found for that song.", threadID);
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ An error occurred while fetching the lyrics.", threadID);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    if (Reply.results) {
      const choice = parseInt(event.body.trim());
      if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
        return api.sendMessage("❌ Invalid choice. Operation cancelled.", event.threadID);
      }
      const selected = Reply.results[choice - 1];
      const url = `https://youtube.com/watch?v=${selected.id}`;
      api.unsendMessage(Reply.messageID);
      api.sendMessage(`⬇ Downloading \"${selected.title}\" for you, ${Reply.userName}...`, event.threadID);
      return await downloadSong({ url, api, threadID: event.threadID });
    }

    if (Reply.userPlaylist) {
      const replyIndex = parseInt(event.body.trim());
      if (isNaN(replyIndex) || replyIndex < 1 || replyIndex > Reply.userPlaylist.length) {
        return api.sendMessage("⚠️ Invalid playlist number. Please enter a valid number.", event.threadID);
      }
      const songName = Reply.userPlaylist[replyIndex - 1];
      return await this.playSong(api, event.threadID, songName, Reply.userName, event.messageID, Reply.userID);
    }

    if (event.attachments?.[0]?.type === "audio" || event.attachments?.[0]?.type === "video") {
      const attachment = event.attachments[0];
      const recognitionURL = `https://audio-recon-ahcw.onrender.com/kshitiz?url=${encodeURIComponent(attachment.url)}`;
      api.sendMessage("🔍 Recognizing the song from the audio/video file...", event.threadID);
      try {
        const response = await axios.get(recognitionURL);
        const { title, artist, album, release_date } = response.data;
        const info = `🎶 Song Info Detected\n🎤 Title: ${title}\n👤 Artist: ${artist}\n${album ? `💿 Album: ${album}\n` : ""}${release_date ? `📅 Release Date: ${release_date}` : ""}`;
        return api.sendMessage(info, event.threadID);
      } catch (err) {
        console.error("Recognition error:", err.message);
        return api.sendMessage("❌ Could not recognize the song. Try with a different file.", event.threadID);
      }
    }
  }
};

async function downloadSong({ url, api, threadID }) {
  try {
    const addresses = await axios.get("https://raw.githubusercontent.com/Tanvir0999/stuffs/refs/heads/main/raw/addresses.json");
    const d = addresses.data.yt;
    const cookie = fs.readFileSync("cookie.txt", "utf-8");
    const { data } = await axios.post(d, {
      url,
      filesize: 20,
      format: "audio",
      cookies: cookie
    });
    const body = `🎶 ${data.title}\n⏱ Duration: ${data.duration}\n📅 Upload Date: ${data.upload_date}\n🔗 [Stream Link](${await TinyURL.shorten(data.url)})`;
    const audioStream = await global.utils.getStreamFromURL(data.url);
    return api.sendMessage({ body, attachment: audioStream }, threadID);
  } catch (err) {
    console.error("Error downloading song:", err);
    return api.sendMessage(`❌ Error: ${err.response?.data || err.message}", threadID);
  }
}

async function searchYT(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url);
  const match = data.match(/ytInitialData\s*=\s*(\{.*?\});/);
  if (!match) throw new Error("Failed to parse YouTube results");
  const json = JSON.parse(match[1]);

  const videos =
    json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];
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
