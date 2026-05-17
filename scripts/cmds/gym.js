const {
	getPokemonData
} = require("./pokemonUtils");

const activeGyms =
	global.activeGyms ||
	new Map();

global.activeGyms =
	activeGyms;

// GYM LEADERS

const gymLeaders = [

	{
		name: "Brock",

		type: "Rock",

		pokemon: "Onix",

		level: 8,

		hp: 140,

		attack: 45,

		defense: 60,

		reward: 2500,

		badge: "Boulder Badge"
	},

	{
		name: "Misty",

		type: "Water",

		pokemon: "Starmie",

		level: 12,

		hp: 180,

		attack: 65,

		defense: 55,

		reward: 4000,

		badge: "Cascade Badge"
	},

	{
		name: "Lt. Surge",

		type: "Electric",

		pokemon: "Raichu",

		level: 16,

		hp: 220,

		attack: 80,

		defense: 60,

		reward: 5500,

		badge: "Thunder Badge"
	}
];

function random(min, max) {

	return Math.floor(
		Math.random() *
			(max - min + 1)
	) + min;
}

module.exports = {
	config: {
		name: "gym",

		aliases: [
			"gymbattle",
			"pokegym"
		],

		version: "5.0",

		author: "Abdul Kaiyum",

		countDown: 20,

		role: 0,

		shortDescription:
			"Battle gym leaders",

		longDescription:
			"Fight powerful gym leaders and earn badges",

		category: "pokemon",

		guide: {
			en: `
╭─ GYM GUIDE ─╮

🏟️ Start Battle:
• gym

━━━━━━━━━━━━━━━

🎮 Commands:

• attack
• skill
• heal
• info
• surrender

━━━━━━━━━━━━━━━

🏆 Rewards:

• Gym Badges
• Coins
• XP
• Pokémon XP

━━━━━━━━━━━━━━━

💡 Tips:

• Heal wisely 😹
• Skill more damage dey
• Higher level Pokémon use koro

╰────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		usersData
	}) {

		try {

			// ACTIVE CHECK

			if (
				activeGyms.has(
					event.senderID
				)
			) {

				return message.reply(
					"❌ | You already have an active gym battle."
				);
			}

			// USER DATA

			const userData =
				await getPokemonData(
					usersData,
					event.senderID
				);

			const pokemons =
				userData
					.pokemonData
					.pokemons;

			if (
				!pokemons.length
			) {

				return message.reply(
					"❌ | You need Pokémon first."
				);
			}

			// PLAYER POKEMON

			const myPokemon =
				JSON.parse(
					JSON.stringify(
						pokemons[0]
					)
				);

			myPokemon.currentHP =
				myPokemon.hp;

			// RANDOM LEADER

			const leader =
				JSON.parse(
					JSON.stringify(
						gymLeaders[
							random(
								0,
								gymLeaders.length -
									1
							)
						]
					)
				);

			leader.currentHP =
				leader.hp;

			// SAVE BATTLE

			activeGyms.set(
				event.senderID,
				{
					player:
						event.senderID,

					pokemon:
						myPokemon,

					leader
				}
			);

			// START MESSAGE

			const msg =
				await message.reply(
`🏟️ GYM BATTLE STARTED!

━━━━━━━━━━━━━━━

👤 Gym Leader:
${leader.name}

🧬 Pokémon:
${leader.pokemon}

🌿 Type:
${leader.type}

❤️ HP:
${leader.currentHP}/${leader.hp}

⚔️ Attack:
${leader.attack}

🛡️ Defense:
${leader.defense}

━━━━━━━━━━━━━━━

🧬 Your Pokémon:
${myPokemon.name}

❤️ HP:
${myPokemon.currentHP}/${myPokemon.hp}

━━━━━━━━━━━━━━━

Reply:
attack
skill
heal
info
surrender`
				);

			global.GoatBot.onReply.set(
				msg.messageID,
				{
					commandName:
						this.config.name,

					author:
						event.senderID
				}
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Failed to start gym battle."
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

			// AUTHOR CHECK

			if (
				event.senderID !==
				Reply.author
			)
				return;

			// GET BATTLE

			const gym =
				activeGyms.get(
					event.senderID
				);

			if (!gym)
				return;

			const action =
				event.body
					.toLowerCase()
					.trim();

			const myPokemon =
				gym.pokemon;

			const leader =
				gym.leader;

			let text =
				"";

			// ATTACK

			if (
				action === "attack"
			) {

				const crit =
					Math.random() <
					0.15;

				let damage =

					random(
						15,
						myPokemon.attack
					) -

					Math.floor(
						leader.defense / 4
					);

				if (crit)
					damage *= 2;

				if (damage < 1)
					damage = 1;

				leader.currentHP -=
					damage;

				text =
`${myPokemon.name} used ATTACK!

💥 Damage:
${damage}

${crit ? "🔥 CRITICAL HIT!" : ""}`;
			}

			// SKILL

			else if (
				action === "skill"
			) {

				const crit =
					Math.random() <
					0.25;

				let damage =

					random(
						35,
						myPokemon.attack +
							40
					) -

					Math.floor(
						leader.defense / 5
					);

				if (crit)
					damage *= 2;

				if (damage < 1)
					damage = 1;

				leader.currentHP -=
					damage;

				text =
`${myPokemon.name} used SPECIAL SKILL!

⚡ Damage:
${damage}

${crit ? "🔥 SKILL CRITICAL!" : ""}`;
			}

			// HEAL

			else if (
				action === "heal"
			) {

				const heal =
					random(20, 45);

				myPokemon.currentHP +=
					heal;

				if (
					myPokemon.currentHP >
					myPokemon.hp
				) {

					myPokemon.currentHP =
						myPokemon.hp;
				}

				text =
`${myPokemon.name} healed!

❤️ Restored:
${heal} HP`;
			}

			// INFO

			else if (
				action === "info"
			) {

				return message.reply(
`📊 GYM INFO

━━━━━━━━━━━━━━━

🧬 Your Pokémon:
${myPokemon.name}

❤️ HP:
${myPokemon.currentHP}/${myPokemon.hp}

⚔️ Attack:
${myPokemon.attack}

🛡️ Defense:
${myPokemon.defense}

━━━━━━━━━━━━━━━

👤 Gym Leader:
${leader.name}

🧬 ${leader.pokemon}

❤️ HP:
${leader.currentHP}/${leader.hp}

⚔️ Attack:
${leader.attack}

🛡️ Defense:
${leader.defense}`
				);
			}

			// SURRENDER

			else if (
				action ===
				"surrender"
			) {

				activeGyms.delete(
					event.senderID
				);

				return message.reply(
					"🏳️ Gym battle surrendered."
				);
			}

			else {

				return message.reply(
					"❌ Use: attack / skill / heal / info / surrender"
				);
			}

			// LEADER ATTACK

			if (
				leader.currentHP > 0
			) {

				let enemyDamage =

					random(
						15,
						leader.attack
					) -

					Math.floor(
						myPokemon.defense / 5
					);

				if (
					enemyDamage < 1
				)
					enemyDamage = 1;

				myPokemon.currentHP -=
					enemyDamage;

				text +=
`

👤 ${leader.name} attacked back!

💥 Damage:
${enemyDamage}`;
			}

			// LOSE

			if (
				myPokemon.currentHP <=
				0
			) {

				activeGyms.delete(
					event.senderID
				);

				return message.reply(
`💀 GYM BATTLE LOST!

👤 ${leader.name}
defeated your Pokémon!`
				);
			}

			// WIN

			if (
				leader.currentHP <= 0
			) {

				activeGyms.delete(
					event.senderID
				);

				// REWARDS

				const reward =
					leader.reward;

				const xp =
					random(
						100,
						250
					);

				// USER DATA

				const userData =
					await getPokemonData(
						usersData,
						event.senderID
					);

				const pokeData =
					userData.pokemonData;

				// COINS

				pokeData.coins +=
					reward;

				// WINS

				pokeData.wins++;

				// BADGE

				if (
					!pokeData.badges.includes(
						leader.badge
					)
				) {

					pokeData.badges.push(
						leader.badge
					);
				}

				// REAL POKEMON

				const realPokemon =
					pokeData
						.pokemons[0];

				realPokemon.xp +=
					xp;

				// LEVEL UP

				if (
					realPokemon.xp >=
					100
				) {

					realPokemon.level++;

					realPokemon.xp = 0;

					realPokemon.hp +=
						10;

					realPokemon.attack +=
						5;

					realPokemon.defense +=
						5;

					realPokemon.speed +=
						3;
				}

				// SAVE MONGO

				await usersData.set(
					event.senderID,
					{
						pokemonData:
							pokeData
					}
				);

				return message.reply(
`🏆 GYM VICTORY!

━━━━━━━━━━━━━━━

👤 Defeated:
${leader.name}

🎖️ Badge:
${leader.badge}

💰 Coins:
${reward}

✨ XP:
${xp}

📈 ${realPokemon.name}
Lv.${realPokemon.level}

━━━━━━━━━━━━━━━

🔥 You're becoming
a powerful trainer!`
				);
			}

			// CONTINUE MESSAGE

			const msg =
				await message.reply(
`${text}

━━━━━━━━━━━━━━━

🧬 ${myPokemon.name}
❤️ HP:
${myPokemon.currentHP}/${myPokemon.hp}

━━━━━━━━━━━━━━━

👤 ${leader.name}
🧬 ${leader.pokemon}

❤️ HP:
${leader.currentHP}/${leader.hp}

━━━━━━━━━━━━━━━

Reply:
attack
skill
heal
info
surrender`
				);

			global.GoatBot.onReply.set(
				msg.messageID,
				{
					commandName:
						this.config.name,

					author:
						event.senderID
				}
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Gym battle error."
			);
		}
	}
};