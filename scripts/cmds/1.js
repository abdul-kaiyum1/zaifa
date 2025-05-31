module.exports = {
  config: {
    name: "cancelpokemon",
    version: "1.0",
    author: "Abdul Kaiyum",
    role: 0,
    description: "Cancel your current Pokémon identification challenge",
    category: "game",
    guide: {
      en: "{pn} — Cancel current Pokémon challenge"
    }
  },

  onStart: async function ({ message, event }) {
    const userId = event.senderID;

    // Check if the challenge is stored in global.pokemonChallenge
    if (!global.pokemonChallenge || !global.pokemonChallenge.has(userId)) {
      return message.reply("❌ You don't have an active Pokémon challenge.");
    }

    // Delete the challenge
    global.pokemonChallenge.delete(userId);
    return message.reply("✅ Your Pokémon challenge has been cancelled.");
  }
};