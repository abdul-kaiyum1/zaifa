const {
	getPokemonUser
} = require("./pokemonMongo");

const {
	getRarityEmoji
} = require("./rarity");

module.exports = {
	config: {
		name: "mypokemon",

		version: "7.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"View your Pokémon",

		longDescription:
			"Interactive Pokémon collection viewer",

		category: "pokemon",

		guide: {
			en: `
╭─ MYPOKEMON GUIDE ─╮

📘 Command:
• mypokemon

━━━━━━━━━━━━━━━

🎮 How It Works:

Bot tomr Pokémon list dibe.

Tarpor:
number reply korle
oi Pokémon er full details dekhabe.

━━━━━━━━━━━━━━━

📌 Example:

1
2
3

━━━━━━━━━━━━━━━

💡 Tips:

• Strong Pokémon dekho
• Shiny Pokémon collect koro 😹

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		usersData
	}) {

		try {

			// GET USER

			const userData =
				await getPokemonUser(
					event.senderID
				);

			const pokemons =
				userData.pokemons || [];

			// NO POKEMON

			if (!pokemons.length) {

				return message.reply(
`❌ You don't have any Pokémon yet.

🎯 Use:
pokehunt`
				);
			}

			// SORT

			const sorted =
				[...pokemons].sort(
					(a, b) =>
						b.level -
						a.level
				);

			// MESSAGE

			let msg =
`📘 YOUR POKÉMON

━━━━━━━━━━━━━━━

👤 Trainer:
${await usersData.getName(
	event.senderID
)}

🧬 Total Pokémon:
${sorted.length}

━━━━━━━━━━━━━━━
`;

			for (
				let i = 0;
				i < sorted.length;
				i++
			) {

				const p =
					sorted[i];

				msg +=
`
${i + 1}. ${
	getRarityEmoji(
		p.rarity
	)
} ${p.shiny ? "✨" : ""}${p.name}
`;
			}

			msg +=
`
━━━━━━━━━━━━━━━

🎮 Reply with Pokémon number
to see details.`;

			const sent =
				await message.reply(
					msg
				);

			// REPLY SYSTEM

			global.GoatBot.onReply.set(
				sent.messageID,
				{
					commandName:
						this.config.name,

					author:
						event.senderID,

					pokemons:
						sorted
				}
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to load Pokémon."
			);
		}
	},

	onReply: async function ({
		message,
		event,
		Reply
	}) {

		try {

			// AUTHOR CHECK

			if (
				event.senderID !==
				Reply.author
			)
				return;

			const number =
				parseInt(
					event.body
				);

			// INVALID

			if (
				isNaN(number)
			) {

				return message.reply(
					"❌ Reply with a Pokémon number."
				);
			}

			const pokemons =
				Reply.pokemons;

			const pokemon =
				pokemons[
					number - 1
				];

			// NOT FOUND

			if (!pokemon) {

				return message.reply(
					"❌ Invalid Pokémon number."
				);
			}

			// SEND DETAILS

			message.reply({
				body:
`🧬 POKÉMON DETAILS

━━━━━━━━━━━━━━━

${getRarityEmoji(
	pokemon.rarity
)} ${pokemon.shiny ? "✨" : ""}
${pokemon.name}

⭐ Rarity:
${pokemon.rarity.toUpperCase()}

📈 Level:
${pokemon.level}

✨ XP:
${pokemon.xp || 0}/100

━━━━━━━━━━━━━━━

❤️ HP:
${pokemon.hp}

⚔️ Attack:
${pokemon.attack}

🛡️ Defense:
${pokemon.defense}

🏃 Speed:
${pokemon.speed}

━━━━━━━━━━━━━━━

🌿 Types:
${pokemon.types.join(", ")}

✨ Shiny:
${pokemon.shiny ? "YES" : "NO"}

━━━━━━━━━━━━━━━

🔥 Powerful Pokémon!`,

				attachment:
					await global.utils.getStreamFromURL(
						pokemon.image
					)
			});

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to show Pokémon details."
			);
		}
	}
};