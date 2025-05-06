const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "optimize",
        version: "1.1",
        author: "NZ R",
        countDown: 5,
        role: 2,
        description: {
            vi: "",
            en: ""
        },
        category: "Owner",
        guide: {
            vi: "",
            en: ""
        }
    },

    langs: {
        vi: {
            cleaning: "",
            cleaned: "",
            noJunk: ""
        },
        en: {
            cleaning: "🧹 | Cleaning up junk files...",
            cleaned: "✅ | Junk files cleaned up!\nDeleted files:\n",
            noJunk: "✅ | No junk files to delete.",
            sizeCleaned: "Total size cleaned: (%1) MB"
        }
    },

    onStart: async function ({ message, getLang, api, event }) {
        const junkDirs = [
            `${__dirname}/tmp/`,
            `${__dirname}/logs/`,
            `${__dirname}/cache/`
        ];

        const initialMessage = await message.reply(getLang("cleaning"));

        let deletedFiles = [];
        let totalSize = 0;

        for (const dir of junkDirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stats = fs.lstatSync(filePath);
                    if (stats.isFile() || stats.isDirectory()) {
                        totalSize += stats.size;
                        fs.removeSync(filePath);
                        deletedFiles.push(filePath);
                    }
                }
            }
        }

        if (deletedFiles.length > 0) {
            const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            api.editMessage(getLang("cleaned") + deletedFiles.join("\n") + "\n" + getLang("sizeCleaned", totalSizeMB), initialMessage.messageID);
        } else {
            api.editMessage(getLang("noJunk"), initialMessage.messageID);
        }
    }
};