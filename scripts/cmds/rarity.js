function getRarity() {

	const rand =
		Math.random() * 100;

	// 1%
	if (rand < 1) {
		return "mythical";
	}

	// 4%
	if (rand < 5) {
		return "legendary";
	}

	// 10%
	if (rand < 15) {
		return "epic";
	}

	// 20%
	if (rand < 35) {
		return "rare";
	}

	// 65%
	return "common";
}

// OPTIONAL BONUS SYSTEM

function getRarityReward(
	rarity
) {

	switch (rarity) {

		case "mythical":
			return 3000;

		case "legendary":
			return 1500;

		case "epic":
			return 700;

		case "rare":
			return 300;

		default:
			return 0;
	}
}

// OPTIONAL EMOJI SYSTEM

function getRarityEmoji(
	rarity
) {

	switch (rarity) {

		case "mythical":
			return "🔴";

		case "legendary":
			return "🟡";

		case "epic":
			return "🟣";

		case "rare":
			return "🔵";

		default:
			return "🟢";
	}
}

module.exports = {

	getRarity,

	getRarityReward,

	getRarityEmoji
};