module.exports = {
  config: {
    name: "cancel",
    aliases: [],
    version: "1.0",
    author: "Abdul Kaiyum",
    countDown: 5,
    role: 0,
    shortDescription: "Cancel your current Pokémon challenge",
    longDescription: "Cancels your ongoing Pokémon challenge if one is active.",
    category: "games",
    guide: "{pn} challenge"
  },

  onStart: async function ({ args, message, event, usersData }) {
    const subCommand = args[0];
    const userID = event.senderID;
    const threadID = event.threadID;

    if (subCommand === "challenge") {
      const userState = await usersData.get(userID, "pokemonGame", {});

      if (userState.currentChallenge) {
        if (userState.currentChallenge.timeoutID) {
          clearTimeout(parseInt(userState.currentChallenge.timeoutID));
        }

        if (userState.currentChallenge.messageID) {
          message.unsend(userState.currentChallenge.messageID).catch(e => 
            console.warn("Cancel Challenge: Error un-sending challenge message:", e.message)
          );
        }

        userState.currentChallenge = null;
        await usersData.set(userID, userState, "pokemonGame");
        return message.reply("✅ Your active Pokémon challenge has been cancelled.");
      } else {
        return message.reply("❌ You don't have an active Pokémon challenge to cancel.");
      }
    }

    return message.reply("⚠️ Please specify what to cancel.\nExample: `cancel challenge`");
  }
};