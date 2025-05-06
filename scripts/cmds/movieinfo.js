const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "movieinfo",
    aliases: ["mi"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get information about a movie",
    },
    longDescription: {
      en: "Fetch detailed information about a movie from IMDb",
    },
    category: "Information",
    guide: {
      en: "{pn} <movie name>\nExample: {pn} Iron Man",
    },
  },
  langs: {
    en: {
      invalid_movie: "Please enter a valid movie name.",
      no_results: "No results found for the movie name.",
      sending_movie_info: "Sending movie information...",
      error: "There was an error retrieving the movie information.",
    },
  },
  onStart: async function ({ api, message, event, args, getLang }) {
    const movieName = args.join(" ");
    console.log(`Received movie name: ${movieName}`);

    if (!movieName) {
      console.log("No movie name provided.");
      return message.reply(getLang("invalid_movie"));
    }

    try {
      const initialMessage = await api.sendMessage(getLang("sending_movie_info"), event.threadID);
      const response = await axios.get(`https://api.popcat.xyz/imdb?q=${encodeURIComponent(movieName)}`);
      console.log(`API Response: ${JSON.stringify(response.data)}`);
      const data = response.data;

      if (!data || data.error || data.title === "N/A") {
        console.log("No valid data found.");
        await api.editMessage(getLang("no_results"), initialMessage.messageID);
        return;
      }

      const movieInfo = `
🎬 **${data.title} (${data.year})**
⭐ **IMDb Rating**: ${data.rating}/10
🍅 **Rotten Tomatoes**: ${data.ratings.find(r => r.source === "Rotten Tomatoes")?.value || "N/A"}
📅 **Released**: ${new Date(data.released).toDateString()}
⏰ **Runtime**: ${data.runtime}
👥 **Director**: ${data.director}
✍️ **Writers**: ${data.writer}
🎭 **Actors**: ${data.actors}
🎥 **Genres**: ${data.genres}
🌐 **Languages**: ${data.languages}
🏆 **Awards**: ${data.awards}
📖 **Plot**: ${data.plot}

🔗 [IMDb Page](${data.imdburl})
`;

      console.log("Editing message to send movie information.");
      await api.editMessage(movieInfo, initialMessage.messageID);

      if (data.poster) {
        try {
          const posterPath = `${__dirname}/tmp/poster.jpg`;
          const posterResponse = await axios.get(data.poster, { responseType: 'arraybuffer' });
          fs.writeFileSync(posterPath, Buffer.from(posterResponse.data, 'binary'));

          await api.sendMessage({
            attachment: fs.createReadStream(posterPath)
          }, event.threadID, () => {
            fs.unlinkSync(posterPath);
          });
        } catch (error) {
          console.error(`Error sending poster: ${error}`);
        }
      }

    } catch (error) {
      console.error(`Error occurred: ${error}`);
      return message.reply(getLang("error"));
    }
  },
};