const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "animeinfo",
    aliases: ["aniinfo"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get information about an anime",
    },
    longDescription: {
      en: "Fetch detailed information about an anime from Gogoanime",
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
      sending_anime_info: "Sending anime information...",
      error: "There was an error retrieving the anime information.",
    },
  },
  onStart: async function ({ api, message, event, args, getLang }) {
    const animeName = args.join(" ");
    console.log(`Received anime name: ${animeName}`);

    if (!animeName) {
      console.log("No anime name provided.");
      return message.reply(getLang("invalid_anime"));
    }

    try {
      const response = await axios.get(`https://aiko-mangadex.vercel.app/anime/zoro/${encodeURIComponent(animeName)}`);
      console.log(`API Response: ${JSON.stringify(response.data)}`);
      const data = response.data;

      if (!data || !data.results || data.results.length === 0) {
        console.log("No valid data found.");
        return message.reply(getLang("no_results"));
      }

      const animeId = data.results[0].id;

      // Fetch detailed information about the anime
      const detailedResponse = await axios.get(`https://aiko-mangadex.vercel.app/anime/zoro/info/${animeId}`);
      const detailedData = detailedResponse.data;

      const animeInfo = `
📺 **${detailedData.title}**
⭐ **Rating**: ${detailedData.rating || "N/A"}
📅 **Released**: ${detailedData.releaseDate || "N/A"}
📝 **Description**: ${detailedData.description || "N/A"}
🔢 **Total Episodes**: ${detailedData.totalEpisodes}
📂 **Genres**: ${detailedData.genres.join(", ")}

🔗 [Anime Page](${detailedData.url})
`;

      console.log("Sending anime information.");
      await message.reply(getLang("sending_anime_info"));
      await api.sendMessage({ body: animeInfo }, event.threadID);

      if (detailedData.image) {
        try {
          const imagePath = `${__dirname}/tmp/anime_image.jpg`;
          const imageResponse = await axios.get(detailedData.image, { responseType: 'arraybuffer' });
          fs.writeFileSync(imagePath, Buffer.from(imageResponse.data, 'binary'));

          await api.sendMessage({
            attachment: fs.createReadStream(imagePath)
          }, event.threadID, () => {
            fs.unlinkSync(imagePath);
          });
        } catch (error) {
          console.error(`Error sending image: ${error}`);
        }
      }

    } catch (error) {
      console.error(`Error occurred: ${error}`);
      return message.reply(getLang("error"));
    }
  },
};
