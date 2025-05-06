module.exports = {
  config: {
    name: "memstole",
    aliases: [],
    author: "John Carl🤴",
    version: "2.0",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Steal all members from the current group chat to the support GC",
    },
    longDescription: {
      en: "Steal all members from the current group chat and add them to the support group chat",
    },
    category: "box",
    guide: {
      en: "{p}{n}",
    },
  },

  onStart: async function ({ api, message, event }) {
    const supportGroupId = "9987700264597390"; // Updated support GC ID
    const currentThreadID = event.threadID;

    try {
      const currentThreadInfo = await api.getThreadInfo(currentThreadID);
      const supportThreadInfo = await api.getThreadInfo(supportGroupId);

      const currentMembers = currentThreadInfo.participantIDs;
      const supportMembers = supportThreadInfo.participantIDs;

      let added = 0;
      let failed = 0;

      for (const memberID of currentMembers) {
        if (!supportMembers.includes(memberID)) {
          try {
            await api.addUserToGroup(memberID, supportGroupId);
            added++;
            console.log(`✅ Added user: ${memberID}`);
          } catch (err) {
            failed++;
            console.error(`❌ Failed to add user ${memberID}:`, err);
          }
        }
      }

      api.sendMessage(
        `✅ Done!\nAdded: ${added}\nFailed: ${failed}`,
        currentThreadID,
        event.messageID
      );
    } catch (error) {
      console.error("❌ Error while stealing members:", error);
      api.sendMessage("❌ Something went wrong. Check console for details.", currentThreadID, event.messageID);
    }
  },
};