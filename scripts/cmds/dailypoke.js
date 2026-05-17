const {
	getPokemonData
} = require("./pokemonUtils");

function random(min, max) {

	return Math.floor(
		Math.random() *
			(max - min + 1)
	) + min;
}

module.exports = {
	config: {
		name: "dailypoke",

		aliases: [
			"pdaily",
			"dailypokemon",
			"daily"
		],

		version: "4.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"Daily Pokémon rewards",

		longDescription:
			"Claim daily Pokémon rewards",

		category: "pokemon",

		guide: {
			en: `
╭─ DAILYPOKE GUIDE ─╮

🎁 Commands:

• dailypoke
• pdaily
• daily

━━━━━━━━━━━━━━━

🏆 Daily Rewards:

• Coins
• Pokéballs
• Potions
• Rare Items
• Rare Candy Chance

━━━━━━━━━━━━━━━

⏰ Cooldown:
24 Hours

━━━━━━━━━━━━━━━

💡 Tips:

• Daily claim miss koro na 😹
• Rare rewards pawa jay
• Coins collect koro

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		usersData
	}) {

		try {

			const userData =
				await getPokemonData(
					usersData,
					event.senderID
				);

			const pokeData =
				userData.pokemonData;

			const now =
				Date.now();

			const cooldown =
				86400000;

			const lastDaily =
				pokeData.lastDaily || 0;

			// COOLDOWN CHECK

			if (
				now - lastDaily <
				cooldown
			) {

				const remaining =
					cooldown -
					(now - lastDaily);

				const hours =
					Math.floor(
						remaining /
							3600000
					);

				const minutes =
					Math.floor(
						(
							remaining %
							3600000
						) / 60000
					);

				return message.reply(
`⏳ Daily reward already claimed.

🕒 Come back in:
${hours}h ${minutes}m`
				);
			}

			// REWARDS

			const coins =
				random(500, 2500);

			const pokeball =
				random(1, 5);

			const potion =
				random(1, 3);

			const greatballChance =
				Math.random() < 0.35;

			const rareCandyChance =
				Math.random() < 0.15;

			// ADD COINS

			pokeData.coins +=
				coins;

			// ITEMS INIT

			if (!pokeData.items)
				pokeData.items = {};

			// POKEBALL

			if (
				!pokeData.items
					.pokeball
			) {

				pokeData.items
					.pokeball = 0;
			}

			pokeData.items
				.pokeball +=
				pokeball;

			// POTION

			if (
				!pokeData.items
					.potion
			) {

				pokeData.items
					.potion = 0;
			}

			pokeData.items
				.potion +=
				potion;

			// GREATBALL BONUS

			let bonusText =
				"";

			if (
				greatballChance
			) {

				if (
					!pokeData.items
						.greatball
				) {

					pokeData.items
						.greatball = 0;
				}

				pokeData.items
					.greatball += 1;

				bonusText +=
`
🔵 Greatball:
1`;
			}

			// RARE CANDY BONUS

			if (
				rareCandyChance
			) {

				if (
					!pokeData.items
						.rarecandy
				) {

					pokeData.items
						.rarecandy = 0;
				}

				pokeData.items
					.rarecandy += 1;

				bonusText +=
`
🍬 Rare Candy:
1`;
			}

			// SAVE TIME

			pokeData.lastDaily =
				now;

			// SAVE MONGO

			await usersData.set(
				event.senderID,
				{
					pokemonData:
						pokeData
				}
			);

			message.reply(
`🎁 DAILY POKÉMON REWARD

━━━━━━━━━━━━━━━

💰 Coins:
${coins}

🔴 Pokéball:
${pokeball}

💊 Potion:
${potion}

${bonusText}

━━━━━━━━━━━━━━━

🔥 Come back tomorrow
for more rewards!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to claim daily reward."
			);
		}
	}
};