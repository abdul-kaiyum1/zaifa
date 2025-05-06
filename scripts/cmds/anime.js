const axios = require("axios");
const tinyurl = require("tinyurl");
const fs = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, 'anime_cache');
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // Cache expiry time (7 days)

module.exports = {
  config: {
    name: "animedl",
    aliases: ["ad"],
    version: "2.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search and download anime episodes using the new API",
    },
    longDescription: {
      en: "Search for anime, select an anime, and fetch episodes or server links with improved accuracy.",
    },
    category: "Information",
    guide: {
      en: "{pn} <anime name>\nExample: {pn} Attack on Titan",
    },
  },
  langs: {
    en: {
      invalid_anime: "Please enter a valid anime name.",
      no_results: "No results found for the anime name.",
      select_anime: "Reply with the number of the anime you want to select.",
      select_episode: "Reply with the episode number to get watch and download links.",
      sending_anime_info: "Fetching anime information...",
      error: "An error occurred while retrieving anime information.",
    },
  },
  onStart: async function ({ api, message, event, args, getLang }) {
    const animeName = args.join(" ");
    if (!animeName) return message.reply(getLang("invalid_anime"));

    const cachePath = path.join(CACHE_DIR, `${encodeURIComponent(animeName)}.json`);

    try {
      // Check cache
      let data;
      if (await fs.pathExists(cachePath)) {
        const cacheData = await fs.readJson(cachePath);
        const now = Date.now();
        if (now - cacheData.timestamp < CACHE_EXPIRY) {
          data = cacheData.data;
        } else {
          await fs.remove(cachePath);
        }
      }

      // Fetch anime data from API if not cached
      if (!data) {
        const response = await axios.get(`https://animedl.vercel.app/api/v2/hianime/search?q=${encodeURIComponent(animeName)}`);
        data = response.data;
        await fs.outputJson(cachePath, { timestamp: Date.now(), data });
      }

      if (!data || !data.data || data.data.length === 0) {
        return message.reply(getLang("no_results"));
      }

      const results = data.data.slice(0, 6);
      let resultMessage = "Top search results:\n";
      results.forEach((anime, index) => {
        resultMessage += `${index + 1}. ${anime.title}\n`;
      });
      resultMessage += "\nReply with the number of the anime to select it.";

      message.reply(resultMessage, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          step: 1,
          results,
        });
      });
    } catch (error) {
      console.error(error);
      message.reply(getLang("error"));
    }
  },

  onReply: async function ({ api, message, event, Reply, getLang }) {
    const { author, step, results } = Reply;
    if (event.senderID !== author) {
      return message.reply("⚠ This command is reserved for the person who initiated it.");
    }

    const userReply = parseInt(event.body.trim()) - 1;

    if (step === 1) {
      if (userReply < 0 || userReply >= results.length) {
        return message.reply("⚠ Invalid option. Reply with a valid number.");
      }

      const selectedAnime = results[userReply];
      const animeId = selectedAnime.id;
      const cachePath = path.join(CACHE_DIR, `${encodeURIComponent(animeId)}.json`);

      try {
        // Fetch anime episodes
        let episodeData;
        if (await fs.pathExists(cachePath)) {
          const cacheData = await fs.readJson(cachePath);
          if (Date.now() - cacheData.timestamp < CACHE_EXPIRY) {
            episodeData = cacheData.data;
          } else {
            await fs.remove(cachePath);
          }
        }

        if (!episodeData) {
          const response = await axios.get(`https://animedl.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
          episodeData = response.data;
          await fs.outputJson(cachePath, { timestamp: Date.now(), data: episodeData });
        }

        if (!episodeData || !episodeData.data || episodeData.data.length === 0) {
          return message.reply("No episodes found for this anime.");
        }

        let episodeMessage = `📺 *${selectedAnime.title}*\nAvailable episodes:\n`;
        episodeData.data.slice(0, 10).forEach((ep, index) => {
          episodeMessage += `${index + 1}. Episode ${ep.episodeNo}\n`;
        });
        episodeMessage += "\nReply with the episode number to get server links.";

        message.reply(episodeMessage, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            step: 2,
            animeId,
          });
        });
      } catch (error) {
        console.error(error);
        message.reply(getLang("error"));
      }
    } else if (step === 2) {
      const episodeNumber = userReply + 1;
      const { animeId } = Reply;

      try {
        const response = await axios.get(
          `https://animedl.vercel.app/api/v2/hianime/episode/servers?animeEpisodeId=${animeId}?ep=${episodeNumber}`
        );
        const serverData = response.data;

        if (!serverData || !serverData.data) {
          return message.reply("No server links found for this episode.");
        }

        const { sub, dub, raw } = serverData.data;
        let serverMessage = `🎥 *Episode ${episodeNumber} Servers*\n\n`;

        if (sub && sub.length > 0) {
          serverMessage += "📜 *Sub*: \n";
          for (const server of sub) {
            const shortUrl = await tinyurl.shorten(`https://animedl.vercel.app/watch/${server.serverId}`);
            serverMessage += `- ${server.serverName}: ${shortUrl}\n`;
          }
        }

        if (dub && dub.length > 0) {
          serverMessage += "\n🗣 *Dub*: \n";
          for (const server of dub) {
            const shortUrl = await tinyurl.shorten(`https://animedl.vercel.app/watch/${server.serverId}`);
            serverMessage += `- ${server.serverName}: ${shortUrl}\n`;
          }
        }

        if (raw && raw.length > 0) {
          serverMessage += "\n📂 *Raw*: \n";
          for (const server of raw) {
            const shortUrl = await tinyurl.shorten(`https://animedl.vercel.app/watch/${server.serverId}`);
            serverMessage += `- ${server.serverName}: ${shortUrl}\n`;
          }
        }

        message.reply(serverMessage);
      } catch (error) {
        console.error(error);
        message.reply(getLang("error"));
      }
    }
  },
};

// Ensure cache directory exists
fs.ensureDirSync(CACHE_DIR);