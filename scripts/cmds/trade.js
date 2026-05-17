const {
	getPokemonData
} = require("./pokemonUtils");

const activeTrades =
	global.activeTrades ||
	new Map();

global.activeTrades =
	activeTrades;

module.exports = {
	config: {
		name: "trade",

		aliases: [
			"poketrade",
			"ptrade"
		],

		version: "5.0",

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

🤝 Start Trade:
• trade @user pokemonName

📌 Example:
trade @kaiyum pikachu

━━━━━━━━━━━━━━━

🎮 Trade System:

• User must accept
• Pokémon transfers safely
• MongoDB auto saves

━━━━━━━━━━━━━━━

✅ Reply Commands:

• accept
• decline

━━━━━━━━━━━━━━━

💡 Tips:

• Rare Pokémon trade koro 😹
• Scammer nai ekhane
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

			// MENTION

			const target =
				Object.keys(
					event.mentions
				)[0];

			if (!target) {

				return message.reply(
					"❌ | Mention a user."
				);
			}

			if (
				target ===
				event.senderID
			) {

				return message.reply(
					"❌ | You can't trade with yourself."
				);
			}

			// POKEMON NAME

			const pokemonName =
				args
					.slice(1)
					.join(" ")
					.toLowerCase();

			if (!pokemonName) {

				return message.reply(
					"❌ | Enter Pokémon name."
				);
			}

			// USER DATA

			const senderData =
				await getPokemonData(
					usersData,
					event.senderID
				);

			const senderPoke =
				senderData
					.pokemonData
					.pokemons
					.find(
						p =>
							p.name.toLowerCase() ===
							pokemonName
					);

			// NOT FOUND

			if (!senderPoke) {

				return message.reply(
					"❌ | Pokémon not found."
				);
			}

			// ACTIVE TRADE CHECK

			if (
				activeTrades.has(
					target
				)
			) {

				return message.reply(
					"❌ | User already has active trade."
				);
			}

			// CREATE TRADE

			activeTrades.set(
				target,
				{
					from:
						event.senderID,

					to:
						target,

					pokemon:
						senderPoke
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
${senderPoke.name}

⭐ Rarity:
${senderPoke.rarity.toUpperCase()}

✨ Shiny:
${senderPoke.shiny ? "YES" : "NO"}

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

			// ONLY TARGET CAN REPLY

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

			// USER DATA

			const senderData =
				await getPokemonData(
					usersData,
					trade.from
				);

			const receiverData =
				await getPokemonData(
					usersData,
					trade.to
				);

			// FIND POKEMON

			const pokeIndex =
				senderData
					.pokemonData
					.pokemons
					.findIndex(
						p =>
							p.name ===
							trade.pokemon.name
					);

			// MISSING

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

			// REMOVE FROM SENDER

			const tradedPokemon =

				senderData
					.pokemonData
					.pokemons.splice(
						pokeIndex,
						1
					)[0];

			// ADD TO RECEIVER

			receiverData
				.pokemonData
				.pokemons.push(
					tradedPokemon
				);

			// POKEDEX UPDATE

			if (
				!receiverData
					.pokemonData
					.pokedex.includes(
						tradedPokemon.name.toLowerCase()
					)
			) {

				receiverData
					.pokemonData
					.pokedex.push(
						tradedPokemon.name.toLowerCase()
					);
			}

			// SAVE SENDER

			await usersData.set(
				trade.from,
				{
					pokemonData:
						senderData.pokemonData
				}
			);

			// SAVE RECEIVER

			await usersData.set(
				trade.to,
				{
					pokemonData:
						receiverData.pokemonData
				}
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