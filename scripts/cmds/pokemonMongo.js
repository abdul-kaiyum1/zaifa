const { MongoClient } = require("mongodb");

const mongoURI =
"mongodb+srv://abdulkaiyum:abdulkaiyum5426@octa.elx1m1f.mongodb.net/GoatBotV2?retryWrites=true&w=majority&appName=octa";

const client =
	new MongoClient(
		mongoURI
	);

let pokemonCollection;

async function connectPokemonDB() {

	if (pokemonCollection)
		return pokemonCollection;

	await client.connect();

	const db =
		client.db("GoatBotV2");

	pokemonCollection =
		db.collection(
			"pokemon_users"
		);

	console.log(
		"✅ Pokémon Mongo Connected"
	);

	return pokemonCollection;
}

async function getPokemonUser(
	userID
) {

	const collection =
		await connectPokemonDB();

	let user =
		await collection.findOne({
			userID
		});

	// CREATE NEW USER

	if (!user) {

		user = {

			userID,

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

		await collection.insertOne(
			user
		);
	}

	return user;
}

async function savePokemonUser(
	userID,
	data
) {

	const collection =
		await connectPokemonDB();

	await collection.updateOne(
		{
			userID
		},
		{
			$set: data
		},
		{
			upsert: true
		}
	);
}

module.exports = {

	getPokemonUser,

	savePokemonUser
};