const axios = require("axios");
const fs = require("fs-extra");

const {
	getStreamFromURL
} = global.utils;

module.exports = {
	config: {
		name: "ytb",

		version: "2.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"YouTube",

		longDescription:
			"Download YouTube video/audio using API",

		category: "media",

		guide: {
			en:
`╭─ YOUTUBE GUIDE ─╮

🎥 Download Video:
• ytb -v link

🎵 Download Audio:
• ytb -a link

ℹ️ Video Info:
• ytb -i link

━━━━━━━━━━━━━━━

📌 Example:

ytb -v https://youtu.be/xxxx

ytb -a https://youtu.be/xxxx

ytb -i https://youtu.be/xxxx

╰────────────────╯`
		}
	},

	onStart: async function ({
		args,
		message
	}) {

		try {

			// TYPE

			let type;

			switch (args[0]) {

				case "-v":
				case "v":
				case "video":

					type = "mp4";
					break;

				case "-a":
				case "a":
				case "audio":
				case "mp3":

					type = "mp3";
					break;

				case "-i":
				case "i":
				case "info":

					type = "info";
					break;

				default:
					return message.reply(
`❌ Invalid usage.

✅ Example:
ytb -v link
ytb -a link
ytb -i link`
					);
			}

			// URL

			const url =
				args[1];

			if (!url) {

				return message.reply(
					"❌ Enter YouTube URL."
				);
			}

			// INFO MODE

			if (
				type === "info"
			) {

				const api =
`https://fgsi.dpdns.org/api/downloader/youtube/v2?apikey=fgsiapi-1729ba1b-6d&url=${encodeURIComponent(url)}&type=mp4`;

				const res =
					await axios.get(
						api
					);

				const data =
					res.data.result;

				return message.reply({
					body:
`🎥 YOUTUBE INFO

━━━━━━━━━━━━━━━

🎵 Title:
${data.title || "Unknown"}

⏱ Duration:
${data.duration || "Unknown"}

👀 Views:
${data.views || "Unknown"}

📦 Type:
VIDEO

━━━━━━━━━━━━━━━

🔗 ${url}`,

					attachment:
						data.thumbnail

							? await getStreamFromURL(
									data.thumbnail
							  )

							: null
				});
			}

			// WAIT

			const wait =
				await message.reply(
`⏳ Downloading ${type.toUpperCase()}...`
				);

			// API

			const api =
`https://fgsi.dpdns.org/api/downloader/youtube/v2?apikey=fgsiapi-1729ba1b-6d&url=${encodeURIComponent(url)}&type=${type}`;

			const res =
				await axios.get(api);

			// RESULT

			const data =
				res.data.result;

			if (!data) {

				return message.reply(
					"❌ API returned no data."
				);
			}

			// DOWNLOAD URL

			const mediaUrl =

				data.download_url ||

				data.url ||

				data.download;

			if (!mediaUrl) {

				return message.reply(
					"❌ Download link not found."
				);
			}

			// FILE PATH

			const path =
`${__dirname}/tmp/${Date.now()}.${type}`;

			// DOWNLOAD FILE

			const response =
				await axios({
					method: "GET",

					url: mediaUrl,

					responseType:
						"stream"
				});

			// SAVE FILE

			const writer =
				fs.createWriteStream(
					path
				);

			response.data.pipe(
				writer
			);

			writer.on(
				"finish",

				async () => {

					// SEND

					await message.reply({
						body:
`✅ DOWNLOAD COMPLETE

🎵 Title:
${data.title || "Unknown"}

📦 Type:
${type.toUpperCase()}`,

						attachment:
							fs.createReadStream(
								path
							)
					});

					// DELETE

					fs.unlinkSync(
						path
					);

					// UNSEND WAIT

					message.unsend(
						wait.messageID
					);
				}
			);

			writer.on(
				"error",

				() => {

					message.reply(
						"❌ Failed to save media."
					);
				}
			);

		} catch (e) {

			console.log(e);

			message.reply(
				"❌ Download failed."
			);
		}
	}
};