const fs = require('fs');

module.exports = {
  config: {
    name: "botDetector",
    version: "1.0",
    author: "SiAM",
    category: "events"
  },

  onStart: async function ({ api, threadsData, event }) {
    const { getPrefix } = global.utils;
    const p = getPrefix(event.threadID);

    const bypassThreads = loadBypassThreads(); 

    if (bypassThreads.includes(event.threadID)) {
      return;
    }

    if (event.logMessageType === "log:subscribe" || event.logMessageType === "log:unsubscribe") {
      const threadId = event.threadID;
      const threadData = threadsData?.get(threadId);

      const approval = threadData?.settings?.approval;
      const newApproval = false; 

      const botData = loadBotData(); 

      const threadInfo = await api.getThreadInfo(threadId);
      const participantIDs = threadInfo.participantIDs;
      const detectedBots = [];

      for (const participantID of participantIDs) {
        if (botData.includes(participantID)) {
          const user = await api.getUserInfo(participantID);
          const botName = user[participantID].name;

          detectedBots.push({
            id: participantID,
            name: botName
          });
        }
      }

      if (detectedBots.length > 0) {
        const groupId = threadInfo.threadID;
        const groupName = threadInfo.name;
        const adminBoxId = "7388254684526242";

        const botMessage = `🚫 Multiple bots have been detected in this group:\n\n${detectedBots
          .map(bot => `Bot Name: ${bot.name}\nBot ID: ${bot.id}`)
          .join('\n\n')}\n\nPermission will be disapproved.`;

        api.sendMessage(botMessage, groupId);

        if (threadData) {
          threadData.settings = {
            ...threadData.settings,
            approval: newApproval
          };
          threadsData.set(threadId, threadData);
        }

        const adminMessage = `The following thread has detected multiple bot and BoT Leave The GC Automatically:\n\n❏ ThreadName: ${groupName}\n❏ ThreadID: ${groupId}\n❏ Detected Bots:\n${detectedBots
          .map(bot => `Bot Name: ${bot.name}\nBot ID: ${bot.id}`)
          .join('\n')}`;

        setTimeout(() => {
          api.removeUserFromGroup(api.getCurrentUserID(), groupId, (err) => {
            if (!err) {
              api.sendMessage(adminMessage, adminBoxId); 
            }
          });
        }, 4000); 
      }
    }
  }
};

function loadBotData() {
  const botData = fs.readFileSync(__dirname + '/botData.json', 'utf8');
  return JSON.parse(botData);
}

function loadBypassThreads() {
  const bypassThreads = fs.readFileSync(__dirname + '/antibotBypass.json', 'utf8');
  return JSON.parse(bypassThreads);
}