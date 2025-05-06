const axios = require("axios");
const tinyurl = require("tinyurl");

module.exports = {
  config: {
    name: "moviedl",
    aliases: ["md"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search and download movies or web series episodes",
    },
    longDescription: {
      en: "Search for a movie or web series, select from the search results, and get watch and download links for the selected episode",
    },
    category: "Information",
    guide: {
      en: "{pn} <movie or web series name>\nExample: {pn} Flash",
    },
  },
  langs: {
    en: {
      invalid_query: "Please enter a valid movie or web series name.",
      no_results: "No results found for the provided name.",
      select_result: "Please reply with the number of the result you want to select.",
      select_episode: "Please reply with the episode number to get the watch and download links.",
      sending_info: "Sending information...",
      error: "There was an error retrieving the information.",
    },
  },
  onStart: async function ({ api, message, event, args, getLang }) {
    const query = args.join(" ");
    console.log(`Received query: ${query}`);

    if (!query) {
      console.log("No query provided.");
      return message.reply(getLang("invalid_query"));
    }

    try {
      const response = await axios.get(`https://consumet-api-s5m2.onrender.com/movies/flixhq/${encodeURIComponent(query)}`);
      console.log(`API Response: ${JSON.stringify(response.data)}`);
      const data = response.data;

      if (!data || !data.results || data.results.length === 0) {
        console.log("No valid data found.");
        return message.reply(getLang("no_results"));
      }

      const topResults = data.results.slice(0, 6);
      let resultMessage = "Top search results:\n";
      topResults.forEach((result, index) => {
        resultMessage += `${index + 1}. ${result.title} (${result.type})\n`;
      });
      resultMessage += "\nReply with the number of the result you want to select.";

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
      console.error(`Error occurred: ${error}`);
      return message.reply(getLang("error"));
    }
  },

  onReply: async function ({ api, message, event, Reply, getLang }) {
    const { author, messageID, step, topResults, selectedId } = Reply;

    if (event.senderID !== author) {
      return message.reply("⚠ You are not the player of this command.");
    }

    const userReply = parseInt(event.body.trim()) - 1;

    if (step === 1) {
      if (userReply < 0 || userReply >= topResults.length) {
        return message.reply("⚠ Invalid option. Please reply with the correct number.");
      }

      const selectedResult = topResults[userReply];
      const selectedId = selectedResult.id;

      try {
        const infoResponse = await axios.get(`https://consumet-api-s5m2.onrender.com/movies/flixhq/info?id=${selectedId}`);
        const infoData = infoResponse.data;

        if (!infoData) {
          return message.reply("No valid data found for the selected result.");
        }

        let details = `📺 *${infoData.title}*\n`;
        if (infoData.releaseDate) {
          details += `📅 *Released*: ${infoData.releaseDate}\n`;
        }
        if (infoData.genres && infoData.genres.length > 0) {
          details += `📂 *Genres*: ${infoData.genres.join(", ")}\n`;
        }
        if (infoData.casts && infoData.casts.length > 0) {
          details += `👥 *Casts*: ${infoData.casts.join(", ")}\n`;
        }
        if (infoData.duration) {
          details += `🕒 *Duration*: ${infoData.duration}\n`;
        }
   
        if (infoData.episodes && infoData.episodes.length > 0) {
          details += `🔢 *Total Episodes*: ${infoData.episodes.length}\n`;
        }
        
        if (infoData.type === "Movie") {
          details += "\nReply with 'watch' to get the watch and download links.";
        } else {
          details += "\nReply with the episode number to get the watch and download links.";
        }

        message.reply(details, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            step: 2,
            selectedId: selectedId,
            isMovie: infoData.type === "Movie",
            episodes: infoData.episodes,
          });
        });
      } catch (error) {
        console.error(`Error occurred: ${error}`);
        return message.reply(getLang("error"));
      }
    } else if (step === 2) {
      const isMovie = Reply.isMovie;
      const episodes = Reply.episodes;

      if (isMovie) {
        try {
          const watchUrl = `https://consumet-api-s5m2.onrender.com/movies/flixhq/watch?mediaId=${selectedId}&server=vidcloud`;
          const watchResponse = await axios.get(watchUrl);
          const watchData = watchResponse.data;

          if (!watchData || !watchData.sources || watchData.sources.length === 0) {
            return message.reply("No valid data found for the selected item.");
          }

          let links = `Watch and download links for the movie:\n`;
          for (const source of watchData.sources) {
            const shortUrl = await tinyurl.shorten(source.url);
            links += `🔗 [${source.quality}](${shortUrl})\n`;
          }

          message.reply(links);
        } catch (error) {
          console.error(`Error occurred: ${error}`);
          return message.reply(getLang("error"));
        }
      } else {
        if (userReply < 0 || userReply >= episodes.length) {
          return message.reply("⚠ Invalid option. Please reply with the correct episode number.");
        }

        const selectedEpisode = episodes[userReply];

        try {
          const watchUrl = `https://consumet-api-s5m2.onrender.com/movies/flixhq/watch?episodeId=${selectedEpisode.id}&mediaId=${selectedId}&server=vidcloud`;
          const watchResponse = await axios.get(watchUrl);
          const watchData = watchResponse.data;

          if (!watchData || !watchData.sources || watchData.sources.length === 0) {
            return message.reply("No valid data found for the selected item.");
          }

          let links = `Watch and download links for episode ${selectedEpisode.number}:\n`;
          for (const source of watchData.sources) {
            const shortUrl = await tinyurl.shorten(source.url);
            links += `🔗 [${source.quality}](${shortUrl})\n`;
          }

          message.reply(links);
        } catch (error) {
          console.error(`Error occurred: ${error}`);
          return message.reply(getLang("error"));
        }
      }
    }
  }
};
