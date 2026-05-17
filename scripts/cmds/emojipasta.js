const axios = require("axios");

module.exports = {
	config: {
		name: "emojipasta",
		aliases: ["epasta"],
		version: "1.0",
		author: "Abdul Kaiyum",
		countDown: 5,
		role: 0,
		shortDescription: "Emoji pasta text",
		category: "fun",
		guide: "{pn} text"
	},

	onStart: async function ({ args, message }) {

		if (!args[0])
			return message.reply("Enter text.");

		const text = encodeURIComponent(
			args.join(" ")
		);

		const res = await axios.get(
			`https://api.popcat.xyz/emojify?text=${text}`
		);

		message.reply(res.data.emojified);
	}
};