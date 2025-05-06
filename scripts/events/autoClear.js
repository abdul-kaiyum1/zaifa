const fs = require('fs');
const path = require('path');

module.exports = {
        config: {
                name: "autoClear",
                version: "1.0",
                author: "sheikh",
                description: "Automatically clears cache folder and deletes all items after 8 hours",
                category: "events"
        },

        onStart: async ({ api }) => {
                const cacheFolder = path.join(__dirname, '../cmds/cache');

                setTimeout(() => {
                        fs.readdir(cacheFolder, (err, files) => {
                                if (err) {
                                        console.error("Error reading cache folder:", err);
                                        return;
                                }

                                files.forEach(file => {
                                        const filePath = path.join(cacheFolder, file);
                                        fs.unlink(filePath, (err) => {
                                                if (err) {
                                                        console.error(`Error deleting file ${file} from cache folder:`, err);
                                                } else {
                                                        console.log(`Deleted file ${file} from cache folder.`);
                                                }
                                        });
                                });

                                console.log("Cache folder cleared successfully.");
                        });
                }, 8 * 60 * 60 * 1000); 
    // message.reply use koirona problem hoibo eta auto
        }
};