module.exports = {
  config: {
    name: "ifter",
    aliases: ["ramadan"],
    version: "1.0",
    author: "Dipto",
    description: "Get Iftar and Sehri time",
    category: "Islamic",
    guide: {
en:"[city] --c [color]"
},
  },
  onStart: async function ({ api, event, args }) {
    const axios = require("axios");
const dipto = "https://www.noobs-api.rf.gd/dipto" 
    let city = args[0] || "Dhaka",
        color = args.includes("--c") ? args[args.indexOf("--c") + 1] : null,
        url = `${dipto}/ifter?city=${encodeURIComponent(city)}${color ? `&color=${encodeURIComponent(color)}` : "white"}`;

    try {
      let { data } = await axios.get(url);
      if (!data.today) return api.sendMessage("⚠️ Invalid city.", event.threadID);

      let msg = `🌙 ${data.today.ramadan} Kareem\n\n` +
                `Today Sheri & Iftar Time\n🌄 Sheri Time: ${data.today.sehri}\n🕌 Fajr Time: ${data.today.fajr}\n🌆 Iftar Time: ${data.today.iftar}\n` +
                `⏳ Time Remaining → Sheri: ${data.sahriRemain} | Iftar: ${data.iftarRemain}\n\n` +
                `📆 Tomorrow: ${data.tomorrowDate}\n` +
                `🌄 Sheri Time: ${data.tomorrow.sehri} | 🕌 Fajr Time: ${data.tomorrow.fajr} | 🌆 Iftar Time: ${data.tomorrow.iftar}\n\n` +
                `⏰ Current Time: ${data.currentTime}\n` +
                `📍 Location : ${data.city}`;

      api.sendMessage({ body: msg, attachment: await global.utils.getStreamFromURL(data.imgUrl) }, event.threadID, event.messageID);

    } catch {
      api.sendMessage("⚠️ Failed to fetch data.", event.threadID);
    }
  }
};