const {
	getPokemonData
} = require("./pokemonUtils");

module.exports = {
	config: {
		name: "pokeleaderboard",

		aliases: [
			"pokelead",
			"plb",
			"pokemonlb",
			"pokeleader"
		],

		version: "4.0",

		author: "Abdul Kaiyum",

		countDown: 10,

		role: 0,

		shortDescription:
			"Pokémon leaderboard",

		longDescription:
			"Top Pokémon trainers leaderboard",

		category: "pokemon",

		guide: {
			en: `
╭─ POKELEADERBOARD GUIDE ─╮

🏆 Commands:

• pokeleaderboard
• pokelead
• plb

━━━━━━━━━━━━━━━

📊 Shows:

• Richest Trainers
• Most Wins
• Most Pokémon
• Shiny Count
• Total Levels

━━━━━━━━━━━━━━━

💡 Ranking Based On:

• Coins
• Wins
• Pokémon Levels
• Collection Size

━━━━━━━━━━━━━━━

🔥 Become strongest trainer! 😹

╰────────────────────────╯`
		}
	},

	onStart: async function ({
		message,
		usersData
	}) {

		try {

			// GET USERS

			const allUsers =
				await usersData.getAll();

			// FILTER POKEMON USERS

			const trainers =
				allUsers.filter(
					user =>
						user.pokemonData &&
						user.pokemonData
							.pokemons &&
						user.pokemonData
							.pokemons.length
				);

			if (!trainers.length) {

				return message.reply(
					"❌ No Pokémon trainers found."
				);
			}

			// BUILD LEADERBOARD

			const leaderboard =
				trainers.map(
					user => {

						const pokeData =
							user.pokemonData;

						const pokemons =
							pokeData.pokemons || [];

						const shinyCount =
							pokemons.filter(
								p => p.shiny
							).length;

						const totalLevels =
							pokemons.reduce(
								(a, b) =>
									a +
									(b.level || 1),
								0
							);

						const score =

							(pokeData.coins || 0) +

							(pokeData.wins || 0) *
								1000 +

							totalLevels *
								100 +

							pokemons.length *
								250 +

							shinyCount *
								500;

						return {

							name:
								user.name ||
								"Unknown Trainer",

							coins:
								pokeData.coins || 0,

							wins:
								pokeData.wins || 0,

							losses:
								pokeData.losses || 0,

							pokemons:
								pokemons.length,

							shiny:
								shinyCount,

							totalLevels,

							score
						};
					}
				)

				.sort(
					(a, b) =>
						b.score -
						a.score
				)

				.slice(0, 10);

			// MESSAGE

			let msg =
`🏆 POKÉMON LEADERBOARD

━━━━━━━━━━━━━━━
`;

			for (
				let i = 0;
				i < leaderboard.length;
				i++
			) {

				const user =
					leaderboard[i];

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

💰 Coins:
${user.coins}

🏆 Wins:
${user.wins}

💀 Losses:
${user.losses}

🧬 Pokémon:
${user.pokemons}

✨ Shiny:
${user.shiny}

📈 Total Levels:
${user.totalLevels}

⭐ Score:
${user.score}

━━━━━━━━━━━━━━━`;
			}

			msg +=
`

🔥 Keep battling
to climb leaderboard!`;

			message.reply(msg);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to load leaderboard."
			);
		}
	}
};