const fs = require('fs');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "approval",
    version: "1.0",
    author: "Ohio03 | @tu33rtle.xy",
    category: "events"
  },
  onStart: async function ({ api, event, threadsData, message }) {
    const uid = "100057399829870";
    const groupId = event.threadID;
    const threadData = await threadsData.get(groupId);
    const name = threadData.threadName;
    const { getPrefix } = global.utils;
    const p = getPrefix(event.threadID);    

    let threads = [];
    try {
      threads = JSON.parse(fs.readFileSync('threads.json'));
    } catch (err) {
      console.error('', err);
    }

    if (!threads.includes(groupId) && event.logMessageType === "log:subscribe") {
      await message.send({
        body: `❎ | You Added The Aiko Without Permission !!\n\n✧Take Permission From my Admin's to Use Aiko In Your Group !!\n✧Join cat Support GC to Contact With Admin's !!\n\n✧Type ${p}supportgc within 30 seconds.`,
        attachment: await getStreamFromURL("https://i.ibb.co/5992ZSF/421631450.jpg")
      });
    }

    if (!threads.includes(groupId) && event.logMessageType === "log:subscribe") {
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Delay of 1 seconds
      await api.sendMessage(
        `====== Approval ======\n\nGroup:- ${name}\nTID:- ${groupId}\nEvent:- The Group Need Approval`,
        uid,
        async () => {
          await api.removeUserFromGroup(api.getCurrentUserID(), groupId);
        }
      );
    }
  }
};