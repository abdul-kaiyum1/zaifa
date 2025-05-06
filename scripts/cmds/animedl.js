const axios = require("axios");
const tinyurl = require("tinyurl");
const fs = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, 'manga_cache');
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // Cache expiry time (7 days)

module.exports = {
  config: {
    name: "animedl",
    aliases: ["ad"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search and download anime episodes",
    },
    longDescription: {
      en: "Search for an anime, select an anime from the search results, and get watch and download links for the selected anime episode",
    },
    category: "Information",
    guide: {
      en: "{pn} <anime name>\nExample: {pn} Naruto",
    },
  },
  langs: {
    en: {
      invalid_anime: "Please enter a valid anime name.",
      no_results: "No results found for the anime name.",
      select_anime: "Reply with the number of the anime you want to select.",
      select_episode: "Reply with the episode number to get watch/download links.",
      sending_anime_info: "Sending anime information...",
      error: "There was an error retrieving the anime information.",
    },
  },
  
  onStart: async function ({ api, message, event, args, getLang }) {
    const animeName = args.join(" ");
    if (!animeName) return message.reply(getLang("invalid_anime"));

    const cachePath = path.join(CACHE_DIR, `${encodeURIComponent(animeName)}.json`);

    try {
      let data;
      if (await fs.pathExists(cachePath)) {
        const cacheData = await fs.readJson(cachePath);
        if (Date.now() - cacheData.timestamp < CACHE_EXPIRY) {
          data = cacheData.data;
        } else {
          await fs.remove(cachePath);
        }
      }

      if (!data) {
        const response = await axios.get(`https://aiko-mangadex.vercel.app/anime/zoro/${encodeURIComponent(animeName)}`);
        data = response.data;
        await fs.outputJson(cachePath, { timestamp: Date.now(), data });
      }

      if (!data?.results?.length) return message.reply(getLang("no_results"));

      const topResults = data.results.slice(0, 6);
      let resultMessage = "Top search results:\n";
      topResults.forEach((anime, index) => {
        resultMessage += `${index + 1}. ${anime.title}\n`;
      });
      resultMessage += "\nReply with the number of the anime you want to select.";

      message.reply(resultMessage, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          step: 1,
          topResults: topResults,
        });
      });
    } catch (error) {
      console.error(error);
      return message.reply(getLang("error"));
    }
  },

  onReply: async function ({ api, message, event, Reply, getLang }) {
    const { author, messageID, step, topResults, selectedAnimeId } = Reply;
    if (event.senderID !== author) return message.reply("⚠ You didn't start this command.");

    const userReply = parseInt(event.body.trim()) - 1;

    if (step === 1) {
      if (userReply < 0 || userReply >= topResults.length) return message.reply("⚠ Invalid option.");

      const selectedAnime = topResults[userReply];
      const selectedAnimeId = selectedAnime.id;
      const cachePath = path.join(CACHE_DIR, `${encodeURIComponent(selectedAnimeId)}.json`);

      try {
        let animeInfoData;
        if (await fs.pathExists(cachePath)) {
          const cacheData = await fs.readJson(cachePath);
          if (Date.now() - cacheData.timestamp < CACHE_EXPIRY) {
            animeInfoData = cacheData.data;
          } else {
            await fs.remove(cachePath);
          }
        }

        if (!animeInfoData) {
          const animeInfoResponse = await axios.get(`https://aiko-mangadex.vercel.app/anime/zoro/info?id=${selectedAnimeId}`);
          animeInfoData = animeInfoResponse.data;
          await fs.outputJson(cachePath, { timestamp: Date.now(), data: animeInfoData });
        }

        if (!animeInfoData) return message.reply("No valid data found for the selected anime.");

        let animeDetails = `📺 *${animeInfoData.title}*\n`;
        if (animeInfoData.rating) animeDetails += `⭐ *Rating*: ${animeInfoData.rating}\n`;
        if (animeInfoData.released) animeDetails += `📅 *Released*: ${animeInfoData.released}\n`;
        if (animeInfoData.totalEpisodes) animeDetails += `🔢 *Total Episodes*: ${animeInfoData.totalEpisodes}\n`;
        if (animeInfoData.genres?.length) animeDetails += `📂 *Genres*: ${animeInfoData.genres.join(", ")}\n\n`;
        animeDetails += `Reply with the episode number to get the watch and download links.`;

        message.reply(animeDetails, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            step: 2,
            selectedAnimeId,
          });
        });
      } catch (error) {
        console.error(error);
        return message.reply(getLang("error"));
      }
    } else if (step === 2) {
      const episodeNumber = parseInt(event.body.trim());

      try {
        const response = await axios.get(`https://aiko-mangadex.vercel.app/anime/zoro/watch/${selectedAnimeId}/${episodeNumber}`);
        const episodeData = response.data;

        if (!episodeData?.sources?.length) return message.reply("No valid data found for the selected episode.");

        let watchLinks = `Watch and download links for *Episode ${episodeNumber}*:\n`;
        for (const source of episodeData.sources) {
          const shortUrl = await tinyurl.shorten(source.url);
          watchLinks += `🔗 *[${source.quality}]*: ${shortUrl}\n`;
        }
        if (episodeData.download) {
          const downloadShortUrl = await tinyurl.shorten(episodeData.download);
          watchLinks += `\n🔽 *Download Link*: ${downloadShortUrl}\n`;
        }

        message.reply(watchLinks);
      } catch (error) {
        console.error(error);
        return message.reply(getLang("error"));
      }
    }
  }
};

// Ensure cache directory exists
fs.ensureDirSync(CACHE_DIR);