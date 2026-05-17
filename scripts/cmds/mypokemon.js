const {
	getPokemonData
} = require("./pokemonUtils");

const {
	getRarityEmoji
} = require("./rarity");

module.exports = {
	config: {
		name: "mypokemon",

		aliases: [
			"pokemon",
			"mypoke",
			"pokebag"
		],

		version: "5.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"View your Pokémon",

		longDescription:
			"See your Pokémon collection",

		category: "pokemon",

		guide: {
			en: `
╭─ MYPOKEMON GUIDE ─╮

📘 Commands:

• mypokemon
• pokemon
• pokebag

━━━━━━━━━━━━━━━

📊 Shows:

• All Pokémon
• Levels
• XP
• Rarity
• Shiny Status
• Stats
• Types

━━━━━━━━━━━━━━━

💡 Tips:

• Level up Pokémon
• Catch shiny Pokémon
• Build strong team 😹

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		usersData
	}) {

		try {

			// USER DATA

			const userData =
				await getPokemonData(
					usersData,
					event.senderID
				);

			const pokeData =
				userData.pokemonData;

			const pokemons =
				pokeData.pokemons || [];

			// NO POKEMON

			if (!pokemons.length) {

				return message.reply(
`❌ You don't have any Pokémon yet.

🎯 Use:
pokehunt

to catch Pokémon!`
				);
			}

			// SORT BY LEVEL

			const sorted =
				[...pokemons].sort(
					(a, b) =>
						b.level -
						a.level
				);

			// STATS

			const shinyCount =
				sorted.filter(
					p => p.shiny
				).length;

			const legendaryCount =
				sorted.filter(
					p =>
						p.rarity ===
						"legendary"
				).length;

			// MESSAGE

			let msg =
`📘 YOUR POKÉMON COLLECTION

━━━━━━━━━━━━━━━

👤 Trainer:
${await usersData.getName(
	event.senderID
)}

🧬 Total Pokémon:
${sorted.length}

✨ Shiny Pokémon:
${shinyCount}

🟡 Legendary:
${legendaryCount}

💰 Coins:
${pokeData.coins || 0}

🏆 Wins:
${pokeData.wins || 0}

💀 Losses:
${pokeData.losses || 0}

━━━━━━━━━━━━━━━
`;

			// POKEMON LIST

			for (
				let i = 0;
				i < sorted.length;
				i++
			) {

				const p =
					sorted[i];

				const rarityEmoji =
					getRarityEmoji(
						p.rarity
					);

				msg +=
`
#${i + 1}

${rarityEmoji}
${p.shiny ? "✨" : ""}
${p.name}

⭐ ${p.rarity.toUpperCase()}

📈 Level:
${p.level}

✨ XP:
${p.xp || 0}/100

❤️ HP:
${p.hp}

⚔️ Attack:
${p.attack}

🛡️ Defense:
${p.defense}

🏃 Speed:
${p.speed}

🌿 Type:
${p.types.join(", ")}

━━━━━━━━━━━━━━━`;
			}

			msg +=
`

🔥 Keep training
your Pokémon team!`;

			message.reply(msg);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to load Pokémon."
			);
		}
	}
};