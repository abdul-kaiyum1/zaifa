const {
	getPokemonData
} = require("./pokemonUtils");

module.exports = {
	config: {
		name: "bag",

		aliases: [
			"inventory",
			"items",
			"pokebag"
		],

		version: "4.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"View Pokémon inventory",

		longDescription:
			"Check your Pokémon items and inventory",

		category: "pokemon",

		guide: {
			en: `
╭─ BAG GUIDE ─╮

🎒 Commands:

• bag
• inventory
• pokebag

━━━━━━━━━━━━━━━

📦 Shows:

• Pokéballs
• Potions
• Rare Candies
• Battle Items

━━━━━━━━━━━━━━━

🛒 Buy Items:
• shop

━━━━━━━━━━━━━━━

💡 Tips:

• Better balls = better catch
• Potion HP heal kore
• Rare candy level up dey

╰────────────────╯`
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

			const items =
				userData
					.pokemonData
					.items || {};

			const coins =
				userData
					.pokemonData
					.coins || 0;

			const totalItems =
				Object.values(items)
					.reduce(
						(a, b) =>
							a + b,
						0
					);

			const pokeball =
				items.pokeball || 0;

			const greatball =
				items.greatball || 0;

			const ultraball =
				items.ultraball || 0;

			const masterball =
				items.masterball || 0;

			const potion =
				items.potion || 0;

			const superpotion =
				items.superpotion || 0;

			const rarecandy =
				items.rarecandy || 0;

			message.reply(
`🎒 YOUR POKÉMON BAG

━━━━━━━━━━━━━━━

👤 Trainer:
${await usersData.getName(
	event.senderID
)}

💰 Coins:
${coins}

📦 Total Items:
${totalItems}

━━━━━━━━━━━━━━━

🔴 Pokéball:
${pokeball}

🔵 Greatball:
${greatball}

⚫ Ultraball:
${ultraball}

🟣 Masterball:
${masterball}

━━━━━━━━━━━━━━━

💊 Potion:
${potion}

🧪 Super Potion:
${superpotion}

🍬 Rare Candy:
${rarecandy}

━━━━━━━━━━━━━━━

🛒 Buy More:
shop

🔥 Become stronger trainer!`
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to load bag."
			);
		}
	}
};