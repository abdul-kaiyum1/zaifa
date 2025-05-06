module.exports = {
  config: {
    name: "groupcount",
    aliases: ["listbox", "listgroups"],
    author: "Abdul Kaiyum",
    version: "1.0",
    cooldowns: 5,
    role: 2,
    shortDescription: {
      en: "Show all groups where the bot is added"
    },
    longDescription: {
      en: "Displays the total number of group chats and their names where the bot is present."
    },
    category: "owner",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event }) {
    try {
      const allThreads = await api.getThreadList(100, null, ["INBOX"]);

      const groupChats = allThreads.filter(thread =>
        thread.isSubscribed &&
        thread.threadName !== null &&
        thread.threadType === "GROUP"
      );

      if (groupChats.length === 0) {
        return api.sendMessage("❌ No group chats found.", event.threadID, event.messageID);
      }

      const output = groupChats.map((group, index) => 
        `│ ${index + 1}. ${group.threadName}\n│ 🆔: ${group.threadID}`
      ).join("\n");

      const message = `╭───⭓\n│ Bot is in ${groupChats.length} groups:\n${output}\n╰──────────⭓`;
      return api.sendMessage(message, event.threadID, event.messageID);

    } catch (err) {
      console.error("Error fetching group list:", err);
      return api.sendMessage("❌ Error occurred. Check console for details.", event.threadID, event.messageID);
    }
  }
};