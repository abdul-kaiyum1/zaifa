const fs = require('fs');

function formatText(text) {
    return text.normalize("NFD").toLowerCase();
}

async function onStart({ message, commandName }) {
    try {
        if (!fs.existsSync('pocket.json')) {
            return message.reply("Doraemon's pocket is empty.");
        }
        const pocketData = JSON.parse(fs.readFileSync('pocket.json'));
        let pocketMessage = "╭── Pocket\n";
        pocketData.forEach(entry => {
            pocketMessage += `│ - ${entry.uid}:\n`;
            for (const [gadgetName, count] of Object.entries(entry.gadgets)) {
                pocketMessage += `│   - ${gadgetName}: ${count}\n`;
            }
        });
        pocketMessage += "╰────────♢";
        message.reply(pocketMessage);
    } catch (error) {
        console.error('Error retrieving Doraemon pocket data:', error);
        message.reply("An error occurred while retrieving Doraemon's pocket data.");
    }
}

const config = {
    name: "dorapok",
    aliases: ["dorapocket"],
    version: "1.0",
    author: "sheikh",
    shortDescription: {
        vi: "",
        en: "Show Doraemon's pocket content"
    },
    longDescription: {
        vi: "",
        en: "Display the content of Doraemon's pocket including gadgets."
    },
    category: "games",
    guide: {
        en: "{pn}"
    }
};

module.exports = {
    config,
    onStart
};