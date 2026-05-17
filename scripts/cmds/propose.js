const { Jimp, loadFont } = require("jimp");
const fs = require("fs");

module.exports = {
	config: {
		name: "propose",
		aliases: ["proposal"],
		version: "3.0",
		author: "Abdul Kaiyum",
		countDown: 5,
		role: 0,
		shortDescription: "Propose someone ❤️",
		longDescription: "Create proposal image with names",
		category: "fun",
		guide: "{pn} @mention"
	},

	onStart: async function ({ api, event, usersData, message }) {

		try {

			const mentions = Object.keys(event.mentions);

			if (!mentions.length)
				return message.reply("❌ | Please mention someone.");

			const senderID = event.senderID;
			const targetID = mentions[0];

			const senderName =
				await usersData.getName(senderID);

			const targetName =
				await usersData.getName(targetID);

			const path = await createImage(
				senderID,
				targetID,
				senderName,
				targetName
			);

			await message.reply({
				body: `💍 | ${senderName} loves ${targetName} ❤️`,
				attachment: fs.createReadStream(path)
			});

			fs.unlinkSync(path);

		} catch (e) {
			console.log(e);
			message.reply("❌ | Failed to create image.");
		}
	}
};

async function createImage(
	one,
	two,
	name1,
	name2
) {

	const avatar1 = await Jimp.read(
		`https://graph.facebook.com/${one}/picture?width=512&height=512`
	);

	const avatar2 = await Jimp.read(
		`https://graph.facebook.com/${two}/picture?width=512&height=512`
	);

	avatar1.circle();
	avatar2.circle();

	// YOUR TEMPLATE IMAGE
	const bg = await Jimp.read(
		"https://ibb.co.com/jPpyvmb8"
	);

	bg.resize({
		width: 1365,
		height: 768
	});

	bg.composite(
		avatar1.resize({
			width: 280,
			height: 280
		}),
		90,
		220
	);

	bg.composite(
		avatar2.resize({
			width: 280,
			height: 280
		}),
		995,
		220
	);

	// FONT
	const font = await loadFont(
		"https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/eng.traineddata"
	);

	// NAME TEXT
	bg.print(
		font,
		120,
		530,
		{
			text: name1,
			alignmentX: 1
		},
		250
	);

	bg.print(
		font,
		1020,
		530,
		{
			text: name2,
			alignmentX: 1
		},
		250
	);

	const path = `./tmp/propose_${Date.now()}.png`;

	await bg.write(path);

	return path;
}