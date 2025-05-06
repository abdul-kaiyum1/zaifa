module.exports = {
  config: {
    name: "profile",
    aliases: ["pfp","pp"],
    version: "1.1",
    author: "NIB",
    countDown: 5,
    role: 0,
    shortDescription: "PROFILE image",
    longDescription: "PROFILE image",
    category: "image",
    guide: {
      en: "   {pn} @tag"
    }
  },

  onStart: async function ({ event, message, usersData, args, getLang }) {
    const uid1 = event.senderID;
    const uid2 = Object.keys(event.mentions)[0];
    
    // Your UIDs to prevent others from accessing your profile information
    const yourUids = ["100057399829870", "100084568197142","100041931226770","100080099546468"]; // Add your UIDs here
    
    // Check if someone else is trying to access your profile information
    if (yourUids.includes(uid2) || (event.type === "message_reply" && yourUids.includes(event.messageReply.senderID))) {
      return message.reply("You don't have permission to access this information.");
    }

    let avt;
    if (event.type === "message_reply") {
      avt = await usersData.getAvatarUrl(event.messageReply.senderID);
    } else {
      avt = uid2 ? await usersData.getAvatarUrl(uid2) : await usersData.getAvatarUrl(uid1);
    }

    message.reply({
      body: "⊰「Profile」⊱",
      attachment: await global.utils.getStreamFromURL(avt)
    });
  }
};
