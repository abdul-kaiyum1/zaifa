module.exports = { config: {
    name: "ms",
    aliases: ["ping"],
    version: "1.0",
    author: "sheikh farid",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Shows the ping of the bot."
    },
    longDescription: {
      en: "This command shows the ping of the bot in milliseconds."
    },
    category: "BOX CHAT",
    guide: {
      en: "Usage: ping"
    }
  },
  langs: {
    en: {
      gg: ""
    }
  },
  onStart: async function ({ message, event, api }) {
    const timeStart =  Date.now();
    await api.sendMessage("Checking Aiko's ping", event.threadID);

    const ping = Date.now() - timeStart;
    let ms = "";
    if (ping < 300) {
      ms = "🟢";
    } else if (ping < 500) {
      ms = "🟡";
    } else if (ping < 700) {
      ms = "🟠";
    } else if (ping < 900) {
      ms = "🔴";
    } else {
      ms = "⚫";
    }
    const msg = `🏓 Pong! The bot's ping is ${ping}ms. ${ms}`;

    api.sendMessage(msg, event.threadID);

  }
};