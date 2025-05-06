const fs = require('fs');

module.exports = {
  config: {
    name: "autoleave",
    version: "1.6",
    author: "Abdul Kaiyum",
    category: "events"
  },
  langs: {
    en: {
      insufficientMembers: "❎ | Your group has less than %1 members. Please add more members to use the bot.",
      botLeftGroup: "The bot has left the group \"%1\" (ID: %2) because it has less than %3 members."
    }
  },
  onStart: async function ({ api, event, threadsData, message, getLang }) {
    const minMembers = 6;
    const groupId = event.threadID;
    const adminGroupId = "7388254684526242";

    console.log(`Event received: ${event.logMessageType}`);

    // Function to check member count and possibly leave the group
    const checkAndLeaveIfNeeded = async () => {
      try {
        const threadInfo = await api.getThreadInfo(groupId);
        const membersCount = threadInfo.participantIDs.length;
        const groupName = threadInfo.threadName;

        console.log(`Group ID: ${groupId}, Members Count: ${membersCount}, Group Name: ${groupName}`);

        // If the group members are less than the minimum required
        if (membersCount < minMembers) {
          await message.send({
            body: getLang("insufficientMembers", minMembers),
          });

          console.log('Sending message about insufficient members');

          // Notify admin group
          await api.sendMessage({
            body: getLang("botLeftGroup", groupName, groupId, minMembers),
          }, adminGroupId);

          console.log(`Notified admin group ${adminGroupId} about leaving group ${groupId}`);

          // Remove the bot from the group
          await api.removeUserFromGroup(api.getCurrentUserID(), groupId);
          console.log('Bot removed from the group');

          // Remove the group from approval list if it exists
          let threads = [];
          try {
            threads = JSON.parse(fs.readFileSync('threads.json', 'utf8'));
            console.log('threads.json read successfully');
          } catch (err) {
            console.error('Error reading threads.json', err);
          }

          const updatedThreads = threads.filter(thread => thread !== groupId);
          fs.writeFileSync('threads.json', JSON.stringify(updatedThreads, null, 2));
          console.log('threads.json updated successfully');
        }
      } catch (error) {
        console.error('Error in checkAndLeaveIfNeeded:', error);
      }
    };

    // Listen to all relevant events to check member count
    if (event.logMessageType === "log:subscribe" || event.logMessageType === "log:unsubscribe" || event.logMessageType === "log:thread-name") {
      console.log(`Handling event: ${event.logMessageType}`);
      await checkAndLeaveIfNeeded();
    }
  }
};