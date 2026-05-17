const {
	getPokemonData
} = require("./pokemonUtils");

const evolutionMap = {

	bulbasaur: "ivysaur",
	ivysaur: "venusaur",

	charmander: "charmeleon",
	charmeleon: "charizard",

	squirtle: "wartortle",
	wartortle: "blastoise",

	caterpie: "metapod",
	metapod: "butterfree",

	pidgey: "pidgeotto",
	pidgeotto: "pidgeot",

	rattata: "raticate",

	pikachu: "raichu",

	eevee: "vaporeon"
};

module.exports = {
	config: {
		name: "evolve",

		aliases: [
			"evolution",
			"pokeevolve"
		],

		version: "4.0",

		author: "Abdul Kaiyum",

		countDown: 10,

		role: 0,

		shortDescription:
			"Evolve Pokémon",

		longDescription:
			"Level up and evolve your Pokémon",

		category: "pokemon",

		guide: {
			en: `
╭─ EVOLVE GUIDE ─╮

✨ Commands:

• evolve pokemonName

━━━━━━━━━━━━━━━

📌 Example:

evolve pikachu

━━━━━━━━━━━━━━━

⚡ Requirements:

• Pokémon Level 5+
• Rare Candy OR Coins

━━━━━━━━━━━━━━━

🏆 Evolution Benefits:

• More HP
• More Attack
• More Defense
• Stronger Pokémon

━━━━━━━━━━━━━━━

💡 Tips:

• Battle kore level up koro
• Rare candy use koro
• Strong team build koro 😹

╰────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		args,
		usersData
	}) {

		try {

			if (!args[0]) {

				return message.reply(
					"❌ | Enter Pokémon name."
				);
			}

			const name =
				args
					.join(" ")
					.toLowerCase();

			const userData =
				await getPokemonData(
					usersData,
					event.senderID
				);

			const pokeData =
				userData.pokemonData;

			const pokemons =
				pokeData.pokemons;

			const pokemon =
				pokemons.find(
					p =>
						p.name.toLowerCase() ===
						name
				);

			if (!pokemon) {

				return message.reply(
					"❌ | Pokémon not found."
				);
			}

			// EVOLUTION CHECK

			const evolution =
				evolutionMap[
					name
				];

			if (!evolution) {

				return message.reply(
`❌ ${pokemon.name}
cannot evolve anymore.`
				);
			}

			// LEVEL CHECK

			if (
				pokemon.level < 5
			) {

				return message.reply(
`❌ ${pokemon.name}
needs Level 5 to evolve.

📈 Current Level:
${pokemon.level}`
				);
			}

			// REQUIREMENTS

			const items =
				pokeData.items || {};

			const hasRareCandy =
				(items.rarecandy || 0) >
				0;

			const coinCost =
				2000;

			// NO REQUIREMENTS

			if (
				!hasRareCandy &&
				pokeData.coins <
					coinCost
			) {

				return message.reply(
`❌ Need one of these:

🍬 Rare Candy
OR
💰 ${coinCost} Coins`
				);
			}

			// USE RARE CANDY

			let usedItem =
				"";

			if (
				hasRareCandy
			) {

				pokeData.items
					.rarecandy--;

				usedItem =
					"🍬 Rare Candy";
			}

			// USE COINS

			else {

				pokeData.coins -=
					coinCost;

				usedItem =
					`💰 ${coinCost} Coins`;
			}

			// EVOLVE

			const oldName =
				pokemon.name;

			pokemon.name =
				evolution;

			pokemon.level += 1;

			pokemon.hp += 30;

			pokemon.attack += 15;

			pokemon.defense += 10;

			pokemon.speed += 5;

			pokemon.xp = 0;

			// SAVE

			await usersData.set(
				event.senderID,
				{
					pokemonData:
						pokeData
				}
			);

			message.reply(
`✨ POKÉMON EVOLVED!

━━━━━━━━━━━━━━━

🧬 Before:
${oldName}

⬇️

🧬 After:
${pokemon.name}

━━━━━━━━━━━━━━━

📈 New Level:
${pokemon.level}

❤️ HP:
${pokemon.hp}

⚔️ Attack:
${pokemon.attack}

🛡️ Defense:
${pokemon.defense}

🏃 Speed:
${pokemon.speed}

━━━━━━━━━━━━━━━

🧾 Used:
${usedItem}

🔥 Your Pokémon became stronger!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to evolve Pokémon."
			);
		}
	}
};