const {
	getPokemonData
} = require("./pokemonUtils");

const activeBattles = new Map();

function random(min, max) {
	return Math.floor(
		Math.random() * (max - min + 1)
	) + min;
}

function calcDamage(attacker, defender) {

	const crit =
		Math.random() < 0.15;

	const dodge =
		Math.random() < 0.08;

	if (dodge) {
		return {
			damage: 0,
			crit: false,
			dodge: true
		};
	}

	let damage =
		(attacker.attack +
			random(5, 20)) -
		(defender.defense / 2);

	if (crit)
		damage *= 2;

	if (damage < 1)
		damage = 1;

	return {
		damage: Math.floor(damage),
		crit,
		dodge: false
	};
}

module.exports = {
	config: {
		name: "pokebattle",
		aliases: ["pbattle"],
		version: "4.0",
		author: "Abdul Kaiyum",
		countDown: 10,
		role: 0,

		shortDescription:
			"Advanced Pokémon Battle",

		longDescription:
			"Turn-based Pokémon PvP battle",

		category: "pokemon",

		guide: {
			en: `
╭─ POKEBATTLE GUIDE ─╮

⚔️ Battle Start:
• pokebattle @user

━━━━━━━━━━━━━━━

🎮 Commands:

• attack
→ Normal attack

• skill
→ Heavy damage skill

• heal
→ Restore HP

• info
→ Show battle stats

• surrender
→ Give up match

━━━━━━━━━━━━━━━

⚡ Features:

• Critical Hits
• Dodge System
• Heal System
• Turn Based
• XP Rewards
• Coins Rewards
• Win/Loss Stats

━━━━━━━━━━━━━━━

🏆 Winner Gets:

• Coins
• XP
• Battle Win
• Pokémon XP

━━━━━━━━━━━━━━━

💡 Tips:

• Heal low HP te
• Skill beshi damage dey
• Critical hit dangerous
• Smart battle koro 😹

╰──────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		usersData
	}) {

		const opponent =
			Object.keys(event.mentions)[0];

		if (!opponent)
			return message.reply(
				"❌ | Mention a user."
			);

		if (opponent === event.senderID)
			return message.reply(
				"❌ | You can't battle yourself."
			);

		if (
			activeBattles.has(
				event.threadID
			)
		) {
			return message.reply(
				"❌ | A battle is already running."
			);
		}

		const p1 =
			await getPokemonData(
				usersData,
				event.senderID
			);

		const p2 =
			await getPokemonData(
				usersData,
				opponent
			);

		if (
			!p1.pokemonData.pokemons.length
		) {
			return message.reply(
				"❌ | You don't have Pokémon."
			);
		}

		if (
			!p2.pokemonData.pokemons.length
		) {
			return message.reply(
				"❌ | Opponent has no Pokémon."
			);
		}

		const poke1 =
			JSON.parse(
				JSON.stringify(
					p1.pokemonData.pokemons[0]
				)
			);

		const poke2 =
			JSON.parse(
				JSON.stringify(
					p2.pokemonData.pokemons[0]
				)
			);

		poke1.currentHP = poke1.hp;
		poke2.currentHP = poke2.hp;

		const battle = {

			players: [
				event.senderID,
				opponent
			],

			turn: 0,

			pokemons: {
				[event.senderID]:
					poke1,

				[opponent]:
					poke2
			},

			totalMoves: 0
		};

		activeBattles.set(
			event.threadID,
			battle
		);

		const p1Name =
			await usersData.getName(
				event.senderID
			);

		const p2Name =
			await usersData.getName(
				opponent
			);

		const msg =
			await message.reply(
`⚔️ POKÉMON BATTLE STARTED

👤 ${p1Name}
🧬 ${poke1.name}
❤️ HP: ${poke1.currentHP}

VS

👤 ${p2Name}
🧬 ${poke2.name}
❤️ HP: ${poke2.currentHP}

━━━━━━━━━━━━━━━

🎯 Current Turn:
${p1Name}

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

				threadID:
					event.threadID
			}
		);
	},

	onReply: async function ({
		message,
		event,
		Reply,
		usersData
	}) {

		const battle =
			activeBattles.get(
				Reply.threadID
			);

		if (!battle)
			return;

		const currentPlayer =
			battle.players[
				battle.turn
			];

		if (
			event.senderID !==
			currentPlayer
		)
			return;

		const enemyPlayer =
			battle.players[
				(battle.turn + 1) % 2
			];

		const myPokemon =
			battle.pokemons[
				currentPlayer
			];

		const enemyPokemon =
			battle.pokemons[
				enemyPlayer
			];

		const action =
			event.body
				.toLowerCase()
				.trim();

		let battleText = "";

		// ATTACK

		if (action === "attack") {

			const result =
				calcDamage(
					myPokemon,
					enemyPokemon
				);

			if (result.dodge) {

				battleText =
`${enemyPokemon.name} dodged the attack 😹`;
			}

			else {

				enemyPokemon.currentHP -=
					result.damage;

				battleText =
`${myPokemon.name} used ATTACK!

💥 Damage: ${result.damage}
${result.crit ? "🔥 CRITICAL HIT!" : ""}`;
			}
		}

		// SKILL

		else if (
			action === "skill"
		) {

			const crit =
				Math.random() < 0.25;

			let damage =
				random(30, 70);

			if (crit)
				damage *= 2;

			enemyPokemon.currentHP -=
				damage;

			battleText =
`${myPokemon.name} used SPECIAL SKILL!

⚡ Damage: ${damage}
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

			battleText =
`${myPokemon.name} healed!

❤️ Restored: ${heal} HP`;
		}

		// INFO

		else if (
			action === "info"
		) {

			return message.reply(
`📊 BATTLE INFO

🧬 ${myPokemon.name}
❤️ HP: ${myPokemon.currentHP}/${myPokemon.hp}
⚔️ Attack: ${myPokemon.attack}
🛡️ Defense: ${myPokemon.defense}

━━━━━━━━━━━━━━━

🧬 ${enemyPokemon.name}
❤️ HP: ${enemyPokemon.currentHP}/${enemyPokemon.hp}
⚔️ Attack: ${enemyPokemon.attack}
🛡️ Defense: ${enemyPokemon.defense}`
			);
		}

		// SURRENDER

		else if (
			action === "surrender"
		) {

			activeBattles.delete(
				Reply.threadID
			);

			const loserData =
				await getPokemonData(
					usersData,
					currentPlayer
				);

			loserData.pokemonData.losses++;

			await usersData.set(
				currentPlayer,
				{
					pokemonData:
						loserData.pokemonData
				}
			);

			return message.reply(
`🏳️ ${await usersData.getName(currentPlayer)} surrendered!

🏆 Winner:
${await usersData.getName(enemyPlayer)}`
			);
		}

		else {

			return message.reply(
				"❌ | Use: attack / skill / heal / info / surrender"
			);
		}

		battle.totalMoves++;

		// WIN CHECK

		if (
			enemyPokemon.currentHP <= 0
		) {

			activeBattles.delete(
				Reply.threadID
			);

			const coins =
				random(500, 1500);

			const xp =
				random(50, 200);

			const winnerData =
				await getPokemonData(
					usersData,
					currentPlayer
				);

			const loserData =
				await getPokemonData(
					usersData,
					enemyPlayer
				);

			winnerData.pokemonData.coins +=
				coins;

			winnerData.pokemonData.wins++;

			loserData.pokemonData.losses++;

			// Pokémon XP
			const realPokemon =
				winnerData
					.pokemonData
					.pokemons[0];

			realPokemon.xp += xp;

			// Level Up
			if (
				realPokemon.xp >=
				100
			) {

				realPokemon.level++;

				realPokemon.xp = 0;

				realPokemon.attack +=
					5;

				realPokemon.defense +=
					5;

				realPokemon.hp +=
					10;
			}

			await usersData.set(
				currentPlayer,
				{
					pokemonData:
						winnerData.pokemonData
				}
			);

			await usersData.set(
				enemyPlayer,
				{
					pokemonData:
						loserData.pokemonData
				}
			);

			return message.reply(
`🏆 BATTLE FINISHED

${battleText}

💀 ${enemyPokemon.name} fainted!

━━━━━━━━━━━━━━━

🎉 Winner:
${await usersData.getName(currentPlayer)}

💰 Coins Earned:
${coins}

✨ XP Earned:
${xp}

🎮 Total Moves:
${battle.totalMoves}

📈 ${realPokemon.name} Lv.${realPokemon.level}`
			);
		}

		// NEXT TURN

		battle.turn =
			(battle.turn + 1) % 2;

		const nextPlayer =
			battle.players[
				battle.turn
			];

		const nextName =
			await usersData.getName(
				nextPlayer
			);

		const msg =
			await message.reply(
`${battleText}

━━━━━━━━━━━━━━━

🧬 ${myPokemon.name}
❤️ HP: ${myPokemon.currentHP}/${myPokemon.hp}

🧬 ${enemyPokemon.name}
❤️ HP: ${enemyPokemon.currentHP}/${enemyPokemon.hp}

━━━━━━━━━━━━━━━

🎯 Current Turn:
${nextName}

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

				threadID:
					Reply.threadID
			}
		);
	}
};