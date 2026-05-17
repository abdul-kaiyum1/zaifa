const {
	getPokemonUser
} = require("./pokemonMongo");

module.exports = {
	config: {
		name: "pokeleaderboard",

		version: "7.0",

		author: "Abdul Kaiyum",

		countDown: 10,

		role: 0,

		shortDescription:
			"Pokémon leaderboard",

		longDescription:
			"Top Pokémon trainers",

		category: "pokemon",

		guide: {
			en: `
╭─ POKELEADERBOARD GUIDE ─╮

🏆 Command:
• pokeleaderboard

━━━━━━━━━━━━━━━

📊 Ranking Based On:

• Coins
• Wins
• Pokémon Count
• Levels
• Shiny Pokémon

━━━━━━━━━━━━━━━

🔥 Become strongest trainer 😹

╰─────────────────────────╯`
		}
	},

	onStart: async function ({
		message,
		usersData
	}) {

		try {

			// GET COLLECTION

			const {
				connectPokemonDB
			} = require("./pokemonMongo");

			const collection =
				await connectPokemonDB();

			// GET USERS

			const users =
				await collection
					.find({})
					.toArray();

			// FILTER

			const trainers =
				users.filter(
					u =>
						u.pokemons &&
						u.pokemons.length
				);

			// NO USERS

			if (!trainers.length) {

				return message.reply(
					"❌ No Pokémon trainers found."
				);
			}

			// BUILD LEADERBOARD

			const leaderboard =
				await Promise.all(
					trainers.map(
						async user => {

							const pokemons =
								user.pokemons || [];

							const shinyCount =
								pokemons.filter(
									p =>
										p.shiny
								).length;

							const totalLevels =
								pokemons.reduce(
									(a, b) =>
										a +
										(b.level || 1),
									0
								);

							// SCORE

							const score =

								(user.coins || 0) +

								(user.wins || 0) *
									1000 +

								totalLevels *
									100 +

								pokemons.length *
									250 +

								shinyCount *
									500;

							// NAME

							let name =
								"Unknown";

							try {

								name =
									await usersData.getName(
										user.userID
									);

							} catch (e) {}

							return {

								name,

								coins:
									user.coins || 0,

								wins:
									user.wins || 0,

								losses:
									user.losses || 0,

								pokemons:
									pokemons.length,

								shiny:
									shinyCount,

								totalLevels,

								score
							};
						}
					)
				);

			// SORT

			leaderboard.sort(
				(a, b) =>
					b.score -
					a.score
			);

			// TOP 10

			const top =
				leaderboard.slice(
					0,
					10
				);

			// MESSAGE

			let msg =
`🏆 POKÉMON LEADERBOARD

━━━━━━━━━━━━━━━
`;

			for (
				let i = 0;
				i < top.length;
				i++
			) {

				const user =
					top[i];

				const medal =

					i === 0
						? "🥇"

						: i === 1
						? "🥈"

						: i === 2
						? "🥉"

						: "🏅";

				msg +=
`
${medal} Rank #${i + 1}

👤 ${user.name}

⭐ Score:
${user.score}

💰 Coins:
${user.coins}

🏆 Wins:
${user.wins}

🧬 Pokémon:
${user.pokemons}

✨ Shiny:
${user.shiny}

📈 Total Levels:
${user.totalLevels}

━━━━━━━━━━━━━━━`;
			}

			msg +=
`

🔥 Keep battling
to become #1 trainer!`;

			message.reply(msg);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to load leaderboard."
			);
		}
	}
};