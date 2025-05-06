const fs = require('fs');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "autoleave",
    version: "1.1",
    author: "Abdul Kaiyum",
    category: "events"
  },
  onStart: async function ({ api, event, threadsData, message }) {
    const minMembers = 6;
    const groupId = event.threadID;

    // Check if the event is a subscription event (user added to the group)
    if (event.logMessageType === "log:subscribe") {
      const threadInfo = await api.getThreadInfo(groupId);
      const membersCount = threadInfo.participantIDs.length;

      // If the group members are less than the minimum required
      if (membersCount < minMembers) {
        await message.send({
          body: `❎ | Your group has less than ${minMembers} members. Please add more members to use the bot.`,
        });

        // Remove the bot from the group
        await api.removeUserFromGroup(api.getCurrentUserID(), groupId);

        
        let threads = [];
        try {
          threads = JSON.parse(fs.readFileSync('threads.json'));
        } catch (err) {
          console.error('Error reading threads.json', err);
        }

        const updatedThreads = threads.filter(thread => thread !== groupId);
        fs.writeFileSync('threads.json', JSON.stringify(updatedThreads, null, 2));
      }
    }
  }
};