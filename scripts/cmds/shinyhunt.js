const axios = require("axios");

const {
	getPokemonUser,
	savePokemonUser
} = require("./pokemonMongo");

const {
	getRarity,
	getRarityReward,
	getRarityEmoji
} = require("./rarity");

const activeShinyHunts =
	global.activeShinyHunts ||
	new Map();

global.activeShinyHunts =
	activeShinyHunts;

function random(min, max) {

	return Math.floor(
		Math.random() *
			(max - min + 1)
	) + min;
}

module.exports = {
	config: {
		name: "shinyhunt",

		version: "7.0",

		author: "Abdul Kaiyum",

		countDown: 20,

		role: 0,

		shortDescription:
			"Hunt shiny Pokémon",

		longDescription:
			"Catch ultra rare shiny Pokémon",

		category: "pokemon",

		guide: {
			en: `
╭─ SHINYHUNT GUIDE ─╮

✨ Command:
• shinyhunt

━━━━━━━━━━━━━━━

🎮 How To Play:

Bot shiny Pokémon image dibe.
60 second er moddhe
Pokémon er naam reply dite hobe.

━━━━━━━━━━━━━━━

⚠️ Rules:

• Wrong answer auto unsend
• 60 second limit
• First correct answer wins

━━━━━━━━━━━━━━━

🏆 Rewards:

• Shiny Pokémon
• Huge Coins
• Rare Pokémon

━━━━━━━━━━━━━━━

💡 Tips:

• Fast answer dao 😹
• Shiny Pokémon ultra rare
• Legendary shiny insane rare

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
				activeShinyHunts.has(
					event.threadID
				)
			) {

				return message.reply(
					"❌ A shiny hunt is already running."
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

			// SHINY ALWAYS TRUE

			const shiny =
				true;

			// RARITY

			const rarity =
				getRarity();

			const rarityEmoji =
				getRarityEmoji(
					rarity
				);

			// IMAGE

			const image =
				data.sprites
					.front_shiny ||

				data.sprites
					.front_default;

			// REWARD

			let reward =
				random(
					2500,
					6000
				);

			reward +=
				getRarityReward(
					rarity
				);

			// SAVE HUNT

			activeShinyHunts.set(
				event.threadID,
				{
					pokemonName,

					reward,

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
`✨ SHINY POKÉMON APPEARED!

━━━━━━━━━━━━━━━

${rarityEmoji} Rarity:
${rarity.toUpperCase()}

💰 Reward:
${reward} coins

⏰ Time Limit:
60 seconds

⚡ ULTRA RARE EVENT ⚡

━━━━━━━━━━━━━━━

🎮 Reply with Pokémon name!`,

					attachment:
						await global.utils.getStreamFromURL(
							image
						)
				});

			// TIMEOUT

			const timeout =
				setTimeout(
					async () => {

						const stillActive =
							activeShinyHunts.get(
								event.threadID
							);

						if (
							!stillActive
						)
							return;

						activeShinyHunts.delete(
							event.threadID
						);

						message.reply(
`⏰ TIME OVER!

❌ Nobody guessed the shiny Pokémon.

🧬 Pokémon was:
${pokemonName}`
						);

					},
					60000
				);

			activeShinyHunts.get(
				event.threadID
			).timeout = timeout;

			// REPLY

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
				"❌ Failed to start shiny hunt."
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
				activeShinyHunts.get(
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

				api.unsendMessage(
					event.messageID
				);

				return;
			}

			// STOP TIMEOUT

			clearTimeout(
				hunt.timeout
			);

			// REMOVE HUNT

			activeShinyHunts.delete(
				Reply.threadID
			);

			// USER DATA

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
`✨ SHINY POKÉMON CAUGHT!

━━━━━━━━━━━━━━━

👤 Trainer:
${await usersData.getName(
	event.senderID
)}

🧬 Pokémon:
${hunt.pokemonData.name}

${getRarityEmoji(
	hunt.pokemonData.rarity
)} Rarity:
${hunt.pokemonData.rarity.toUpperCase()}

✨ Type:
SHINY

💰 Reward:
${hunt.reward} coins

━━━━━━━━━━━━━━━

🔥 Ultra rare Pokémon
added to your collection!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to catch shiny Pokémon."
			);
		}
	}
};