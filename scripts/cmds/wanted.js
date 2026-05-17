const axios = require("axios");

module.exports = {
	config: {
		name: "wanted",
		version: "1.0",
		author: "Abdul Kaiyum",
		countDown: 5,
		role: 0,
		shortDescription: "Wanted poster",
		category: "image",
		guide: "{pn} reply image"
	},

	onStart: async function ({ event, message }) {

		try {

			const reply = event.messageReply;

			if (!reply?.attachments?.[0]?.url)
				return message.reply("Reply to image.");

			const img = encodeURIComponent(
				reply.attachments[0].url
			);

			const url =
				`https://api.popcat.xyz/wanted?image=${img}`;

			message.reply({
				attachment: await global.utils.getStreamFromURL(url)
			});

		} catch (e) {
			console.log(e);
			message.reply("Error.");
		}
	}
};