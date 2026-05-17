const axios = require("axios");

const {
	getPokemonData
} = require("./pokemonUtils");

const {
	getRarity
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

		aliases: [
			"huntpokemon",
			"phunt"
		],

		version: "5.0",

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

🎯 Start Hunt:
• pokehunt

━━━━━━━━━━━━━━━

🎮 How To Play:

Bot Pokémon image dibe.
Pokemon er naam reply dite hobe.

━━━━━━━━━━━━━━━

🏆 Rewards:

• Pokémon Catch
• Coins
• XP
• Rare Pokémon

━━━━━━━━━━━━━━━

✨ Features:

• Shiny Pokémon
• Rarity System
• MongoDB Save
• Pokédex Save

━━━━━━━━━━━━━━━

💡 Tips:

• Fast answer dao 😹
• Shiny Pokémon ultra rare
• Legendary Pokémon collect koro

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event
	}) {

		try {

			// CHECK ACTIVE HUNT

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

			// SHINY SYSTEM

			const shiny =
				Math.random() <
				0.02;

			// RARITY SYSTEM

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

			// RARITY BONUS

			if (
				rarity ===
				"rare"
			)
				reward += 300;

			else if (
				rarity ===
				"epic"
			)
				reward += 700;

			else if (
				rarity ===
				"legendary"
			)
				reward += 1500;

			else if (
				rarity ===
				"mythical"
			)
				reward += 3000;

			// SHINY BONUS

			if (shiny)
				reward += 2000;

			// STORE HUNT

			activeHunts.set(
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

			// SEND HUNT

			const msg =
				await message.reply({
					body:
`🎯 POKÉMON HUNT STARTED!

━━━━━━━━━━━━━━━

🧩 Guess Pokémon name!

⭐ Rarity:
${rarity.toUpperCase()}

💰 Reward:
${reward} coins

${shiny ? "✨ SHINY POKÉMON!" : ""}

━━━━━━━━━━━━━━━

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
				"❌ Failed to start Pokémon hunt."
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
			)
				return;

			// REMOVE ACTIVE HUNT

			activeHunts.delete(
				Reply.threadID
			);

			// GET USER DATA

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

			// SAVE TO MONGO

			await usersData.set(
				event.senderID,
				{
					pokemonData:
						userData.pokemonData
				}
			);

			// SUCCESS MESSAGE

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