const axios = require('axios');

module.exports = {
  config: {
    name: "mangadex",
    aliases: ["manga"],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    longDescription: {
      vi: '',
      en: "Read Manga. This command source code is by Gabriel. The API is hosted and cmd modified by Abdul Kaiyum.."
    },
    category: "anime",
    guide: {
      vi: '',
      en: "{pn} <manga name>"
    }
  },

  onStart: async function ({ api, commandName, event, args }) {
    if (!args.length) {
      return api.sendMessage("Please provide a manga name. Usage: {pn} <manga name>", event.threadID, event.messageID);
    }

    const search = args.join(" ").trim();
    const cleanSearch = search.replace(/[\/\\:]/g, '');

    api.setMessageReaction('⏳', event.messageID, () => {}, true);

    try {
      const searchResult = await getAllSearchResults(cleanSearch);

      if (!searchResult.length) {
        return api.sendMessage("No results found!", event.threadID, () => {
          api.setMessageReaction('⚠️', event.messageID, () => {}, true);
        }, event.messageID);
      }

      let resultPage = '';
      searchResult.slice(0, 10).forEach((item, index) => {
        resultPage += `${index + 1}. Title: ${item.title}\nStatus: ${item.status}\nRelease Date: ${item.releaseDate}\nLast Volume: ${item.lastVolume}\nLast Chapter: ${item.lastChapter}\n\n`;
      });

      return api.sendMessage("Results:\n--------------------------\n" + resultPage + "Reply with the number to select a manga.\n\nUse 'Page <number>' to navigate pages.", event.threadID, (error, message) => {
        global.GoatBot.onReply.set(message.messageID, {
          commandName: commandName,
          author: event.senderID,
          messageID: message.messageID,
          type: "select",
          currentPageData: searchResult,
          page: 1,
          perPage: 10
        });
        api.setMessageReaction('', event.messageID, () => {}, true);
      }, event.messageID);

    } catch (error) {
      return api.sendMessage("Error: " + error.message, event.threadID, event.messageID) && api.setMessageReaction('⚠️', event.messageID, () => {}, true);
    }
  },

  onReply: async function ({ Reply, api, event, args }) {
    try {
      const { commandName, author, messageID, type, currentPageData, page, perPage } = Reply;
      if (event.senderID != author) {
        return;
      }

      if (type === "select") {
        if (args[0]?.toLowerCase() === "page" && !isNaN(args[1])) {
          const newPage = parseInt(args[1]);
          if (newPage < 1 || newPage > Math.ceil(currentPageData.length / perPage)) {
            return api.sendMessage(`Invalid page number! There are ${Math.ceil(currentPageData.length / perPage)} pages in total.`, event.threadID, event.messageID);
          }

          let resultPage = '';
          const paginatedData = currentPageData.slice((newPage - 1) * perPage, newPage * perPage);
          paginatedData.forEach((item, index) => {
            resultPage += `${index + 1 + (newPage - 1) * perPage}. Title: ${item.title}\nStatus: ${item.status}\nRelease Date: ${item.releaseDate}\nLast Volume: ${item.lastVolume}\nLast Chapter: ${item.lastChapter}\n\n`;
          });

          return api.sendMessage("Results:\n--------------------------\n" + resultPage + `Page ${newPage} of ${Math.ceil(currentPageData.length / perPage)}\n\nReply with the number to select a manga.\nUse 'Page <number>' to navigate pages.`, event.threadID, (error, message) => {
            global.GoatBot.onReply.set(message.messageID, {
              commandName: commandName,
              author: author,
              messageID: message.messageID,
              type: "select",
              currentPageData: currentPageData,
              page: newPage,
              perPage: perPage
            });
            api.setMessageReaction('', event.messageID, () => {}, true);
          }, event.messageID);
        } else {
          const index = parseInt(args[0]) - 1;
          const selectedData = currentPageData[index];

          if (!selectedData) {
            return api.sendMessage("Invalid selection! Please choose a valid number.", event.threadID, event.messageID);
          }

          api.setMessageReaction('⏳', event.messageID, () => {}, true);

          const response = await axios.get('https://aiko-mangadex.vercel.app/manga/mangadex/info/' + selectedData.id);
          const mangaInfo = response.data;
          const description = `Title: ${mangaInfo.title}\n\nDescription: ${mangaInfo.description.en}\n\nGenres: ${mangaInfo.genres.join(", ")}\nThemes: ${mangaInfo.themes.join(", ")}\nStatus: ${mangaInfo.status}\nRelease Date: ${mangaInfo.releaseDate}\nChapters: ${mangaInfo.chapters.length}\n\nReply with the chapter number to read. Ex: 2`;

          return api.sendMessage(description, event.threadID, (error, message) => {
            api.setMessageReaction('', event.messageID, () => {}, true);
            global.GoatBot.onReply.set(message.messageID, {
              commandName: commandName,
              author: author,
              messageID: message.messageID,
              type: "read",
              mangaInfo: mangaInfo
            });
          }, event.messageID);
        }

      } else if (type === "read") {
        const chapterNumber = parseInt(args[0]) - 1;
        if (isNaN(chapterNumber) || chapterNumber < 0 || chapterNumber >= Reply.mangaInfo.chapters.length) {
          return api.sendMessage("Invalid chapter number! Please provide a valid chapter number.", event.threadID, event.messageID);
        }

        const chapterData = Reply.mangaInfo.chapters.reverse()[chapterNumber];
        api.setMessageReaction('⏳', event.messageID, async () => {
          try {
            const response = await axios.get("https://aiko-mangadex.vercel.app/manga/mangadex/read/" + chapterData.id);
            const images = response.data.map(item => item.img);

            for (let i = 0; i < images.length; i += 10) {
              const batchImages = images.slice(i, i + 10);
              let chapterInfo = `Chapter ${chapterNumber + 1} - Pages ${i + 1} to ${Math.min(i + 10, images.length)}:\n`;
              const imageLinks = await Promise.all(batchImages.map(async (url) => {
                const imgbbResponse = await axios.get(`https://api.imgbb.com/1/upload?key=fc5b574c7b0834fe36e7ce4e9ec3e9aa&image=${encodeURIComponent(url)}`);
                return imgbbResponse.data.data.url;
              }));
              chapterInfo += imageLinks.join("\n");
              await api.sendMessage(chapterInfo, event.threadID);

              if (i + 10 < images.length) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Delay for 10 seconds
              }
            }

            api.setMessageReaction('', event.messageID, () => {}, true);

          } catch (error) {
            return api.sendMessage("Something went wrong while fetching the chapter images.", event.threadID, event.messageID) && api.setMessageReaction('⚠️', event.messageID, () => {}, true);
          }
        }, true);
      }
    } catch (error) {
      return api.sendMessage("Error: " + error.message, event.threadID, event.messageID) && api.setMessageReaction('⚠️', event.messageID, () => {}, true);
    }
  }
};

// Don't remove original credit in the name of I don't know author name

async function getAllSearchResults(search) {
  let page = 1;
  let allResults = [];
  let results = [];

  do {
    const searchResult = await axios.get(`https://aiko-mangadex.vercel.app/manga/mangadex/${search}?page=${page}`);
    results = searchResult.data.results;
    allResults = allResults.concat(results);
    page++;
  } while (results.length > 0);

  return allResults;
}
