const fs = require("fs-extra");

module.exports = {
	config: {
		name: "startnotification",
		setalias: ["startnoti"],
		version: "1.1",
		author: "Sahadat Hossen",
		countDown: 5,
		role: 2,
		description: {
			vi: "Khởi động lại bot",
			en: "Bot restart notification"
		},
		category: "Owner",
		guide: {
			vi: "   {pn}: Khởi động lại bot",
			en: "   Restart the bot and notify admins"
		}
	},

	langs: {
		vi: {
			restartting: "🔄 | Đang khởi động lại bot..."
		},
		en: {
			restartting: "🔄 | Restarting bot..."
		}
	},

	onLoad: function ({ api }) {
		const pathFile = `${__dirname}/tmp/restart.txt`;
		const adminGroupID = "7388254684526242"; // Your admin group ID
		
		if (fs.existsSync(pathFile)) {
			const [tid, time] = fs.readFileSync(pathFile, "utf-8").split(" ");
			api.sendMessage(`✅ | Bot restarted\n⏰ | Time: ${(Date.now() - time) / 1000}s`, tid);
			fs.unlinkSync(pathFile);
		}
		
		// Send restart notification to admin group with Bangladesh time
		const now = new Date();
		const options = {
			timeZone: 'Asia/Dhaka',
			hour12: true,
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		};
		
		const bangladeshTime = now.toLocaleString('en-US', options);
		const [datePart, timePart] = bangladeshTime.split(', ');
		const [time, period] = timePart.split(' ');
		const [month, day, year] = datePart.split('/');
		
		api.sendMessage(
			`🟢 The bot has restarted at\n` +
			`- Time: ${time} ${period}\n` +
			`- Date: ${day}/${month}/${year}`,
			adminGroupID
		);
	},

	onStart: async function ({ message, event, getLang }) {
		const pathFile = `${__dirname}/tmp/restart.txt`;
		fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);
		await message.reply(getLang("restartting"));
		process.exit(2);
	}
};