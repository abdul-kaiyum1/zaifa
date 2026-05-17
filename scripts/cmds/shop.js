const {
	getPokemonUser,
	savePokemonUser
} = require("./pokemonMongo");

const shopItems = {

	pokeball: {
		name: "Pokéball",
		price: 100,
		description:
			"Basic catch ball"
	},

	greatball: {
		name: "Greatball",
		price: 350,
		description:
			"Better catch chance"
	},

	ultraball: {
		name: "Ultraball",
		price: 700,
		description:
			"High catch chance"
	},

	masterball: {
		name: "Masterball",
		price: 5000,
		description:
			"Guaranteed catch"
	},

	potion: {
		name: "Potion",
		price: 250,
		description:
			"Heal Pokémon HP"
	},

	superpotion: {
		name: "Super Potion",
		price: 600,
		description:
			"Big HP heal"
	},

	rarecandy: {
		name: "Rare Candy",
		price: 2000,
		description:
			"Instant level up"
	}
};

module.exports = {
	config: {
		name: "shop",

		version: "7.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"Pokémon item shop",

		longDescription:
			"Buy Pokémon items",

		category: "pokemon",

		guide: {
			en: `
╭─ SHOP GUIDE ─╮

🛒 Commands:

• shop
• shop buy item amount

━━━━━━━━━━━━━━━

📌 Example:

shop buy pokeball 5

━━━━━━━━━━━━━━━

🎮 Available Items:

• pokeball
• greatball
• ultraball
• masterball
• potion
• superpotion
• rarecandy

━━━━━━━━━━━━━━━

💡 Tips:

• Better balls = better catch
• Potion heal dey 😹
• Rare candy level up kore

╰────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		args
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

			// SHOW SHOP

			if (!args[0]) {

				let msg =
`🛒 POKÉMON SHOP

━━━━━━━━━━━━━━━

💰 Your Coins:
${userData.coins || 0}

━━━━━━━━━━━━━━━
`;

				for (const key in shopItems) {

					const item =
						shopItems[key];

					const owned =
						userData.items[
							key
						] || 0;

					msg +=
`
🧾 ${item.name}

💵 Price:
${item.price}

📦 You Own:
${owned}

📖 ${item.description}

━━━━━━━━━━━━━━━`;
				}

				msg +=
`

🛍️ Example:
shop buy pokeball 5`;

				return message.reply(
					msg
				);
			}

			// BUY SYSTEM

			if (
				args[0]
					.toLowerCase() ===
				"buy"
			) {

				const itemName =
					args[1]
						?.toLowerCase();

				const amount =
					parseInt(
						args[2]
					) || 1;

				// INVALID ITEM

				if (
					!itemName
				) {

					return message.reply(
						"❌ Enter item name."
					);
				}

				if (
					!shopItems[
						itemName
					]
				) {

					return message.reply(
						"❌ Invalid item."
					);
				}

				// INVALID AMOUNT

				if (
					isNaN(amount) ||
					amount < 1
				) {

					return message.reply(
						"❌ Invalid amount."
					);
				}

				const item =
					shopItems[
						itemName
					];

				const totalPrice =
					item.price *
					amount;

				// NOT ENOUGH COINS

				if (
					userData.coins <
					totalPrice
				) {

					return message.reply(
`❌ Not enough coins.

💰 Needed:
${totalPrice}

💵 You Have:
${userData.coins}`
					);
				}

				// REMOVE COINS

				userData.coins -=
					totalPrice;

				// INIT ITEM

				if (
					!userData.items[
						itemName
					]
				) {

					userData.items[
						itemName
					] = 0;
				}

				// ADD ITEM

				userData.items[
					itemName
				] += amount;

				// SAVE

				await savePokemonUser(
					event.senderID,
					userData
				);

				// SUCCESS

				return message.reply(
`🛒 PURCHASE SUCCESSFUL!

━━━━━━━━━━━━━━━

🧾 Item:
${item.name}

📦 Amount:
${amount}

💵 Total Cost:
${totalPrice}

💰 Remaining Coins:
${userData.coins}

━━━━━━━━━━━━━━━

🔥 Thanks for shopping trainer!`
				);
			}

			// INVALID

			message.reply(
				"❌ Invalid usage."
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Shop error occurred."
			);
		}
	}
};