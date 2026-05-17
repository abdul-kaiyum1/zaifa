const {
	getPokemonUser,
	savePokemonUser
} = require("./pokemonMongo");

function random(min, max) {

	return Math.floor(
		Math.random() *
			(max - min + 1)
	) + min;
}

module.exports = {
	config: {
		name: "dailypoke",

		version: "7.0",

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

🎁 Command:
• dailypoke

━━━━━━━━━━━━━━━

🏆 Daily Rewards:

• Coins
• Pokéballs
• Potions
• Rare Candy Chance
• Gems Chance

━━━━━━━━━━━━━━━

⏰ Cooldown:
24 Hours

━━━━━━━━━━━━━━━

💡 Tips:

• Daily claim miss koiro na 😹
• Rare rewards paita paro

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event
	}) {

		try {

			// USER DATA

			const userData =
				await getPokemonUser(
					event.senderID
				);

			// FIX ITEMS

			if (!userData.items) {

				userData.items = {};
			}

			// TIME

			const now =
				Date.now();

			const cooldown =
				24 * 60 * 60 * 1000;

			const lastClaim =
				userData.lastDaily || 0;

			// COOLDOWN CHECK

			if (
				now - lastClaim <
				cooldown
			) {

				const remaining =

					cooldown -
					(now - lastClaim);

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
`⏰ You already claimed daily reward.

🕒 Come back in:
${hours}h ${minutes}m`
				);
			}

			// REWARDS

			const coins =
				random(
					2000,
					6000
				);

			const pokeballs =
				random(3, 10);

			const potions =
				random(1, 4);

			// ADD COINS

			userData.coins +=
				coins;

			// INIT ITEMS

			if (
				!userData.items
					.pokeball
			)
				userData.items.pokeball =
					0;

			if (
				!userData.items
					.potion
			)
				userData.items.potion =
					0;

			if (
				!userData.items
					.rarecandy
			)
				userData.items.rarecandy =
					0;

			// ADD ITEMS

			userData.items.pokeball +=
				pokeballs;

			userData.items.potion +=
				potions;

			// BONUS REWARDS

			let bonus =
				"";

			// RARE CANDY

			if (
				Math.random() <
				0.25
			) {

				const rareCandy =
					random(1, 2);

				userData.items.rarecandy +=
					rareCandy;

				bonus +=
`
🍬 Rare Candy:
${rareCandy}`;
			}

			// GEMS

			if (
				Math.random() <
				0.15
			) {

				const gems =
					random(5, 15);

				if (
					!userData.gems
				)
					userData.gems = 0;

				userData.gems +=
					gems;

				bonus +=
`
💎 Gems:
${gems}`;
			}

			// SAVE TIME

			userData.lastDaily =
				now;

			// SAVE

			await savePokemonUser(
				event.senderID,
				userData
			);

			// SUCCESS

			message.reply(
`🎁 DAILY REWARD CLAIMED!

━━━━━━━━━━━━━━━

💰 Coins:
${coins}

🔴 Pokéballs:
${pokeballs}

🧪 Potions:
${potions}

${bonus}

━━━━━━━━━━━━━━━

⏰ Next claim:
24 hours

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