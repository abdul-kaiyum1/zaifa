const {
	getPokemonData
} = require("./pokemonUtils");

module.exports = {
	config: {
		name: "pokedex",

		aliases: [
			"pdex",
			"dex"
		],

		version: "4.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"View your Pokédex",

		longDescription:
			"See your Pokémon collection stats",

		category: "pokemon",

		guide: {
			en: `
╭─ POKEDEX GUIDE ─╮

📘 Commands:
• pokedex
• pdex
• dex

━━━━━━━━━━━━━━━

📊 Shows:
• Total Pokémon
• Shiny Count
• Legendary Count
• Win/Loss Stats
• Coins
• Strongest Pokémon

━━━━━━━━━━━━━━━

💡 Tips:
• Catch more Pokémon
• Hunt shiny Pokémon
• Level up Pokémon
• Battle more 😹

╰────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		usersData
	}) {

		try {

			// GET USER DATA

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

			// STATS

			const shinyCount =
				pokemons.filter(
					p => p.shiny
				).length;

			const legendaryCount =
				pokemons.filter(
					p =>
						p.rarity ===
						"legendary"
				).length;

			const mythicalCount =
				pokemons.filter(
					p =>
						p.rarity ===
						"mythical"
				).length;

			const epicCount =
				pokemons.filter(
					p =>
						p.rarity ===
						"epic"
				).length;

			const rareCount =
				pokemons.filter(
					p =>
						p.rarity ===
						"rare"
				).length;

			const commonCount =
				pokemons.filter(
					p =>
						p.rarity ===
						"common"
				).length;

			// STRONGEST POKEMON

			const strongest =
				[...pokemons].sort(
					(a, b) =>
						b.level -
						a.level
				)[0];

			// TOTAL LEVEL

			const totalLevel =
				pokemons.reduce(
					(a, b) =>
						a +
						(b.level || 1),
					0
				);

			const avgLevel =
				(
					totalLevel /
					pokemons.length
				).toFixed(1);

			// HIGHEST RARITY

			let rarest =
				pokemons.find(
					p =>
						p.rarity ===
						"mythical"
				);

			if (!rarest) {

				rarest =
					pokemons.find(
						p =>
							p.rarity ===
							"legendary"
					);
			}

			if (!rarest) {

				rarest =
					pokemons.find(
						p =>
							p.rarity ===
							"epic"
					);
			}

			// UNIQUE POKEDEX

			const uniqueDex =
				[
					...new Set(
						pokeData.pokedex
					)
				];

			// MESSAGE

			message.reply(
`📘 YOUR POKÉDEX

━━━━━━━━━━━━━━━

👤 Trainer:
${await usersData.getName(
	event.senderID
)}

🧬 Total Pokémon:
${pokemons.length}

📖 Unique Pokédex:
${uniqueDex.length}

✨ Shiny Pokémon:
${shinyCount}

💰 Coins:
${pokeData.coins || 0}

🏆 Wins:
${pokeData.wins || 0}

💀 Losses:
${pokeData.losses || 0}

━━━━━━━━━━━━━━━

⭐ Average Level:
${avgLevel}

🔥 Strongest Pokémon:
${strongest.name}
Lv.${strongest.level}

━━━━━━━━━━━━━━━

👑 Rarest Pokémon:
${
	rarest
		? `${rarest.name}
(${rarest.rarity.toUpperCase()})`
		: "None"
}

━━━━━━━━━━━━━━━

📊 RARITY STATS

🟢 Common:
${commonCount}

🔵 Rare:
${rareCount}

🟣 Epic:
${epicCount}

🟡 Legendary:
${legendaryCount}

🔴 Mythical:
${mythicalCount}

━━━━━━━━━━━━━━━

🔥 Keep hunting Pokémon
to become strongest trainer!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to load Pokédex."
			);
		}
	}
};