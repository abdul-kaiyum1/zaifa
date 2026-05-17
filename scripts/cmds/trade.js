const {
	getPokemonUser,
	savePokemonUser
} = require("./pokemonMongo");

const activeTrades =
	global.activeTrades ||
	new Map();

global.activeTrades =
	activeTrades;

module.exports = {
	config: {
		name: "trade",

		version: "7.0",

		author: "Abdul Kaiyum",

		countDown: 10,

		role: 0,

		shortDescription:
			"Trade Pokémon",

		longDescription:
			"Trade Pokémon with other users",

		category: "pokemon",

		guide: {
			en: `
╭─ TRADE GUIDE ─╮

🤝 Command:
• trade @user pokemonNumber

━━━━━━━━━━━━━━━

📌 Example:

trade @kaiyum 1

━━━━━━━━━━━━━━━

🎮 How It Works:

• Mention user
• Give Pokémon number
• User accepts or declines

━━━━━━━━━━━━━━━

✅ Reply Commands:

• accept
• decline

━━━━━━━━━━━━━━━

💡 Tips:

• Rare Pokémon trade koro 😹
• Safe trade system

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

			// TARGET

			const target =
				Object.keys(
					event.mentions
				)[0];

			if (!target) {

				return message.reply(
					"❌ Mention a user."
				);
			}

			if (
				target ===
				event.senderID
			) {

				return message.reply(
					"❌ You can't trade with yourself."
				);
			}

			// NUMBER

			const number =
				parseInt(
					args[1]
				);

			if (
				isNaN(number)
			) {

				return message.reply(
					"❌ Enter Pokémon number."
				);
			}

			// USER DATA

			const senderData =
				await getPokemonUser(
					event.senderID
				);

			const pokemons =
				senderData.pokemons || [];

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

			const selected =
				sorted[number - 1];

			// INVALID NUMBER

			if (!selected) {

				return message.reply(
					"❌ Invalid Pokémon number."
				);
			}

			// ACTIVE TRADE

			if (
				activeTrades.has(
					target
				)
			) {

				return message.reply(
					"❌ User already has active trade."
				);
			}

			// SAVE TRADE

			activeTrades.set(
				target,
				{
					from:
						event.senderID,

					to:
						target,

					pokemon:
						selected
				}
			);

			// SEND REQUEST

			const msg =
				await message.reply(
`🤝 POKÉMON TRADE REQUEST

━━━━━━━━━━━━━━━

👤 From:
${await usersData.getName(
	event.senderID
)}

🧬 Pokémon:
${selected.name}

⭐ Rarity:
${selected.rarity.toUpperCase()}

✨ Shiny:
${selected.shiny ? "YES" : "NO"}

📈 Level:
${selected.level}

━━━━━━━━━━━━━━━

Reply:
accept
OR
decline`
				);

			global.GoatBot.onReply.set(
				msg.messageID,
				{
					commandName:
						this.config.name,

					target
				}
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to create trade."
			);
		}
	},

	onReply: async function ({
		message,
		event,
		Reply,
		usersData
	}) {

		try {

			// TARGET CHECK

			if (
				event.senderID !==
				Reply.target
			)
				return;

			const trade =
				activeTrades.get(
					event.senderID
				);

			if (!trade)
				return;

			const answer =
				event.body
					.toLowerCase()
					.trim();

			// DECLINE

			if (
				answer ===
				"decline"
			) {

				activeTrades.delete(
					event.senderID
				);

				return message.reply(
					"❌ Trade declined."
				);
			}

			// INVALID

			if (
				answer !==
				"accept"
			) {

				return message.reply(
					"❌ Reply with accept or decline."
				);
			}

			// GET USERS

			const senderData =
				await getPokemonUser(
					trade.from
				);

			const receiverData =
				await getPokemonUser(
					trade.to
				);

			// FIND POKEMON

			const pokeIndex =
				senderData.pokemons.findIndex(
					p =>
						p.name ===
							trade.pokemon.name &&

						p.level ===
							trade.pokemon.level &&

						p.shiny ===
							trade.pokemon.shiny
				);

			// NOT FOUND

			if (
				pokeIndex === -1
			) {

				activeTrades.delete(
					event.senderID
				);

				return message.reply(
					"❌ Pokémon no longer exists."
				);
			}

			// REMOVE

			const tradedPokemon =

				senderData.pokemons.splice(
					pokeIndex,
					1
				)[0];

			// INIT RECEIVER

			if (
				!Array.isArray(
					receiverData.pokemons
				)
			) {

				receiverData.pokemons =
					[];
			}

			if (
				!Array.isArray(
					receiverData.pokedex
				)
			) {

				receiverData.pokedex =
					[];
			}

			// ADD

			receiverData.pokemons.push(
				tradedPokemon
			);

			// DEX

			if (
				!receiverData.pokedex.includes(
					tradedPokemon.name.toLowerCase()
				)
			) {

				receiverData.pokedex.push(
					tradedPokemon.name.toLowerCase()
				);
			}

			// SAVE BOTH

			await savePokemonUser(
				trade.from,
				senderData
			);

			await savePokemonUser(
				trade.to,
				receiverData
			);

			// REMOVE TRADE

			activeTrades.delete(
				event.senderID
			);

			// SUCCESS

			message.reply(
`🤝 TRADE COMPLETED!

━━━━━━━━━━━━━━━

👤 Sender:
${await usersData.getName(
	trade.from
)}

👤 Receiver:
${await usersData.getName(
	trade.to
)}

━━━━━━━━━━━━━━━

🧬 Pokémon:
${tradedPokemon.name}

⭐ Rarity:
${tradedPokemon.rarity.toUpperCase()}

✨ Shiny:
${tradedPokemon.shiny ? "YES" : "NO"}

📈 Level:
${tradedPokemon.level}

━━━━━━━━━━━━━━━

🔥 Pokémon transferred successfully!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Trade failed."
			);
		}
	}
};