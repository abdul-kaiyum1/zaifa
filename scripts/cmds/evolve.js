const {
	getPokemonUser,
	savePokemonUser
} = require("./pokemonMongo");

const evolutions = {

	bulbasaur:
		"ivysaur",

	ivysaur:
		"venusaur",

	charmander:
		"charmeleon",

	charmeleon:
		"charizard",

	squirtle:
		"wartortle",

	wartortle:
		"blastoise",

	pikachu:
		"raichu",

	eevee:
		"vaporeon",

	dratini:
		"dragonair",

	dragonair:
		"dragonite"
};

module.exports = {
	config: {
		name: "evolve",

		version: "7.0",

		author: "Abdul Kaiyum",

		countDown: 10,

		role: 0,

		shortDescription:
			"Evolve Pokémon",

		longDescription:
			"Evolve your Pokémon into stronger forms",

		category: "pokemon",

		guide: {
			en: `
╭─ EVOLVE GUIDE ─╮

🧬 Command:
• evolve pokemonNumber

━━━━━━━━━━━━━━━

📌 Example:

evolve 1

━━━━━━━━━━━━━━━

🎮 Requirements:

• Pokémon must be Level 5+
• Pokémon must have evolution

━━━━━━━━━━━━━━━

💡 Tips:

• Higher evolution = stronger stats 😹
• Level up Pokémon first

╰─────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		args
	}) {

		try {

			// NUMBER

			const number =
				parseInt(
					args[0]
				);

			if (
				isNaN(number)
			) {

				return message.reply(
`❌ Enter Pokémon number.

📌 Example:
evolve 1`
				);
			}

			// USER DATA

			const userData =
				await getPokemonUser(
					event.senderID
				);

			const pokemons =
				userData.pokemons || [];

			// NO POKEMON

			if (!pokemons.length) {

				return message.reply(
					"❌ You have no Pokémon."
				);
			}

			// SORT

			const sorted =
				[...pokemons].sort(
					(a, b) =>
						b.level -
						a.level
				);

			const pokemon =
				sorted[number - 1];

			// INVALID

			if (!pokemon) {

				return message.reply(
					"❌ Invalid Pokémon number."
				);
			}

			// CHECK EVOLUTION

			const evolution =
				evolutions[
					pokemon.name.toLowerCase()
				];

			if (!evolution) {

				return message.reply(
`❌ ${pokemon.name}
cannot evolve.`
				);
			}

			// LEVEL CHECK

			if (
				pokemon.level < 5
			) {

				return message.reply(
`❌ ${pokemon.name}
needs Level 5+ to evolve.`
				);
			}

			// FIND REAL POKEMON

			const realPokemon =
				userData.pokemons.find(
					p =>
						p.name ===
							pokemon.name &&

						p.level ===
							pokemon.level &&

						p.shiny ===
							pokemon.shiny
				);

			if (!realPokemon) {

				return message.reply(
					"❌ Pokémon not found."
				);
			}

			// EVOLVE

			const oldName =
				realPokemon.name;

			realPokemon.name =
				evolution;

			// STAT BOOST

			realPokemon.hp += 30;

			realPokemon.attack +=
				15;

			realPokemon.defense +=
				15;

			realPokemon.speed +=
				10;

			// SAVE DEX

			if (
				!userData.pokedex.includes(
					evolution
				)
			) {

				userData.pokedex.push(
					evolution
				);
			}

			// SAVE

			await savePokemonUser(
				event.senderID,
				userData
			);

			// SUCCESS

			message.reply(
`🧬 POKÉMON EVOLVED!

━━━━━━━━━━━━━━━

⬅️ Before:
${oldName}

➡️ After:
${evolution}

━━━━━━━━━━━━━━━

📈 New Stats Boosted!

❤️ HP:
+30

⚔️ Attack:
+15

🛡️ Defense:
+15

🏃 Speed:
+10

━━━━━━━━━━━━━━━

🔥 Your Pokémon became stronger!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Evolution failed."
			);
		}
	}
};