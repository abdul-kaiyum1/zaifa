const axios = require('axios');
const MAIN = `http://193.160.23.195:2025`;

module.exports = {
  config: {
    name: "ramadan",
    version: "1.1",
    author: "tanvir",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: 'Get Ramadan timings'
    },
    longDescription: {
      en: "Get Ramadan timings"
    },
    category: "islam",
    guide: {
      en: "{pn} [city name]"
    },
  },
  onStart: async function({ api, event, args, message }) {
    try {
      const q = args.join(" ");
      if (!q) {
        return message.reply("⚠ | Please provide a city name.");
      }
      const search_res = await axios.get(`${MAIN}/search/city?q=${q}`);
      const results = search_res.data;
      if (results.length === 0) {
        return message.reply("⚠ | No Ramadan timing found for the given city name.");
      }
      const resList = results.map((result, index) => `${index + 1}. ${result.name}, ${result.country}.`).join('\n');
      message.reply({
        body: `${resList}\n\nReply to this message with the corresponding number to get Ramadan timing.`,
      }, async (err, info) => {
        const replyHandler = {
          commandName: this.config.name,
          messageID: info.messageID,
          results
        };
        global.GoatBot.onReply.set(info.messageID, replyHandler);
      });
    } catch (error) {
      console.error(error);
      message.reply(`✖ | Error occurred.`);
    }
  },
  onReply: async function({ api, event, Reply, args, message }) {
    try {
      const reply = args[0].toLowerCase();
      const { messageID, results } = Reply;
      if (!isNaN(reply) && reply >= 1 && reply <= results.length) {
        const chosenCity = results[reply - 1];
        message.unsend(Reply.messageID);
        const calendar_res = await axios.get(`${MAIN}/get/result?id=${chosenCity.id}`);
        const calendarData = calendar_res.data;
        const processed_cl = {
          city: calendarData.city,
          date: calendarData.date,
          sehri: calendarData.sehri,
          iftar: calendarData.iftar,
          sehri_message: calendarData.sehri_message,
          iftar_message: calendarData.iftar_message,
        };

        await send_message_fu(processed_cl, message, event, calendarData.image);
      }
    } catch (error) {
      console.error(error);
      message.reply(`❌ | Error occurred.`);
    }
  },
};

async function send_message_fu(processed_cl, message, event, image) {
  message.reply({
    body: `Ramadan Timing for ${processed_cl.city}\n\n• Date: ${processed_cl.date}\n• ${processed_cl.sehri_message}: ${processed_cl.sehri}\n• ${processed_cl.iftar_message}: ${processed_cl.iftar}`,
    attachment: await axios.get(MAIN+image, { responseType: 'stream' }).then(response => response.data),
  });
}