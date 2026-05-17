module.exports = {
	config: {
		name: "pooh",
		version: "1.0",
		author: "Abdul Kaiyum",
		countDown: 5,
		role: 0,
		shortDescription: "Pooh meme",
		category: "fun",
		guide: "{pn} text1 | text2"
	},

	onStart: async function ({ args, message }) {

		const text = args.join(" ").split("|");

		if (text.length < 2)
			return message.reply("Example: hi | hello");

		const url =
			`https://api.popcat.xyz/pooh?text1=${encodeURIComponent(text[0])}&text2=${encodeURIComponent(text[1])}`;

		message.reply({
			attachment: await global.utils.getStreamFromURL(url)
		});
	}
};