const {
	getPokemonData
} = require("./pokemonUtils");

const activeRaids =
	global.activeRaids ||
	new Map();

global.activeRaids =
	activeRaids;

// RAID BOSSES

const raidBosses = [

	{
		name: "Rayquaza",

		rarity: "legendary",

		hp: 500,

		attack: 120,

		defense: 80,

		reward: 5000
	},

	{
		name: "Mewtwo",

		rarity: "legendary",

		hp: 450,

		attack: 130,

		defense: 70,

		reward: 5500
	},

	{
		name: "Kyogre",

		rarity: "legendary",

		hp: 520,

		attack: 115,

		defense: 90,

		reward: 5200
	},

	{
		name: "Dialga",

		rarity: "mythical",

		hp: 650,

		attack: 145,

		defense: 100,

		reward: 7000
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
		name: "raid",

		aliases: [
			"bossraid",
			"pokemonraid"
		],

		version: "5.0",

		author: "Abdul Kaiyum",

		countDown: 20,

		role: 0,

		shortDescription:
			"Battle raid bosses",

		longDescription:
			"Fight powerful legendary Pokémon raids",

		category: "pokemon",

		guide: {
			en: `
╭─ RAID GUIDE ─╮

⚔️ Start Raid:
• raid

━━━━━━━━━━━━━━━

🎮 Commands:

• attack
• skill
• heal
• info
• surrender

━━━━━━━━━━━━━━━

🏆 Rewards:

• Huge Coins
• XP
• Rare Rewards
• Pokémon XP

━━━━━━━━━━━━━━━

💡 Tips:

• Heal wisely 😹
• Skill more damage dey
• Legendary bosses very strong

╰────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		usersData
	}) {

		try {

			// ACTIVE RAID CHECK

			if (
				activeRaids.has(
					event.senderID
				)
			) {

				return message.reply(
					"❌ | You already have an active raid."
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

			// RANDOM BOSS

			const boss =
				JSON.parse(
					JSON.stringify(
						raidBosses[
							random(
								0,
								raidBosses.length -
									1
							)
						]
					)
				);

			boss.currentHP =
				boss.hp;

			// SAVE RAID

			activeRaids.set(
				event.senderID,
				{
					player:
						event.senderID,

					pokemon:
						myPokemon,

					boss
				}
			);

			// START MESSAGE

			const msg =
				await message.reply(
`🐉 RAID BOSS APPEARED!

━━━━━━━━━━━━━━━

👑 Boss:
${boss.name}

⭐ Rarity:
${boss.rarity.toUpperCase()}

❤️ HP:
${boss.currentHP}/${boss.hp}

⚔️ Attack:
${boss.attack}

🛡️ Defense:
${boss.defense}

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
				"❌ Failed to start raid."
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

			// GET RAID

			const raid =
				activeRaids.get(
					event.senderID
				);

			if (!raid)
				return;

			const action =
				event.body
					.toLowerCase()
					.trim();

			const myPokemon =
				raid.pokemon;

			const boss =
				raid.boss;

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
						boss.defense / 4
					);

				if (crit)
					damage *= 2;

				if (damage < 1)
					damage = 1;

				boss.currentHP -=
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
						40,
						myPokemon.attack +
							50
					) -

					Math.floor(
						boss.defense / 5
					);

				if (crit)
					damage *= 2;

				if (damage < 1)
					damage = 1;

				boss.currentHP -=
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
					random(25, 50);

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
`📊 RAID INFO

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

🐉 Boss:
${boss.name}

❤️ HP:
${boss.currentHP}/${boss.hp}

⚔️ Attack:
${boss.attack}

🛡️ Defense:
${boss.defense}`
				);
			}

			// SURRENDER

			else if (
				action ===
				"surrender"
			) {

				activeRaids.delete(
					event.senderID
				);

				return message.reply(
					"🏳️ Raid surrendered."
				);
			}

			else {

				return message.reply(
					"❌ Use: attack / skill / heal / info / surrender"
				);
			}

			// BOSS ATTACK

			if (
				boss.currentHP > 0
			) {

				let bossDamage =

					random(
						25,
						boss.attack
					) -

					Math.floor(
						myPokemon.defense / 5
					);

				if (
					bossDamage < 1
				)
					bossDamage = 1;

				myPokemon.currentHP -=
					bossDamage;

				text +=
`

🐉 ${boss.name} attacked back!

💥 Damage:
${bossDamage}`;
			}

			// LOSE

			if (
				myPokemon.currentHP <=
				0
			) {

				activeRaids.delete(
					event.senderID
				);

				return message.reply(
`💀 RAID FAILED!

🐉 ${boss.name}
defeated your Pokémon!`
				);
			}

			// WIN

			if (
				boss.currentHP <= 0
			) {

				activeRaids.delete(
					event.senderID
				);

				// REWARDS

				const reward =
					boss.reward;

				const xp =
					random(
						100,
						300
					);

				const userData =
					await getPokemonData(
						usersData,
						event.senderID
					);

				const pokeData =
					userData.pokemonData;

				pokeData.coins +=
					reward;

				pokeData.wins++;

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
`🏆 RAID VICTORY!

━━━━━━━━━━━━━━━

🐉 Boss Defeated:
${boss.name}

💰 Coins:
${reward}

✨ XP:
${xp}

📈 ${realPokemon.name}
Lv.${realPokemon.level}

━━━━━━━━━━━━━━━

🔥 Amazing raid battle!`
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

🐉 ${boss.name}
❤️ HP:
${boss.currentHP}/${boss.hp}

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
				"❌ Raid error occurred."
			);
		}
	}
};