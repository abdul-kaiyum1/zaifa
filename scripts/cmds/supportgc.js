module.exports = {
  config: {
    name: "supportgc",
    aliases: ["support", "gc", "botsgc", "joingc"],
    version: 1.0,
    author: "LiANE",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Join the support group chat" },
    longDescription: { en: "Join the support group chat" },
    category: "Testings",
    guide: { en: "{pn} - Join the support group chat" }
  },
  onStart: async function({ api, event }) {
    const supportGroupId = "7243675122322257";

    if (event.threadID === supportGroupId) {
      api.sendMessage(" ❗ | You are already in the support group.", event.threadID);
    } else {
      try {
        await api.addUserToGroup(event.senderID, supportGroupId);
        api.sendMessage("✅ | You have been added to the Aiko support group.", event.threadID);
      } catch (error) {
        if (error.message === "Error: Add user to group: Action blocked") {
          api.sendMessage("❌ | Sorry, you can't be added to the group because of group settings.", event.threadID);
        } else {
          console.error(error);
          api.sendMessage("❌ | An error occurred while processing your request.", event.threadID);
        }
      }
    }
  }
};