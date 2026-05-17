const axios = require("axios");

const {
	getPokemonUser,
	savePokemonUser
} = require("./pokemonMongo");

const {
	getRarity,
	getRarityReward
} = require("./rarity");

const activeHunts =
	global.activeHunts ||
	new Map();

global.activeHunts =
	activeHunts;

function random(min, max) {

	return Math.floor(
		Math.random() *
			(max - min + 1)
	) + min;
}

module.exports = {
	config: {
		name: "pokehunt",

		version: "7.0",

		author: "Abdul Kaiyum",

		countDown: 15,

		role: 0,

		shortDescription:
			"Hunt Pokémon",

		longDescription:
			"Catch random Pokémon",

		category: "pokemon",

		guide: {
			en: `
╭─ POKEHUNT GUIDE ─╮

🎯 Command:
• pokehunt

━━━━━━━━━━━━━━━

🎮 How To Play:

Bot Pokémon image dibe.
60 second er moddhe
Pokemon er naam reply dite hobe.

━━━━━━━━━━━━━━━

⚠️ Rules:

• Wrong answer auto unsend
• 60 sec time limit
• First correct answer wins

━━━━━━━━━━━━━━━

🏆 Rewards:

• Pokémon Catch
• Coins
• Rare Pokémon
• Shiny Pokémon

━━━━━━━━━━━━━━━

💡 Tips:

• Fast answer dao 😹
• Legendary Pokémon rare
• Shiny Pokémon ultra rare

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		api
	}) {

		try {

			// ACTIVE CHECK

			if (
				activeHunts.has(
					event.threadID
				)
			) {

				return message.reply(
					"❌ | A Pokémon hunt is already running."
				);
			}

			// RANDOM POKEMON

			const randomId =
				random(1, 649);

			const res =
				await axios.get(
					`https://pokeapi.co/api/v2/pokemon/${randomId}`
				);

			const data =
				res.data;

			const pokemonName =
				data.name.toLowerCase();

			// SHINY

			const shiny =
				Math.random() <
				0.02;

			// RARITY

			const rarity =
				getRarity();

			// IMAGE

			const image =
				shiny
					? data.sprites
							.front_shiny
					: data.sprites
							.front_default;

			// REWARD

			let reward =
				random(300, 900);

			reward +=
				getRarityReward(
					rarity
				);

			if (shiny)
				reward += 2000;

			// SAVE HUNT

			activeHunts.set(
				event.threadID,
				{
					pokemonName,

					reward,

					startedBy:
						event.senderID,

					timeout: null,

					pokemonData: {

						name:
							data.name,

						level: 1,

						xp: 0,

						hp:
							data.stats[0]
								.base_stat,

						attack:
							data.stats[1]
								.base_stat,

						defense:
							data.stats[2]
								.base_stat,

						speed:
							data.stats[5]
								.base_stat,

						image,

						shiny,

						rarity,

						types:
							data.types.map(
								x =>
									x.type.name
							)
					}
				}
			);

			// SEND MESSAGE

			const msg =
				await message.reply({
					body:
`🎯 POKÉMON HUNT STARTED!

━━━━━━━━━━━━━━━

⭐ Rarity:
${rarity.toUpperCase()}

💰 Reward:
${reward} coins

${shiny ? "✨ SHINY POKÉMON!" : ""}

⏰ Time Limit:
60 seconds

━━━━━━━━━━━━━━━

🎮 Reply with Pokémon name!`,

					attachment:
						await global.utils.getStreamFromURL(
							image
						)
				});

			// AUTO END AFTER 60 SEC

			const timeout =
				setTimeout(
					async () => {

						const stillActive =
							activeHunts.get(
								event.threadID
							);

						if (
							!stillActive
						)
							return;

						activeHunts.delete(
							event.threadID
						);

						message.reply(
`⏰ TIME OVER!

❌ Nobody guessed the Pokémon.

🧬 Pokémon was:
${pokemonName}`
						);

					},
					60000
				);

			activeHunts.get(
				event.threadID
			).timeout = timeout;

			// REPLY SYSTEM

			global.GoatBot.onReply.set(
				msg.messageID,
				{
					commandName:
						this.config.name,

					threadID:
						event.threadID
				}
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to start Pokémon hunt."
			);
		}
	},

	onReply: async function ({
		message,
		event,
		Reply,
		api,
		usersData
	}) {

		try {

			const hunt =
				activeHunts.get(
					Reply.threadID
				);

			if (!hunt)
				return;

			const answer =
				event.body
					.toLowerCase()
					.trim();

			// WRONG ANSWER

			if (
				answer !==
				hunt.pokemonName
			) {

				// UNSEND WRONG MESSAGE

				api.unsendMessage(
					event.messageID
				);

				return;
			}

			// STOP TIMEOUT

			clearTimeout(
				hunt.timeout
			);

			// REMOVE ACTIVE HUNT

			activeHunts.delete(
				Reply.threadID
			);

			// GET USER

			const userData =
				await getPokemonUser(
					event.senderID
				);

			// FIX ARRAYS

			if (
				!Array.isArray(
					userData.pokemons
				)
			) {

				userData.pokemons =
					[];
			}

			if (
				!Array.isArray(
					userData.pokedex
				)
			) {

				userData.pokedex =
					[];
			}

			// ADD COINS

			userData.coins +=
				hunt.reward;

			// ADD POKEMON

			userData.pokemons.push(
				hunt.pokemonData
			);

			// ADD DEX

			if (
				!userData.pokedex.includes(
					hunt.pokemonName
				)
			) {

				userData.pokedex.push(
					hunt.pokemonName
				);
			}

			// SAVE

			await savePokemonUser(
				event.senderID,
				userData
			);

			// SUCCESS

			message.reply(
`🎉 POKÉMON CAUGHT!

━━━━━━━━━━━━━━━

👤 Trainer:
${await usersData.getName(
	event.senderID
)}

🧬 Pokémon:
${hunt.pokemonData.name}

⭐ Rarity:
${hunt.pokemonData.rarity.toUpperCase()}

✨ Shiny:
${hunt.pokemonData.shiny ? "YES" : "NO"}

💰 Reward:
${hunt.reward} coins

━━━━━━━━━━━━━━━

🔥 Pokémon added to your collection!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to catch Pokémon."
			);
		}
	}
};