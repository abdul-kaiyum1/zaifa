module.exports = {
  config: {
    name: "cancelpokemon",
    version: "1.1",
    author: "Abdul Kaiyum",
    role: 0,
    description: "Cancel your ongoing Pokémon identification challenge.",
    category: "game",
    guide: {
      en: "{pn} - Cancels your current Pokémon challenge."
    }
  },

  onStart: async function ({ event, message }) {
    const userID = event.senderID;
    const onReply = global.GoatBot.onReply;

    let found = false;

    for (const [messageID, data] of onReply.entries()) {
      if (data.senderID === userID && data.type === "challenge_answer") {
        onReply.delete(messageID);
        found = true;
        break;
      }
    }

    if (found) {
      message.reply("✅ Your Pokémon challenge has been successfully cancelled.");
    } else {
      message.reply("❌ You don’t have any active Pokémon challenge.");
    }
  }
};