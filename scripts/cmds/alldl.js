const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "alldownloader",

		version: "8.0",

		author: "Abdul Kaiyum",

		countDown: 5,

		role: 0,

		shortDescription:
			"Download media from all platforms",

		longDescription:
			"TikTok, Facebook, Instagram, Spotify, YouTube, CapCut, Terabox downloader",

		category: "media",

		guide: {
			en:
`╭─ ALLDOWNLOADER GUIDE ─╮

📥 Command:
• alldownloader link

━━━━━━━━━━━━━━━

📌 Example:

alldownloader https://vt.tiktok.com/xxxxx

━━━━━━━━━━━━━━━

✅ Supported:

• TikTok
• Facebook
• Instagram
• Spotify
• YouTube
• CapCut
• Terabox

╰──────────────────────╯`
		}
	},

	onStart: async function ({
		message,
		event,
		args,
		api
	}) {

		try {

			// URL

			const input =

				event.messageReply
					?.body ||

				args[0];

			if (!input) {

				return message.reply(
					"❌ Please provide a valid URL."
				);
			}

			// REACTION

			api.setMessageReaction(
				"⏳",
				event.messageID,
				() => {},
				true
			);

			// DETECT PLATFORM

			let endpoint;

			if (
				input.includes(
					"tiktok"
				)
			) {

				endpoint =
					"tiktok";
			}

			else if (
				input.includes(
					"facebook"
				) ||

				input.includes(
					"fb.watch"
				)
			) {

				endpoint =
					"facebook";
			}

			else if (
				input.includes(
					"instagram"
				)
			) {

				endpoint =
					"instagram";
			}

			else if (
				input.includes(
					"spotify"
				)
			) {

				endpoint =
					"spotify";
			}

			else if (
				input.includes(
					"youtube"
				) ||

				input.includes(
					"youtu.be"
				)
			) {

				endpoint =
					"youtube/v2";
			}

			else if (
				input.includes(
					"capcut"
				)
			) {

				endpoint =
					"capcut";
			}

			else if (
				input.includes(
					"terabox"
				)
			) {

				endpoint =
					"terabox";
			}

			else {

				return message.reply(
					"❌ Unsupported platform."
				);
			}

			// API URL

			const apiUrl =
`https://fgsi.dpdns.org/api/downloader/${endpoint}`;

			// PARAMS

			const params = {

				apikey:
					"fgsiapi-ce555ea-6d",

				url: input
			};

			// YOUTUBE TYPE

			if (
				endpoint ===
				"youtube/v2"
			) {

				params.type =
					"mp4";
			}

			// API REQUEST

			const res =
				await axios.get(
					apiUrl,
					{
						params,

						headers: {
							accept:
								"application/json"
						}
					}
				);

			const data =
				res.data;

			// CHECK

			if (
				!data
			) {

				return message.reply(
					"❌ No data returned."
				);
			}

			// GET DOWNLOAD URL

			let downloadUrl =

				data.result
					?.downloadUrl ||

				data.result?.dl ||

				data.result?.url ||

				data.result
					?.video ||

				data.result
					?.music ||

				data.result
					?.play ||

				data.result
					?.media ||

				data.result
					?.hdplay ||

				data.result
					?.nowm ||

				data.result
					?.links?.[0]
					?.url;

			// FAIL

			if (
				!downloadUrl
			) {

				console.log(data);

				return message.reply(
					"❌ Download URL not found."
				);
			}

			// CACHE

			const cache =
				path.join(
					__dirname,
					"cache"
				);

			if (
				!fs.existsSync(
					cache
				)
			) {

				fs.mkdirSync(
					cache
				);
			}

			// EXTENSION

			let ext = "mp4";

			if (
				endpoint ===
				"spotify"
			) {

				ext = "mp3";
			}

			// FILE

			const filePath =
				path.join(
					cache,

`${Date.now()}.${ext}`
				);

			// DOWNLOAD

			const media =
				await axios({
					method: "GET",

					url: downloadUrl,

					responseType:
						"arraybuffer"
				});

			fs.writeFileSync(
				filePath,

				Buffer.from(
					media.data,
					"utf-8"
				)
			);

			// SUCCESS REACTION

			api.setMessageReaction(
				"✅",

				event.messageID,

				() => {},

				true
			);

			// SEND

			message.reply({
				body:
`📥 DOWNLOAD SUCCESS

━━━━━━━━━━━━━━━

🎬 Title:
${data.result?.title || data.title || "Unknown"}

🌐 Platform:
${endpoint}

━━━━━━━━━━━━━━━

🔥 Media downloaded successfully!`,

				attachment:
					fs.createReadStream(
						filePath
					)
			},

			() => {

				fs.unlinkSync(
					filePath
				);
			});

		} catch (e) {

			console.log(e);

			api.setMessageReaction(
				"❌",

				event.messageID,

				() => {},

				true
			);

			message.reply(
				"❌ Failed to download media."
			);
		}
	}
};
