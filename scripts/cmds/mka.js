const config = {
  name: "makeadmin",
  aliases: ["mka"],
  version: "1.0",
  author: "sheikh farid",
  countDown: 10,
  role: 2,
  shortDescription: {
    en: "Make the user a non-admin if the bot is an admin."
  },
  longDescription: {
    en: "This command will make the user a non-admin of the group if the bot is also an admin. If not, it will send a message saying the bot is not an admin."
  },
  category: "BOX CHAT",
  guide: {
    en: ""
  }
};

module.exports = {
  config,
  langs: {
    en: {
      gg: ""
    }
  },

  onStart: async function ({ event, api, message, threadsData, usersData }) {
    if (config.author !== "sheikh farid") {
      message.reply("You're not the author. Access denied.(real author is sheikh farid) ");
      return;
    }

    const threadID = event.threadID;

    const adminIDs = await threadsData.get(event.threadID, "adminIDs");

    if (!adminIDs.includes(api.getCurrentUserID())) {

      api.sendMessage("Sorry, I'm not an admin of this group.", event.threadID);
      return;
    }

    const mentionedUserIDs = Object.keys(event.mentions);

    if (mentionedUserIDs.length > 0) {
      if (mentionedUserIDs.includes(event.senderID)) {
        api.sendMessage("You cannot remove yourself from the admin list.", event.threadID);
        return;
      }
      const mentionedUserID = mentionedUserIDs[0];

      try {
        await api.changeAdminStatus(event.threadID, mentionedUserID, true);
      } catch (error) {
        console.error(error);

        api.sendMessage("An error occurred while trying to remove the user from the admin list. Please try again later.", event.threadID);
        return;
      }

      // Send a message saying that the mentioned user(s) have been removed from the admin list
      api.sendMessage(`The mentioned person have been promoted from the admin list.`, event.threadID);
    } else {
      await api.changeAdminStatus(threadID, event.senderID, true);

      api.sendMessage("you have been promoted", threadID);
    }
  }
};