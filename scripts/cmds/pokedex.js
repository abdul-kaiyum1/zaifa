const axios = require("axios");

module.exports = {
	config: {
		name: "pokedex",

		version: "8.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"Search Pokémon info",

		longDescription:
			"Get detailed Pokédex info about any Pokémon",

		category: "pokemon",

		guide: {
			en: `
╭─ POKEDEX GUIDE ─╮

📘 Command:
• pokedex pokemonName

━━━━━━━━━━━━━━━

📌 Example:

• pokedex pikachu
• pokedex charizard
• pokedex mewtwo

━━━━━━━━━━━━━━━

📊 Shows:

• Pokémon Info
• Stats
• Abilities
• Types
• Height
• Weight

━━━━━━━━━━━━━━━

💡 Tips:

• Battle er age stats dekho 😹
• Legendary Pokémon search koro

╰────────────────╯`
		}
	},

	onStart: async function ({
		message,
		args
	}) {

		try {

			// NO NAME

			if (!args[0]) {

				return message.reply(
`❌ Please enter Pokémon name.

📌 Example:
pokedex pikachu`
				);
			}

			// NAME

			const name =
				args
					.join(" ")
					.toLowerCase();

			// API

			const res =
				await axios.get(
					`https://pokeapi.co/api/v2/pokemon/${name}`
				);

			const data =
				res.data;

			// STATS

			const hp =
				data.stats[0]
					.base_stat;

			const attack =
				data.stats[1]
					.base_stat;

			const defense =
				data.stats[2]
					.base_stat;

			const speed =
				data.stats[5]
					.base_stat;

			// TYPES

			const types =
				data.types
					.map(
						t =>
							t.type.name
					)
					.join(", ");

			// ABILITIES

			const abilities =
				data.abilities
					.map(
						a =>
							a.ability.name
					)
					.join(", ");

			// IMAGE

			const image =
				data.sprites
					.other[
					"official-artwork"
				]
					.front_default ||

				data.sprites
					.front_default;

			// MESSAGE

			message.reply({
				body:
`📘 POKÉDEX ENTRY

━━━━━━━━━━━━━━━

🧬 Name:
${data.name}

🆔 Pokédex ID:
${data.id}

🌿 Types:
${types}

━━━━━━━━━━━━━━━

❤️ HP:
${hp}

⚔️ Attack:
${attack}

🛡️ Defense:
${defense}

🏃 Speed:
${speed}

━━━━━━━━━━━━━━━

📏 Height:
${data.height}

⚖️ Weight:
${data.weight}

✨ Abilities:
${abilities}

━━━━━━━━━━━━━━━

🔥 Pokémon data loaded!`,

				attachment:
					await global.utils.getStreamFromURL(
						image
					)
			});

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Pokémon not found."
			);
		}
	}
};