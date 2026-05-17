const axios = require("axios");

const {
	getPokemonData
} = require("./pokemonUtils");

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

		aliases: [
			"shunt",
			"huntshiny"
		],

		version: "5.0",

		author: "Abdul Kaiyum",

		countDown: 30,

		role: 0,

		shortDescription:
			"Hunt shiny Pokémon",

		longDescription:
			"Catch ultra rare shiny Pokémon",

		category: "pokemon",

		guide: {
			en: `
╭─ SHINYHUNT GUIDE ─╮

✨ Start Hunt:
• shinyhunt

━━━━━━━━━━━━━━━

🎮 How To Play:

Bot shiny pokemon image dibe.
Pokemon er naam reply dite hobe.

━━━━━━━━━━━━━━━

🏆 Rewards:

• Shiny Pokémon
• Huge Coins
• XP
• Rare Pokémon

━━━━━━━━━━━━━━━

✨ Features:

• Ultra Rare Pokémon
• MongoDB Save
• Rarity System
• Pokédex Save

━━━━━━━━━━━━━━━

💡 Tips:

• Fast answer dao 😹
• Shiny Pokémon very rare
• Legendary shiny ultra rare

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event
	}) {

		try {

			// ACTIVE CHECK

			if (
				activeShinyHunts.has(
					event.threadID
				)
			) {

				return message.reply(
					"❌ | A shiny hunt is already running."
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

			// STORE HUNT

			activeShinyHunts.set(
				event.threadID,
				{
					pokemonName,

					reward,

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

			// START MESSAGE

			const msg =
				await message.reply({
					body:
`✨ SHINY POKÉMON APPEARED!

━━━━━━━━━━━━━━━

${rarityEmoji} Rarity:
${rarity.toUpperCase()}

💰 Reward:
${reward} coins

⚡ ULTRA RARE EVENT ⚡

━━━━━━━━━━━━━━━

🎯 Guess Pokémon name!

Reply with Pokémon name!`,

					attachment:
						await global.utils.getStreamFromURL(
							image
						)
				});

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
			)
				return;

			// REMOVE HUNT

			activeShinyHunts.delete(
				Reply.threadID
			);

			// USER DATA

			const userData =
				await getPokemonData(
					usersData,
					event.senderID
				);

			// ADD COINS

			userData.pokemonData.coins +=
				hunt.reward;

			// ADD POKEMON

			userData.pokemonData.pokemons.push(
				hunt.pokemonData
			);

			// ADD POKEDEX

			if (
				!userData
					.pokemonData
					.pokedex.includes(
						hunt.pokemonName
					)
			) {

				userData.pokemonData.pokedex.push(
					hunt.pokemonName
				);
			}

			// SAVE MONGO

			await usersData.set(
				event.senderID,
				{
					pokemonData:
						userData.pokemonData
				}
			);

			// SUCCESS MESSAGE

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