async function getPokemonData(
	usersData,
	uid
) {

	// GET USER DATA

	let userData =
		await usersData.get(uid);

	// SAFETY CHECK

	if (!userData)
		userData = {};

	// CREATE POKEMON DATA

	if (!userData.pokemonData) {

		userData.pokemonData = {

			coins: 0,

			gems: 0,

			pokemons: [],

			pokedex: [],

			items: {

				pokeball: 10,

				greatball: 0,

				ultraball: 0,

				masterball: 0,

				potion: 2,

				superpotion: 0,

				rarecandy: 0
			},

			badges: [],

			wins: 0,

			losses: 0,

			lastDaily: 0
		};

		// SAVE TO MONGO

		await usersData.set(
			uid,
			{
				pokemonData:
					userData.pokemonData
			}
		);
	}

	// SAFETY FIXES

	if (
		!Array.isArray(
			userData.pokemonData
				.pokemons
		)
	) {

		userData.pokemonData
			.pokemons = [];
	}

	if (
		!Array.isArray(
			userData.pokemonData
				.pokedex
		)
	) {

		userData.pokemonData
			.pokedex = [];
	}

	if (
		!userData.pokemonData.items
	) {

		userData.pokemonData.items =
			{};
	}

	if (
		!Array.isArray(
			userData.pokemonData
				.badges
		)
	) {

		userData.pokemonData
			.badges = [];
	}

	if (
		typeof userData
			.pokemonData
			.coins !== "number"
	) {

		userData.pokemonData
			.coins = 0;
	}

	if (
		typeof userData
			.pokemonData
			.gems !== "number"
	) {

		userData.pokemonData
			.gems = 0;
	}

	if (
		typeof userData
			.pokemonData
			.wins !== "number"
	) {

		userData.pokemonData
			.wins = 0;
	}

	if (
		typeof userData
			.pokemonData
			.losses !== "number"
	) {

		userData.pokemonData
			.losses = 0;
	}

	if (
		typeof userData
			.pokemonData
			.lastDaily !== "number"
	) {

		userData.pokemonData
			.lastDaily = 0;
	}

	// SAVE SAFETY FIXES

	await usersData.set(
		uid,
		{
			pokemonData:
				userData.pokemonData
		}
	);

	return userData;
}

module.exports = {
	getPokemonData
};